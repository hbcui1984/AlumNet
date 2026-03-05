const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

function checkLogin(uid) {
  if (!uid) {
    throw { errCode: 'TOKEN_INVALID', errMsg: '请先登录' }
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
   * 创建组织
   */
  async createOrganization(data) {
    try {
      checkLogin(this.uid)
      
      // 检查是否已认证
      const userRes = await db.collection('uni-id-users')
        .doc(this.uid)
        .field({ alumniStatus: true })
        .get()
      
      if (!userRes.data || userRes.data.length === 0) {
        throw { errCode: 'USER_NOT_FOUND', errMsg: '用户不存在' }
      }
      
      if (userRes.data[0].alumniStatus !== 1) {
        throw { errCode: 'NOT_VERIFIED', errMsg: '仅认证校友可创建组织' }
      }
      
      // 验证必填字段
      if (!data.name || !data.type) {
        throw { errCode: 'INVALID_PARAM', errMsg: '组织名称和类型不能为空' }
      }
      
      const now = Date.now()
      
      // 创建组织
      const orgRes = await db.collection('alumni-organizations').add({
        name: data.name,
        type: data.type,
        logo: data.logo || '',
        description: data.description || '',
        creatorId: this.uid,
        adminIds: [this.uid],
        memberCount: 1,
        joinType: data.joinType || 'open',
        status: data.status || 0,
        auditStatus: 0,
        createTime: now,
        updateTime: now
      })
      
      // 创建创建者成员记录
      await db.collection('alumni-organization-members').add({
        organizationId: orgRes.id,
        userId: this.uid,
        role: 'creator',
        status: 1,
        joinTime: now
      })
      
      return {
        errCode: 0,
        errMsg: data.status === 1 ? '组织已提交，等待管理员审核' : '保存成功',
        data: { organizationId: orgRes.id }
      }
    } catch (e) {
      console.error('创建组织失败', e)
      return {
        errCode: e.errCode || 'CREATE_FAILED',
        errMsg: e.errMsg || '创建组织失败'
      }
    }
  },

  /**
   * 获取组织列表
   */
  async getOrganizationList({ pageNum = 1, pageSize = 10 } = {}) {
    try {
      const query = {
        status: 1,
        auditStatus: 1
      }
      
      const countRes = await db.collection('alumni-organizations').where(query).count()
      const listRes = await db.collection('alumni-organizations')
        .where(query)
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
    } catch (e) {
      console.error('获取组织列表失败', e)
      return {
        errCode: e.errCode || 'GET_LIST_FAILED',
        errMsg: e.errMsg || '获取组织列表失败'
      }
    }
  },

  /**
   * 获取组织详情
   */
  async getOrganizationDetail(organizationId) {
    try {
      if (!organizationId) {
        throw { errCode: 'INVALID_PARAM', errMsg: '组织ID不能为空' }
      }
      
      const orgRes = await db.collection('alumni-organizations').doc(organizationId).get()
      
      if (!orgRes.data || orgRes.data.length === 0) {
        throw { errCode: 'NOT_FOUND', errMsg: '组织不存在' }
      }
      
      const org = orgRes.data[0]
      
      // 如果已登录，查询是否已加入
      let memberInfo = null
      if (this.uid) {
        const memberRes = await db.collection('alumni-organization-members')
          .where({
            organizationId,
            userId: this.uid
          })
          .get()
        
        if (memberRes.data && memberRes.data.length > 0) {
          memberInfo = memberRes.data[0]
        }
      }
      
      return {
        errCode: 0,
        errMsg: '获取成功',
        data: {
          ...org,
          memberInfo
        }
      }
    } catch (e) {
      console.error('获取组织详情失败', e)
      return {
        errCode: e.errCode || 'GET_DETAIL_FAILED',
        errMsg: e.errMsg || '获取组织详情失败'
      }
    }
  },

  /**
   * 加入组织
   */
  async joinOrganization(organizationId) {
    try {
      checkLogin(this.uid)
      
      if (!organizationId) {
        throw { errCode: 'INVALID_PARAM', errMsg: '组织ID不能为空' }
      }
      
      // 检查组织是否存在
      const orgRes = await db.collection('alumni-organizations').doc(organizationId).get()
      if (!orgRes.data || orgRes.data.length === 0) {
        throw { errCode: 'NOT_FOUND', errMsg: '组织不存在' }
      }
      
      const org = orgRes.data[0]
      
      if (org.status !== 1) {
        throw { errCode: 'ORG_UNAVAILABLE', errMsg: '组织不可用' }
      }
      
      // 检查是否已加入
      const existRes = await db.collection('alumni-organization-members')
        .where({
          organizationId,
          userId: this.uid,
          status: dbCmd.in([0, 1])
        })
        .count()
      
      if (existRes.total > 0) {
        throw { errCode: 'ALREADY_JOINED', errMsg: '您已加入该组织' }
      }
      
      const now = Date.now()
      const status = org.joinType === 'open' ? 1 : 0
      
      // 创建成员记录
      await db.collection('alumni-organization-members').add({
        organizationId,
        userId: this.uid,
        role: 'member',
        status,
        joinTime: now
      })
      
      // 如果是开放加入，更新成员数量
      if (status === 1) {
        await db.collection('alumni-organizations').doc(organizationId).update({
          memberCount: dbCmd.inc(1)
        })
      }
      
      return {
        errCode: 0,
        errMsg: status === 1 ? '加入成功' : '申请已提交，等待审核'
      }
    } catch (e) {
      console.error('加入组织失败', e)
      return {
        errCode: e.errCode || 'JOIN_FAILED',
        errMsg: e.errMsg || '加入组织失败'
      }
    }
  },

  /**
   * 退出组织
   */
  async leaveOrganization(organizationId) {
    try {
      checkLogin(this.uid)
      
      if (!organizationId) {
        throw { errCode: 'INVALID_PARAM', errMsg: '组织ID不能为空' }
      }
      
      // 查找成员记录
      const memberRes = await db.collection('alumni-organization-members')
        .where({
          organizationId,
          userId: this.uid,
          status: 1
        })
        .get()
      
      if (!memberRes.data || memberRes.data.length === 0) {
        throw { errCode: 'NOT_MEMBER', errMsg: '您不是该组织成员' }
      }
      
      const member = memberRes.data[0]
      
      if (member.role === 'creator') {
        throw { errCode: 'CREATOR_CANNOT_LEAVE', errMsg: '创建者不能退出组织' }
      }
      
      // 更新成员状态
      await db.collection('alumni-organization-members').doc(member._id).update({
        status: -1,
        leaveTime: Date.now()
      })
      
      // 更新成员数量
      await db.collection('alumni-organizations').doc(organizationId).update({
        memberCount: dbCmd.inc(-1)
      })
      
      return {
        errCode: 0,
        errMsg: '退出成功'
      }
    } catch (e) {
      console.error('退出组织失败', e)
      return {
        errCode: e.errCode || 'LEAVE_FAILED',
        errMsg: e.errMsg || '退出组织失败'
      }
    }
  },

  /**
   * 获取我的组织
   */
  async getMyOrganizations({ type = 'joined', pageNum = 1, pageSize = 10 } = {}) {
    try {
      checkLogin(this.uid)
      
      if (type === 'created') {
        // 我创建的组织
        const countRes = await db.collection('alumni-organizations')
          .where({ creatorId: this.uid })
          .count()
        
        const listRes = await db.collection('alumni-organizations')
          .where({ creatorId: this.uid })
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
        // 我加入的组织
        const memberRes = await db.collection('alumni-organization-members')
          .where({
            userId: this.uid,
            status: 1
          })
          .orderBy('joinTime', 'desc')
          .skip((pageNum - 1) * pageSize)
          .limit(pageSize)
          .get()
        
        if (!memberRes.data || memberRes.data.length === 0) {
          return {
            errCode: 0,
            errMsg: '获取成功',
            data: { list: [], total: 0, hasMore: false }
          }
        }
        
        const orgIds = memberRes.data.map(m => m.organizationId)
        
        const orgsRes = await db.collection('alumni-organizations')
          .where({
            _id: dbCmd.in(orgIds)
          })
          .get()
        
        const list = orgsRes.data.map(org => {
          const member = memberRes.data.find(m => m.organizationId === org._id)
          return {
            ...org,
            memberRole: member?.role,
            joinTime: member?.joinTime
          }
        })
        
        const countRes = await db.collection('alumni-organization-members')
          .where({
            userId: this.uid,
            status: 1
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
      }
    } catch (e) {
      console.error('获取我的组织失败', e)
      return {
        errCode: e.errCode || 'GET_MY_ORGS_FAILED',
        errMsg: e.errMsg || '获取我的组织失败'
      }
    }
  },

  /**
   * 解散组织
   */
  async dissolveOrganization(organizationId) {
    try {
      checkLogin(this.uid)
      
      if (!organizationId) {
        throw { errCode: 'INVALID_PARAM', errMsg: '组织ID不能为空' }
      }
      
      const orgRes = await db.collection('alumni-organizations').doc(organizationId).get()
      
      if (!orgRes.data || orgRes.data.length === 0) {
        throw { errCode: 'NOT_FOUND', errMsg: '组织不存在' }
      }
      
      const org = orgRes.data[0]
      
      if (org.creatorId !== this.uid) {
        throw { errCode: 'NO_PERMISSION', errMsg: '只有创建者可以解散组织' }
      }
      
      if (org.status === 2) {
        throw { errCode: 'ALREADY_DISSOLVED', errMsg: '组织已解散' }
      }
      
      await db.collection('alumni-organizations').doc(organizationId).update({
        status: 2,
        updateTime: Date.now()
      })
      
      return {
        errCode: 0,
        errMsg: '组织已解散'
      }
    } catch (e) {
      console.error('解散组织失败', e)
      return {
        errCode: e.errCode || 'DISSOLVE_FAILED',
        errMsg: e.errMsg || '解散组织失败'
      }
    }
  }
}
