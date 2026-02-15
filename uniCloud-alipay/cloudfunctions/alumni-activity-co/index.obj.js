/**
 * 校友活动云对象
 * @description 处理活动发布、报名、签到等业务逻辑
 */
const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

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
 * 验证活动数据
 * @param {Object} activityData - 活动数据
 */
function validateActivityData(activityData) {
  if (!activityData.title || activityData.title.trim().length === 0) {
    throw { errCode: 'INVALID_PARAM', errMsg: '活动标题不能为空' }
  }
  if (activityData.title.length > 100) {
    throw { errCode: 'INVALID_PARAM', errMsg: '活动标题不能超过100字' }
  }
  if (!activityData.startTime) {
    throw { errCode: 'INVALID_PARAM', errMsg: '请选择活动开始时间' }
  }
  if (activityData.startTime < Date.now()) {
    throw { errCode: 'INVALID_PARAM', errMsg: '活动开始时间不能早于当前时间' }
  }
  if (activityData.endTime && activityData.endTime <= activityData.startTime) {
    throw { errCode: 'INVALID_PARAM', errMsg: '活动结束时间必须晚于开始时间' }
  }
  if (!['online', 'offline', 'hybrid'].includes(activityData.type)) {
    throw { errCode: 'INVALID_PARAM', errMsg: '活动类型无效' }
  }
  if ((activityData.type === 'offline' || activityData.type === 'hybrid') && !activityData.location?.name) {
    throw { errCode: 'INVALID_PARAM', errMsg: '线下活动必须填写地点' }
  }
}

module.exports = {
  _before: async function() {
    const clientInfo = this.getClientInfo()
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo })
    
    const token = this.getUniIdToken()
    if (token) {
      const payload = await this.uniIdCommon.checkToken(token)
      if (payload.errCode === 0) {
        this.uid = payload.uid
      }
    }
  },

  /**
   * 获取活动列表
   * @param {Object} params
   * @param {number} params.status - 活动状态筛选（可选）
   * @param {string} params.keyword - 搜索关键词（可选）
   * @param {number} params.pageNum - 页码，默认1
   * @param {number} params.pageSize - 每页数量，默认10
   * @returns {Promise<{errCode: number, errMsg: string, data: {list: Array, total: number, hasMore: boolean}}>}
   */
  async getActivityList({ status, keyword, pageNum = 1, pageSize = 10 } = {}) {
    try {
      const collection = db.collection('alumni-activities')
      let query = {}
      
      // 状态筛选
      if (status !== undefined && status !== null) {
        query.status = status
      } else {
        // 默认只显示报名中、进行中、已结束的活动
        query.status = dbCmd.in([1, 2, 3, 4])
      }
      
      // 关键词搜索
      if (keyword && keyword.trim()) {
        query.title = new RegExp(keyword.trim(), 'i')
      }
      
      // 查询总数
      const countRes = await collection.where(query).count()
      const total = countRes.total
      
      // 查询列表
      const listRes = await collection
        .where(query)
        .field({
          title: true,
          cover: true,
          description: true,
          type: true,
          location: true,
          startTime: true,
          endTime: true,
          maxParticipants: true,
          currentParticipants: true,
          fee: true,
          status: true,
          tags: true,
          viewCount: true,
          createTime: true
        })
        .orderBy('startTime', 'asc')
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .get()
      
      return {
        errCode: 0,
        errMsg: '获取成功',
        data: {
          list: listRes.data,
          total,
          hasMore: pageNum * pageSize < total
        }
      }
    } catch (e) {
      console.error('获取活动列表失败', e)
      return {
        errCode: e.errCode || 'GET_ACTIVITY_LIST_FAILED',
        errMsg: e.errMsg || '获取活动列表失败'
      }
    }
  },

  /**
   * 获取活动详情
   * @param {string} activityId - 活动ID
   * @returns {Promise<{errCode: number, errMsg: string, data: Object}>}
   */
  async getActivityDetail(activityId) {
    try {
      if (!activityId) {
        throw { errCode: 'INVALID_PARAM', errMsg: '活动ID不能为空' }
      }
      
      const activityRes = await db.collection('alumni-activities')
        .doc(activityId)
        .get()
      
      if (!activityRes.data || activityRes.data.length === 0) {
        throw { errCode: 'ACTIVITY_NOT_FOUND', errMsg: '活动不存在' }
      }
      
      const activity = activityRes.data[0]
      
      // 增加浏览次数
      await db.collection('alumni-activities')
        .doc(activityId)
        .update({
          viewCount: dbCmd.inc(1)
        })
      
      // 如果已登录，查询是否已报名
      let isSignedUp = false
      if (this.uid) {
        const signupRes = await db.collection('alumni-activity-signups')
          .where({
            activityId,
            userId: this.uid,
            status: dbCmd.neq(-1) // 未取消
          })
          .count()
        isSignedUp = signupRes.total > 0
      }
      
      return {
        errCode: 0,
        errMsg: '获取成功',
        data: {
          ...activity,
          isSignedUp
        }
      }
    } catch (e) {
      console.error('获取活动详情失败', e)
      return {
        errCode: e.errCode || 'GET_ACTIVITY_DETAIL_FAILED',
        errMsg: e.errMsg || '获取活动详情失败'
      }
    }
  },

  /**
   * 发布活动
   * @param {Object} activityData - 活动数据
   * @returns {Promise<{errCode: number, errMsg: string, data: {activityId: string}}>}
   */
  async publishActivity(activityData) {
    try {
      checkLogin(this.uid)
      
      // 验证数据
      validateActivityData(activityData)
      
      // 检查用户是否已认证
      const userRes = await db.collection('uni-id-users')
        .doc(this.uid)
        .field({ verifyStatus: true })
        .get()
      
      if (!userRes.data || userRes.data.length === 0) {
        throw { errCode: 'USER_NOT_FOUND', errMsg: '用户不存在' }
      }
      
      if (userRes.data[0].verifyStatus !== 1) {
        throw { errCode: 'NOT_VERIFIED', errMsg: '仅认证校友可发布活动' }
      }
      
      // 创建活动
      const now = Date.now()
      const activity = {
        title: activityData.title.trim(),
        cover: activityData.cover || '',
        description: activityData.description || '',
        content: activityData.content || '',
        organizerId: this.uid,
        organizerType: 'user',
        type: activityData.type,
        location: activityData.location || null,
        onlineLink: activityData.onlineLink || '',
        startTime: activityData.startTime,
        endTime: activityData.endTime || null,
        signupDeadline: activityData.signupDeadline || activityData.startTime,
        maxParticipants: activityData.maxParticipants || 0,
        currentParticipants: 0,
        fee: activityData.fee || 0,
        targetAudience: activityData.targetAudience || {},
        status: activityData.status || 1, // 默认报名中
        viewCount: 0,
        tags: activityData.tags || [],
        createTime: now,
        updateTime: now
      }
      
      const res = await db.collection('alumni-activities').add(activity)
      
      return {
        errCode: 0,
        errMsg: '发布成功',
        data: {
          activityId: res.id
        }
      }
    } catch (e) {
      console.error('发布活动失败', e)
      return {
        errCode: e.errCode || 'PUBLISH_ACTIVITY_FAILED',
        errMsg: e.errMsg || '发布活动失败'
      }
    }
  },

  /**
   * 报名活动
   * @param {string} activityId - 活动ID
   * @param {Object} signupData - 报名数据
   * @returns {Promise<{errCode: number, errMsg: string}>}
   */
  async signupActivity(activityId, signupData = {}) {
    try {
      checkLogin(this.uid)
      
      if (!activityId) {
        throw { errCode: 'INVALID_PARAM', errMsg: '活动ID不能为空' }
      }
      
      // 获取活动信息
      const activityRes = await db.collection('alumni-activities')
        .doc(activityId)
        .get()
      
      if (!activityRes.data || activityRes.data.length === 0) {
        throw { errCode: 'ACTIVITY_NOT_FOUND', errMsg: '活动不存在' }
      }
      
      const activity = activityRes.data[0]
      
      // 检查活动状态
      if (activity.status !== 1) {
        throw { errCode: 'ACTIVITY_NOT_OPEN', errMsg: '活动未开放报名' }
      }
      
      // 检查报名截止时间
      if (activity.signupDeadline && Date.now() > activity.signupDeadline) {
        throw { errCode: 'SIGNUP_EXPIRED', errMsg: '报名已截止' }
      }
      
      // 检查是否已报名
      const existRes = await db.collection('alumni-activity-signups')
        .where({
          activityId,
          userId: this.uid,
          status: dbCmd.neq(-1)
        })
        .count()
      
      if (existRes.total > 0) {
        throw { errCode: 'ALREADY_SIGNED_UP', errMsg: '您已报名该活动' }
      }
      
      // 检查人数限制
      if (activity.maxParticipants > 0 && activity.currentParticipants >= activity.maxParticipants) {
        throw { errCode: 'ACTIVITY_FULL', errMsg: '活动人数已满' }
      }
      
      // 创建报名记录
      const now = Date.now()
      const signup = {
        activityId,
        userId: this.uid,
        contactName: signupData.contactName || '',
        contactPhone: signupData.contactPhone || '',
        remark: signupData.remark || '',
        status: 0, // 0-已报名 1-已签到 -1-已取消
        signupTime: now,
        createTime: now
      }
      
      await db.collection('alumni-activity-signups').add(signup)
      
      // 更新活动报名人数
      await db.collection('alumni-activities')
        .doc(activityId)
        .update({
          currentParticipants: dbCmd.inc(1)
        })
      
      return {
        errCode: 0,
        errMsg: '报名成功'
      }
    } catch (e) {
      console.error('报名活动失败', e)
      return {
        errCode: e.errCode || 'SIGNUP_ACTIVITY_FAILED',
        errMsg: e.errMsg || '报名活动失败'
      }
    }
  },

  /**
   * 取消报名
   * @param {string} activityId - 活动ID
   * @returns {Promise<{errCode: number, errMsg: string}>}
   */
  async cancelSignup(activityId) {
    try {
      checkLogin(this.uid)
      
      if (!activityId) {
        throw { errCode: 'INVALID_PARAM', errMsg: '活动ID不能为空' }
      }
      
      // 查找报名记录
      const signupRes = await db.collection('alumni-activity-signups')
        .where({
          activityId,
          userId: this.uid,
          status: dbCmd.neq(-1)
        })
        .get()
      
      if (!signupRes.data || signupRes.data.length === 0) {
        throw { errCode: 'SIGNUP_NOT_FOUND', errMsg: '未找到报名记录' }
      }
      
      const signup = signupRes.data[0]
      
      // 检查是否已签到
      if (signup.status === 1) {
        throw { errCode: 'ALREADY_CHECKED_IN', errMsg: '已签到，无法取消' }
      }
      
      // 更新报名状态
      await db.collection('alumni-activity-signups')
        .doc(signup._id)
        .update({
          status: -1,
          cancelTime: Date.now()
        })
      
      // 更新活动报名人数
      await db.collection('alumni-activities')
        .doc(activityId)
        .update({
          currentParticipants: dbCmd.inc(-1)
        })
      
      return {
        errCode: 0,
        errMsg: '取消成功'
      }
    } catch (e) {
      console.error('取消报名失败', e)
      return {
        errCode: e.errCode || 'CANCEL_SIGNUP_FAILED',
        errMsg: e.errMsg || '取消报名失败'
      }
    }
  },

  /**
   * 获取我的活动列表
   * @param {string} type - 类型：signed(已报名) published(已发布)
   * @param {number} pageNum - 页码
   * @param {number} pageSize - 每页数量
   * @returns {Promise<{errCode: number, errMsg: string, data: Object}>}
   */
  async getMyActivities({ type = 'signed', pageNum = 1, pageSize = 10 } = {}) {
    try {
      checkLogin(this.uid)
      
      if (type === 'signed') {
        // 查询已报名的活动
        const signupRes = await db.collection('alumni-activity-signups')
          .where({
            userId: this.uid,
            status: dbCmd.neq(-1)
          })
          .field({ activityId: true, status: true, signupTime: true })
          .orderBy('signupTime', 'desc')
          .skip((pageNum - 1) * pageSize)
          .limit(pageSize)
          .get()
        
        if (!signupRes.data || signupRes.data.length === 0) {
          return {
            errCode: 0,
            errMsg: '获取成功',
            data: { list: [], total: 0, hasMore: false }
          }
        }
        
        const activityIds = signupRes.data.map(item => item.activityId)
        
        // 查询活动详情
        const activitiesRes = await db.collection('alumni-activities')
          .where({
            _id: dbCmd.in(activityIds)
          })
          .field({
            title: true,
            cover: true,
            type: true,
            location: true,
            startTime: true,
            endTime: true,
            status: true,
            currentParticipants: true,
            maxParticipants: true
          })
          .get()
        
        // 合并报名状态
        const list = activitiesRes.data.map(activity => {
          const signup = signupRes.data.find(s => s.activityId === activity._id)
          return {
            ...activity,
            signupStatus: signup?.status,
            signupTime: signup?.signupTime
          }
        })
        
        const countRes = await db.collection('alumni-activity-signups')
          .where({
            userId: this.uid,
            status: dbCmd.neq(-1)
          })
          .count()
        
        return {
          errCode: 0,
          errMsg: '获取成功',
          data: {
            list,
            total: countRes.total,
            hasMore: pageNum * pageSize < countRes.total
          }
        }
      } else if (type === 'published') {
        // 查询已发布的活动
        const countRes = await db.collection('alumni-activities')
          .where({ organizerId: this.uid })
          .count()
        
        const listRes = await db.collection('alumni-activities')
          .where({ organizerId: this.uid })
          .orderBy('createTime', 'desc')
          .skip((pageNum - 1) * pageSize)
          .limit(pageSize)
          .get()
        
        return {
          errCode: 0,
          errMsg: '获取成功',
          data: {
            list: listRes.data,
            total: countRes.total,
            hasMore: pageNum * pageSize < countRes.total
          }
        }
      } else {
        throw { errCode: 'INVALID_PARAM', errMsg: '类型参数无效' }
      }
    } catch (e) {
      console.error('获取我的活动失败', e)
      return {
        errCode: e.errCode || 'GET_MY_ACTIVITIES_FAILED',
        errMsg: e.errMsg || '获取我的活动失败'
      }
    }
  },

  /**
   * 获取活动统计数据
   * @returns {Promise<{errCode: number, errMsg: string, data: Object}>}
   */
  async getActivityStatistics() {
    try {
      // 统计活动总数（报名中+进行中）
      const activeCountRes = await db.collection('alumni-activities')
        .where({
          status: dbCmd.in([1, 2, 3])
        })
        .count()
      
      return {
        errCode: 0,
        errMsg: '获取成功',
        data: {
          activityCount: activeCountRes.total
        }
      }
    } catch (e) {
      console.error('获取活动统计失败', e)
      return {
        errCode: e.errCode || 'GET_STATISTICS_FAILED',
        errMsg: e.errMsg || '获取统计失败',
        data: {
          activityCount: 0
        }
      }
    }
  }
}
