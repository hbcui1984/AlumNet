/**
 * 校友好友云对象
 * @description 处理名片交换、好友列表、好友关系等业务逻辑
 */
const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

/**
 * 名片请求过期时间（7天）
 */
const REQUEST_EXPIRE_DAYS = 7

/**
 * 默认每页数量
 */
const DEFAULT_PAGE_SIZE = 20

/**
 * 检查是否已登录（独立函数）
 * @param {string} uid - 用户ID
 */
function checkLogin(uid) {
  if (!uid) {
    throw {
      errCode: 'TOKEN_INVALID',
      errMsg: '请先登录'
    }
  }
}

/**
 * 处理名片交换请求（独立函数）
 * @param {string} currentUid - 当前用户ID
 * @param {Object} params
 * @param {string} params.requestId - 请求ID
 * @param {string} params.action - 操作: accept/reject
 * @param {string} [params.rejectReason] - 拒绝原因
 * @returns {Promise<Object>} 处理结果
 */
async function doHandleCardRequest(currentUid, { requestId, action, rejectReason }) {
  checkLogin(currentUid)

  if (!requestId) {
    throw {
      errCode: 'INVALID_PARAM',
      errMsg: '请指定请求ID'
    }
  }

  if (!['accept', 'reject'].includes(action)) {
    throw {
      errCode: 'INVALID_PARAM',
      errMsg: '操作类型无效'
    }
  }

  const cardCollection = db.collection('alumni-card-requests')
  const requestRes = await cardCollection.doc(requestId).get()

  if (!requestRes.data || requestRes.data.length === 0) {
    throw {
      errCode: 'REQUEST_NOT_FOUND',
      errMsg: '请求不存在'
    }
  }

  const request = requestRes.data[0]

  // 检查权限（只有接收人可以处理）
  if (request.toUserId !== currentUid) {
    throw {
      errCode: 'NO_PERMISSION',
      errMsg: '无权处理此请求'
    }
  }

  // 检查状态
  if (request.status !== 0) {
    throw {
      errCode: 'REQUEST_PROCESSED',
      errMsg: '该请求已处理'
    }
  }

  // 检查是否过期
  if (request.expireTime && request.expireTime < Date.now()) {
    await cardCollection.doc(requestId).update({
      status: 3,
      handleTime: Date.now()
    })
    throw {
      errCode: 'REQUEST_EXPIRED',
      errMsg: '请求已过期'
    }
  }

  const now = Date.now()

  if (action === 'accept') {
    const [userIdA, userIdB] = [request.fromUserId, request.toUserId].sort()

    const transaction = await db.startTransaction()

    try {
      await transaction.collection('alumni-card-requests').doc(requestId).update({
        status: 1,
        handleTime: now
      })

      await transaction.collection('alumni-friends').add({
        userIdA,
        userIdB,
        sourceRequestId: requestId,
        status: 1,
        createTime: now
      })

      await transaction.collection('uni-id-users').doc(request.fromUserId).update({
        friendCount: dbCmd.inc(1)
      })
      await transaction.collection('uni-id-users').doc(request.toUserId).update({
        friendCount: dbCmd.inc(1)
      })

      await transaction.commit()

      return {
        errCode: 0,
        errMsg: '已添加为好友',
        data: {
          friendUserId: request.fromUserId
        }
      }
    } catch (e) {
      await transaction.rollback()
      throw {
        errCode: 'SYSTEM_ERROR',
        errMsg: '操作失败，请重试'
      }
    }
  } else {
    await cardCollection.doc(requestId).update({
      status: 2,
      rejectReason: rejectReason || '',
      handleTime: now
    })

    return {
      errCode: 0,
      errMsg: '已拒绝请求'
    }
  }
}

module.exports = {
  _before: async function() {
    this.clientInfo = this.getClientInfo()

    this.uniIdCommon = uniIdCommon.createInstance({
      clientInfo: this.clientInfo
    })

    const token = this.clientInfo.uniIdToken
    if (token) {
      const payload = await this.uniIdCommon.checkToken(token)
      if (payload.errCode === 0) {
        this.uid = payload.uid
        this.userInfo = payload.userInfo
      }
    }
  },

  /**
   * 发送名片交换请求
   * @param {Object} params
   * @param {string} params.toUserId - 接收人ID
   * @param {string} [params.message] - 请求留言
   * @returns {Promise<Object>} 发送结果
   */
  async sendCardRequest({ toUserId, message }) {
    checkLogin(this.uid)

    if (!toUserId) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请指定接收人'
      }
    }

    if (toUserId === this.uid) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '不能向自己发送名片请求'
      }
    }

    // 检查自己是否已认证
    const userCollection = db.collection('uni-id-users')
    const myInfo = await userCollection.doc(this.uid).field({
      alumniStatus: 1,
      realName: 1
    }).get()

    if (myInfo.data[0]?.alumniStatus !== 1) {
      throw {
        errCode: 'NOT_VERIFIED',
        errMsg: '请先完成校友认证'
      }
    }

    // 检查对方是否存在且已认证
    const targetInfo = await userCollection.doc(toUserId).field({
      alumniStatus: 1,
      realName: 1
    }).get()

    if (!targetInfo.data || targetInfo.data.length === 0) {
      throw {
        errCode: 'USER_NOT_FOUND',
        errMsg: '用户不存在'
      }
    }

    if (targetInfo.data[0]?.alumniStatus !== 1) {
      throw {
        errCode: 'TARGET_NOT_VERIFIED',
        errMsg: '对方尚未通过校友认证'
      }
    }

    // 检查是否已是好友
    const [userIdA, userIdB] = [this.uid, toUserId].sort()
    const friendCollection = db.collection('alumni-friends')
    const friendRes = await friendCollection.where({
      userIdA,
      userIdB,
      status: 1
    }).count()

    if (friendRes.total > 0) {
      throw {
        errCode: 'ALREADY_FRIEND',
        errMsg: '你们已经是好友了'
      }
    }

    // 检查是否有待处理的请求
    const cardCollection = db.collection('alumni-card-requests')

    // 检查我发出的待处理请求
    const sentPending = await cardCollection.where({
      fromUserId: this.uid,
      toUserId: toUserId,
      status: 0
    }).count()

    if (sentPending.total > 0) {
      throw {
        errCode: 'REQUEST_PENDING',
        errMsg: '您已发送过请求，请等待对方处理'
      }
    }

    // 检查对方发给我的待处理请求（如果有，直接同意成为好友）
    const receivedPending = await cardCollection.where({
      fromUserId: toUserId,
      toUserId: this.uid,
      status: 0
    }).get()

    if (receivedPending.data && receivedPending.data.length > 0) {
      // 直接同意对方的请求
      return doHandleCardRequest(this.uid, {
        requestId: receivedPending.data[0]._id,
        action: 'accept'
      })
    }

    // 创建新请求
    const expireTime = Date.now() + REQUEST_EXPIRE_DAYS * 24 * 60 * 60 * 1000
    const requestData = {
      fromUserId: this.uid,
      toUserId: toUserId,
      message: message || '',
      status: 0, // 待处理
      expireTime,
      createTime: Date.now()
    }

    const addRes = await cardCollection.add(requestData)

    // TODO: 发送通知给对方（可以接入uni-push）

    return {
      errCode: 0,
      errMsg: '名片请求已发送',
      data: {
        requestId: addRes.id
      }
    }
  },

  /**
   * 处理名片交换请求
   * @param {Object} params
   * @param {string} params.requestId - 请求ID
   * @param {string} params.action - 操作: accept/reject
   * @param {string} [params.rejectReason] - 拒绝原因
   * @returns {Promise<Object>} 处理结果
   */
  async handleCardRequest({ requestId, action, rejectReason }) {
    return doHandleCardRequest(this.uid, { requestId, action, rejectReason })
  },

  /**
   * 获取收到的名片请求列表
   * @param {Object} params
   * @param {number} [params.status] - 状态筛选: 0待处理 1已同意 2已拒绝 3已过期
   * @param {number} [params.pageSize] - 每页数量
   * @param {string} [params.cursor] - 游标
   * @returns {Promise<Object>} 请求列表
   */
  async getReceivedRequests({ status, pageSize = DEFAULT_PAGE_SIZE, cursor } = {}) {
    checkLogin(this.uid)

    const limit = Math.min(Math.max(1, pageSize), 50)

    const matchConditions = {
      toUserId: this.uid
    }

    if (status !== undefined) {
      matchConditions.status = status
    }

    if (cursor) {
      matchConditions._id = dbCmd.lt(cursor) // 按创建时间倒序
    }

    const cardCollection = db.collection('alumni-card-requests')
    const res = await cardCollection
      .aggregate()
      .match(matchConditions)
      .sort({ createTime: -1 })
      .limit(limit + 1)
      .lookup({
        from: 'uni-id-users',
        localField: 'fromUserId',
        foreignField: '_id',
        as: 'fromUser'
      })
      .unwind('$fromUser')
      .project({
        _id: 1,
        message: 1,
        status: 1,
        createTime: 1,
        expireTime: 1,
        handleTime: 1,
        'fromUser._id': 1,
        'fromUser.avatar': 1,
        'fromUser.realName': 1,
        'fromUser.nickname': 1,
        'fromUser.currentCompany': 1,
        'fromUser.currentPosition': 1,
        'fromUser.educations': 1
      })
      .end()

    const data = res.data || []
    const hasMore = data.length > limit
    const list = hasMore ? data.slice(0, limit) : data
    const nextCursor = list.length > 0 ? list[list.length - 1]._id : null

    // 处理数据，提取主要学历
    const processedList = list.map(item => {
      const fromUser = item.fromUser
      const primaryEdu = fromUser.educations?.find(e => e.isPrimary) || fromUser.educations?.[0]
      return {
        ...item,
        fromUser: {
          _id: fromUser._id,
          avatar: fromUser.avatar,
          realName: fromUser.realName,
          nickname: fromUser.nickname,
          currentCompany: fromUser.currentCompany,
          currentPosition: fromUser.currentPosition,
          primaryEducation: primaryEdu ? {
            enrollmentYear: primaryEdu.enrollmentYear,
            college: primaryEdu.college
          } : null
        }
      }
    })

    return {
      errCode: 0,
      data: {
        list: processedList,
        hasMore,
        cursor: nextCursor
      }
    }
  },

  /**
   * 获取发出的名片请求列表
   * @param {Object} params
   * @param {number} [params.status] - 状态筛选
   * @param {number} [params.pageSize] - 每页数量
   * @param {string} [params.cursor] - 游标
   * @returns {Promise<Object>} 请求列表
   */
  async getSentRequests({ status, pageSize = DEFAULT_PAGE_SIZE, cursor } = {}) {
    checkLogin(this.uid)

    const limit = Math.min(Math.max(1, pageSize), 50)

    const matchConditions = {
      fromUserId: this.uid
    }

    if (status !== undefined) {
      matchConditions.status = status
    }

    if (cursor) {
      matchConditions._id = dbCmd.lt(cursor)
    }

    const cardCollection = db.collection('alumni-card-requests')
    const res = await cardCollection
      .aggregate()
      .match(matchConditions)
      .sort({ createTime: -1 })
      .limit(limit + 1)
      .lookup({
        from: 'uni-id-users',
        localField: 'toUserId',
        foreignField: '_id',
        as: 'toUser'
      })
      .unwind('$toUser')
      .project({
        _id: 1,
        message: 1,
        status: 1,
        createTime: 1,
        expireTime: 1,
        handleTime: 1,
        rejectReason: 1,
        'toUser._id': 1,
        'toUser.avatar': 1,
        'toUser.realName': 1,
        'toUser.nickname': 1,
        'toUser.currentCompany': 1,
        'toUser.currentPosition': 1,
        'toUser.educations': 1
      })
      .end()

    const data = res.data || []
    const hasMore = data.length > limit
    const list = hasMore ? data.slice(0, limit) : data
    const nextCursor = list.length > 0 ? list[list.length - 1]._id : null

    // 处理数据
    const processedList = list.map(item => {
      const toUser = item.toUser
      const primaryEdu = toUser.educations?.find(e => e.isPrimary) || toUser.educations?.[0]
      return {
        ...item,
        toUser: {
          _id: toUser._id,
          avatar: toUser.avatar,
          realName: toUser.realName,
          nickname: toUser.nickname,
          currentCompany: toUser.currentCompany,
          currentPosition: toUser.currentPosition,
          primaryEducation: primaryEdu ? {
            enrollmentYear: primaryEdu.enrollmentYear,
            college: primaryEdu.college
          } : null
        }
      }
    })

    return {
      errCode: 0,
      data: {
        list: processedList,
        hasMore,
        cursor: nextCursor
      }
    }
  },

  /**
   * 获取待处理请求数量
   * @returns {Promise<Object>} 数量统计
   */
  async getPendingRequestCount() {
    checkLogin(this.uid)

    const cardCollection = db.collection('alumni-card-requests')
    const res = await cardCollection.where({
      toUserId: this.uid,
      status: 0,
      expireTime: dbCmd.gt(Date.now())
    }).count()

    return {
      errCode: 0,
      data: {
        count: res.total
      }
    }
  },

  /**
   * 获取好友列表
   * @param {Object} params
   * @param {string} [params.keyword] - 搜索关键词
   * @param {number} [params.pageSize] - 每页数量
   * @param {string} [params.cursor] - 游标
   * @returns {Promise<Object>} 好友列表
   */
  async getFriendList({ keyword, pageSize = DEFAULT_PAGE_SIZE, cursor } = {}) {
    checkLogin(this.uid)

    const limit = Math.min(Math.max(1, pageSize), 50)

    // 查询好友关系
    const friendCollection = db.collection('alumni-friends')

    // 构建查询条件
    const matchConditions = {
      $or: [
        { userIdA: this.uid },
        { userIdB: this.uid }
      ],
      status: 1
    }

    if (cursor) {
      matchConditions._id = dbCmd.gt(cursor)
    }

    const friendRes = await friendCollection
      .where(matchConditions)
      .orderBy('_id', 'asc')
      .limit(limit + 1)
      .get()

    const friendData = friendRes.data || []
    const hasMore = friendData.length > limit
    const friendList = hasMore ? friendData.slice(0, limit) : friendData

    if (friendList.length === 0) {
      return {
        errCode: 0,
        data: {
          list: [],
          hasMore: false,
          cursor: null
        }
      }
    }

    // 获取好友用户ID列表
    const friendUserIds = friendList.map(f =>
      f.userIdA === this.uid ? f.userIdB : f.userIdA
    )

    // 查询好友详细信息
    const userCollection = db.collection('uni-id-users')
    let userQuery = userCollection.where({
      _id: dbCmd.in(friendUserIds)
    })

    // 关键词搜索
    if (keyword) {
      const keywordRegex = new RegExp(keyword, 'i')
      userQuery = userCollection.where({
        _id: dbCmd.in(friendUserIds),
        $or: [
          { realName: keywordRegex },
          { nickname: keywordRegex },
          { currentCompany: keywordRegex }
        ]
      })
    }

    const userRes = await userQuery.field({
      _id: 1,
      avatar: 1,
      realName: 1,
      nickname: 1,
      gender: 1,
      currentCompany: 1,
      currentPosition: 1,
      industry: 1,
      city: 1,
      educations: 1
    }).get()

    // 构建用户映射
    const userMap = {}
    for (const user of (userRes.data || [])) {
      userMap[user._id] = user
    }

    // 组合数据
    const list = friendList
      .map(friend => {
        const friendUserId = friend.userIdA === this.uid ? friend.userIdB : friend.userIdA
        const user = userMap[friendUserId]

        if (!user) return null

        // 获取备注名
        const remark = friend.userIdA === this.uid ? friend.remarkA : friend.remarkB

        // 获取主要学历
        const primaryEdu = user.educations?.find(e => e.isPrimary) || user.educations?.[0]

        return {
          friendId: friend._id,
          userId: friendUserId,
          remark,
          createTime: friend.createTime,
          user: {
            _id: user._id,
            avatar: user.avatar,
            realName: user.realName,
            nickname: user.nickname,
            gender: user.gender,
            currentCompany: user.currentCompany,
            currentPosition: user.currentPosition,
            industry: user.industry,
            city: user.city,
            primaryEducation: primaryEdu ? {
              enrollmentYear: primaryEdu.enrollmentYear,
              college: primaryEdu.college
            } : null
          }
        }
      })
      .filter(item => item !== null)

    const nextCursor = friendList.length > 0 ? friendList[friendList.length - 1]._id : null

    return {
      errCode: 0,
      data: {
        list,
        hasMore,
        cursor: nextCursor
      }
    }
  },

  /**
   * 设置好友备注
   * @param {Object} params
   * @param {string} params.friendUserId - 好友用户ID
   * @param {string} params.remark - 备注名
   * @returns {Promise<Object>} 设置结果
   */
  async setFriendRemark({ friendUserId, remark }) {
    checkLogin(this.uid)

    if (!friendUserId) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请指定好友'
      }
    }

    if (remark && remark.length > 50) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '备注名最多50个字符'
      }
    }

    const [userIdA, userIdB] = [this.uid, friendUserId].sort()
    const isUserA = this.uid === userIdA

    const friendCollection = db.collection('alumni-friends')
    const friendRes = await friendCollection.where({
      userIdA,
      userIdB,
      status: 1
    }).get()

    if (!friendRes.data || friendRes.data.length === 0) {
      throw {
        errCode: 'NOT_FRIEND',
        errMsg: '对方不是您的好友'
      }
    }

    const updateData = {}
    if (isUserA) {
      updateData.remarkA = remark || ''
    } else {
      updateData.remarkB = remark || ''
    }
    updateData.updateTime = Date.now()

    await friendCollection.doc(friendRes.data[0]._id).update(updateData)

    return {
      errCode: 0,
      errMsg: '设置成功'
    }
  },

  /**
   * 删除好友
   * @param {Object} params
   * @param {string} params.friendUserId - 好友用户ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteFriend({ friendUserId }) {
    checkLogin(this.uid)

    if (!friendUserId) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请指定好友'
      }
    }

    const [userIdA, userIdB] = [this.uid, friendUserId].sort()
    const isUserA = this.uid === userIdA

    const friendCollection = db.collection('alumni-friends')
    const friendRes = await friendCollection.where({
      userIdA,
      userIdB,
      status: 1
    }).get()

    if (!friendRes.data || friendRes.data.length === 0) {
      throw {
        errCode: 'NOT_FRIEND',
        errMsg: '对方不是您的好友'
      }
    }

    const friend = friendRes.data[0]

    // 更新好友状态
    // status: 2已解除(A删B) 3已解除(B删A) 4双向解除
    let newStatus
    if (friend.status === 1) {
      newStatus = isUserA ? 2 : 3
    } else if ((friend.status === 2 && !isUserA) || (friend.status === 3 && isUserA)) {
      newStatus = 4 // 双向解除
    } else {
      throw {
        errCode: 'ALREADY_DELETED',
        errMsg: '您已删除该好友'
      }
    }

    const transaction = await db.startTransaction()

    try {
      await transaction.collection('alumni-friends').doc(friend._id).update({
        status: newStatus,
        updateTime: Date.now()
      })

      // 减少好友数
      await transaction.collection('uni-id-users').doc(this.uid).update({
        friendCount: dbCmd.inc(-1)
      })

      // 如果是单向删除，不减少对方好友数（对方还能看到）
      // 如果是双向删除，也减少对方好友数
      if (newStatus === 4) {
        await transaction.collection('uni-id-users').doc(friendUserId).update({
          friendCount: dbCmd.inc(-1)
        })
      }

      await transaction.commit()

      return {
        errCode: 0,
        errMsg: '已删除好友'
      }
    } catch (e) {
      await transaction.rollback()
      throw {
        errCode: 'SYSTEM_ERROR',
        errMsg: '操作失败，请重试'
      }
    }
  },

  /**
   * 撤回名片请求（仅限待处理状态）
   * @param {Object} params
   * @param {string} params.requestId - 请求ID
   * @returns {Promise<Object>} 撤回结果
   */
  async cancelCardRequest({ requestId }) {
    checkLogin(this.uid)

    if (!requestId) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请指定请求ID'
      }
    }

    const cardCollection = db.collection('alumni-card-requests')
    const requestRes = await cardCollection.doc(requestId).get()

    if (!requestRes.data || requestRes.data.length === 0) {
      throw {
        errCode: 'REQUEST_NOT_FOUND',
        errMsg: '请求不存在'
      }
    }

    const request = requestRes.data[0]

    if (request.fromUserId !== this.uid) {
      throw {
        errCode: 'NO_PERMISSION',
        errMsg: '无权撤回此请求'
      }
    }

    if (request.status !== 0) {
      throw {
        errCode: 'REQUEST_PROCESSED',
        errMsg: '该请求已处理，无法撤回'
      }
    }

    // 直接删除请求
    await cardCollection.doc(requestId).remove()

    return {
      errCode: 0,
      errMsg: '已撤回请求'
    }
  }
}
