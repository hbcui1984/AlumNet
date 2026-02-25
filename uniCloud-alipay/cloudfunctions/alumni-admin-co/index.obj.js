/**
 * alumni-admin-co - 校友会管理端云对象
 * @description 提供管理端所需的各种管理功能
 *
 * 数据模型说明：
 * - 校友认证数据直接存储在 uni-id-users 表中（alumniStatus, educations, realName 等字段）
 * - 不使用独立的 alumni-verification 或 alumni-users 集合
 * - 与 AlumNet 主项目的 alumni-co 数据模型保持一致
 */

const db = uniCloud.database()
const dbCmd = db.command

/**
 * 生成校友卡号
 * @param {string} enrollmentYear - 入学年份
 * @param {number} sequence - 序号
 * @returns {string} 校友卡号，格式：年份+8位序号
 */
function generateAlumniCardNo(enrollmentYear, sequence) {
  const paddedSequence = String(sequence).padStart(8, '0')
  return `${enrollmentYear}${paddedSequence}`
}

module.exports = {
  _before: async function() {
    // 获取客户端信息
    this.clientInfo = this.getClientInfo()

    // 获取云端信息
    const cloudInfo = this.getCloudInfo()
    this.spaceId = cloudInfo.spaceId

    // 验证管理员身份
    const uniIdCommon = require('uni-id-common')
    const uniID = uniIdCommon.createInstance({
      clientInfo: this.clientInfo
    })

    const payload = await uniID.checkToken(this.clientInfo.uniIdToken)
    if (payload.errCode) {
      throw new Error('未登录或登录已过期')
    }

    this.uid = payload.uid
    this.userInfo = payload.userInfo

    // 检查是否有管理员权限
    const userDoc = await db.collection('uni-id-users').doc(this.uid).get()
    if (!userDoc.data || userDoc.data.length === 0) {
      throw new Error('用户不存在')
    }

    const user = userDoc.data[0]
    const adminRoles = ['admin', 'super_admin', 'alumni_admin']
    const hasAdminRole = user.role && user.role.some(r => adminRoles.includes(r))

    if (!hasAdminRole) {
      throw new Error('无管理员权限')
    }

    this.adminUser = user
  },

  // ==================== 学校配置管理 ====================

  /**
   * 获取学校配置
   * @returns {Object} 学校配置信息
   */
  async getSchoolConfig() {
    const res = await db.collection('alumni-school-config').limit(1).get()

    if (res.data && res.data.length > 0) {
      return {
        errCode: 0,
        data: res.data[0]
      }
    }

    // 返回默认配置
    return {
      errCode: 0,
      data: {
        appName: '校友会',
        logo: '',
        branding: {
          primaryColor: '#2B5CE6',
          primaryLight: '#5B7FEF',
          slogan: '欢迎回家'
        },
        features: {
          enableVerification: true,
          enableFriendship: true,
          enableChat: true,
          enableActivity: true,
          enableRecommendVerify: false,
          recommendCount: 3
        }
      }
    }
  },

  /**
   * 保存学校配置
   * @param {Object} config - 配置信息
   * @returns {Object} 操作结果
   */
  async saveSchoolConfig(config) {
    if (!config) {
      return { errCode: 1, errMsg: '配置信息不能为空' }
    }

    const now = Date.now()
    const existingConfig = await db.collection('alumni-school-config').limit(1).get()

    const configData = {
      name: config.name || config.appName || '校友会',
      appName: config.appName || config.name || '校友会',
      type: config.type || 'university',
      localDegrees: config.localDegrees || [],
      colleges: config.colleges || [],
      logo: config.logo || '',
      branding: {
        primaryColor: config.branding?.primaryColor || '#2B5CE6',
        primaryLight: config.branding?.primaryLight || '#5B7FEF',
        slogan: config.branding?.slogan || '欢迎回家'
      },
      features: {
        enableVerification: config.features?.enableVerification !== false,
        enableFriendship: config.features?.enableFriendship !== false,
        enableChat: config.features?.enableChat !== false,
        enableActivity: config.features?.enableActivity !== false,
        enableRecommendVerify: config.features?.enableRecommendVerify === true,
        recommendCount: parseInt(config.features?.recommendCount) || 3,
        requireProof: config.features?.requireProof === true
      },
      contact: {
        email: config.contact?.email || '',
        phone: config.contact?.phone || '',
        address: config.contact?.address || ''
      },
      updateTime: now,
      update_by: this.uid
    }

    if (existingConfig.data && existingConfig.data.length > 0) {
      await db.collection('alumni-school-config').doc(existingConfig.data[0]._id).update(configData)
    } else {
      configData.createTime = now
      configData.create_by = this.uid
      await db.collection('alumni-school-config').add(configData)
    }

    return { errCode: 0, errMsg: '保存成功' }
  },

  // ==================== 校友认证审核 ====================
  // 认证数据存储在 uni-id-users 表中：
  // - alumniStatus: 0=待审核, 1=已通过, 2=已拒绝
  // - submitTime: 提交认证的时间
  // - realName, educations, workInfo, city 等为认证提交的信息

  /**
   * 获取认证申请列表（从 uni-id-users 查询提交过认证的用户）
   * @param {Object} params - 查询参数
   * @returns {Object} 认证申请列表
   */
  async getVerificationList(params = {}) {
    const { status, keyword, page = 1, pageSize = 20 } = params

    // 构建查询条件：只查有 submitTime 的用户（提交过认证的）
    let whereCondition = {
      submitTime: dbCmd.exists(true)
    }

    // 状态筛选
    if (status !== undefined && status !== null && status !== '') {
      whereCondition.alumniStatus = parseInt(status)
    }

    // 关键词搜索
    if (keyword) {
      whereCondition = dbCmd.and([
        whereCondition,
        dbCmd.or([
          { realName: new RegExp(keyword, 'i') },
          { mobile: new RegExp(keyword, 'i') },
          { nickname: new RegExp(keyword, 'i') }
        ])
      ])
    }

    let query = db.collection('uni-id-users').where(whereCondition)

    // 获取总数
    const countRes = await query.count()
    const total = countRes.total

    // 分页查询
    const listRes = await query
      .field({
        _id: true,
        nickname: true,
        mobile: true,
        avatar: true,
        realName: true,
        gender: true,
        alumniStatus: true,
        educations: true,
        submitTime: true,
        alumniVerifyTime: true
      })
      .orderBy('submitTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 适配前端期望的数据结构
    const list = listRes.data.map(user => {
      const primaryEdu = user.educations?.find(e => e.isPrimary) || user.educations?.[0]
      return {
        _id: user._id,
        user_id: user._id,
        realName: user.realName,
        gender: user.gender,
        status: user.alumniStatus ?? -1,
        education: primaryEdu || null,
        create_date: user.submitTime,
        userInfo: {
          _id: user._id,
          nickname: user.nickname,
          mobile: user.mobile,
          avatar: user.avatar
        }
      }
    })

    return {
      errCode: 0,
      data: {
        list,
        total,
        page,
        pageSize
      }
    }
  },

  /**
   * 获取认证详情（从 uni-id-users 查询）
   * @param {String} id - 用户ID
   * @returns {Object} 认证详情
   */
  async getVerificationDetail(id) {
    if (!id) {
      return { errCode: 1, errMsg: '参数错误' }
    }

    const [res, configRes] = await Promise.all([
      db.collection('uni-id-users').doc(id).get(),
      db.collection('alumni-school-config').limit(1).get()
    ])

    if (!res.data || res.data.length === 0) {
      return { errCode: 2, errMsg: '记录不存在' }
    }

    const user = res.data[0]
    const schoolName = configRes.data?.[0]?.name || ''
    const primaryEdu = user.educations?.find(e => e.isPrimary) || user.educations?.[0]

    // 适配前端期望的数据结构
    return {
      errCode: 0,
      data: {
        _id: user._id,
        user_id: user._id,
        realName: user.realName,
        gender: user.gender,
        idCard: user.idCard,
        status: user.alumniStatus ?? -1,
        schoolName,
        education: primaryEdu || null,
        classTeacher: user.classTeacher,
        middleSchool: user.middleSchool,
        teachers: user.teachers,
        messageToSchool: user.messageToSchool,
        currentCompany: user.currentCompany,
        currentPosition: user.currentPosition,
        city: user.city,
        workInfo: user.workInfo,
        proofImages: user.verifyProof || user.diplomaUrls || [],
        cardPhotoUrl: user.cardPhotoUrl,
        create_date: user.submitTime,
        review_date: user.alumniVerifyTime,
        reject_reason: user.rejectReason,
        alumniCardNo: user.alumniCardNo,
        userInfo: {
          _id: user._id,
          nickname: user.nickname,
          mobile: user.mobile,
          avatar: user.avatar
        }
      }
    }
  },

  /**
   * 审核认证申请
   * @param {Object} params - 审核参数
   * @returns {Object} 操作结果
   */
  async reviewVerification(params) {
    const { id, status, rejectReason } = params

    if (!id) {
      return { errCode: 1, errMsg: '参数错误' }
    }

    if (![1, 2].includes(status)) {
      return { errCode: 2, errMsg: '状态值无效' }
    }

    const now = Date.now()

    // 获取用户当前状态
    const userRes = await db.collection('uni-id-users').doc(id).get()
    if (!userRes.data || userRes.data.length === 0) {
      return { errCode: 3, errMsg: '记录不存在' }
    }

    const user = userRes.data[0]

    if (user.alumniStatus !== 0) {
      return { errCode: 4, errMsg: '该申请已被处理' }
    }

    // 构建更新数据
    const updateData = {
      alumniStatus: status,
      alumniVerifyTime: now,
      alumniVerifyMethod: 'admin_review',
      reviewerId: this.uid
    }

    if (status === 2 && rejectReason) {
      updateData.rejectReason = rejectReason
    }

    // 如果通过，生成校友卡号
    if (status === 1) {
      const primaryEdu = user.educations?.find(e => e.isPrimary) || user.educations?.[0]
      const enrollmentYear = primaryEdu?.enrollmentYear || new Date().getFullYear()

      // 查询该年份最大的卡号
      const cardRes = await db.collection('uni-id-users')
        .where({
          alumniCardNo: new RegExp(`^${enrollmentYear}`)
        })
        .orderBy('alumniCardNo', 'desc')
        .limit(1)
        .get()

      let sequence = 1
      if (cardRes.data && cardRes.data.length > 0) {
        const lastCardNo = cardRes.data[0].alumniCardNo
        const lastSequence = parseInt(lastCardNo.substring(4))
        sequence = lastSequence + 1
      }

      updateData.alumniCardNo = generateAlumniCardNo(enrollmentYear, sequence)
    }

    await db.collection('uni-id-users').doc(id).update(updateData)

    // 写入审计日志（容错，不影响主流程）
    try {
      await db.collection('alumni-verify-logs').add({
        userId: id,
        method: 'admin',
        result: status === 1 ? 'approved' : 'rejected',
        rejectReason: status === 2 ? (rejectReason || '') : '',
        operatorId: this.uid,
        createTime: now
      })
    } catch (e) {
      console.warn('写入审计日志失败', e.message)
    }

    return { errCode: 0, errMsg: status === 1 ? '审核通过' : '已拒绝' }
  },

  // ==================== 校友用户管理 ====================

  /**
   * 获取校友用户列表
   * @param {Object} params - 查询参数
   * @returns {Object} 用户列表
   */
  async getAlumniUserList(params = {}) {
    const { keyword, alumniStatus, page = 1, pageSize = 20 } = params

    let whereCondition = {}

    // 校友状态筛选
    if (alumniStatus !== undefined && alumniStatus !== null && alumniStatus !== '') {
      whereCondition.alumniStatus = parseInt(alumniStatus)
    }

    // 关键词搜索
    if (keyword) {
      const keywordCondition = dbCmd.or([
        { nickname: new RegExp(keyword, 'i') },
        { mobile: new RegExp(keyword, 'i') },
        { username: new RegExp(keyword, 'i') },
        { realName: new RegExp(keyword, 'i') }
      ])
      if (Object.keys(whereCondition).length > 0) {
        whereCondition = dbCmd.and([whereCondition, keywordCondition])
      } else {
        whereCondition = keywordCondition
      }
    }

    let query = db.collection('uni-id-users')
    if (Object.keys(whereCondition).length > 0 || whereCondition.$and || whereCondition.$or) {
      query = query.where(whereCondition)
    }

    // 获取总数
    const countRes = await query.count()
    const total = countRes.total

    // 分页查询
    const listRes = await query
      .field({
        _id: true,
        username: true,
        nickname: true,
        mobile: true,
        avatar: true,
        realName: true,
        alumniStatus: true,
        register_date: true,
        last_login_date: true
      })
      .orderBy('register_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      errCode: 0,
      data: {
        list: listRes.data,
        total,
        page,
        pageSize
      }
    }
  },

  /**
   * 获取校友用户详情（全部从 uni-id-users 获取）
   * @param {String} userId - 用户ID
   * @returns {Object} 用户详情
   */
  async getAlumniUserDetail(userId) {
    if (!userId) {
      return { errCode: 1, errMsg: '参数错误' }
    }

    const [userRes, configRes] = await Promise.all([
      db.collection('uni-id-users').doc(userId).get(),
      db.collection('alumni-school-config').limit(1).get()
    ])

    if (!userRes.data || userRes.data.length === 0) {
      return { errCode: 2, errMsg: '用户不存在' }
    }

    const user = userRes.data[0]
    const schoolName = configRes.data?.[0]?.name || ''
    const primaryEdu = user.educations?.find(e => e.isPrimary) || user.educations?.[0]

    return {
      errCode: 0,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          nickname: user.nickname,
          mobile: user.mobile,
          email: user.email,
          avatar: user.avatar,
          alumniStatus: user.alumniStatus,
          register_date: user.register_date,
          last_login_date: user.last_login_date
        },
        schoolName,
        // 校友信息直接从 user 字段中提取
        alumniInfo: user.alumniStatus >= 0 ? {
          realName: user.realName,
          gender: user.gender,
          idCard: user.idCard,
          educations: user.educations || [],
          primaryEducation: primaryEdu || null,
          workInfo: user.workInfo,
          currentCompany: user.currentCompany,
          currentPosition: user.currentPosition,
          city: user.city,
          industry: user.industry,
          classTeacher: user.classTeacher,
          middleSchool: user.middleSchool,
          teachers: user.teachers,
          messageToSchool: user.messageToSchool,
          cardPhotoUrl: user.cardPhotoUrl,
          diplomaUrls: user.diplomaUrls || [],
          verifyProof: user.verifyProof || [],
          alumniCardNo: user.alumniCardNo,
          alumniVerifyMethod: user.alumniVerifyMethod
        } : null,
        // 认证记录信息
        verificationInfo: user.submitTime ? {
          status: user.alumniStatus ?? -1,
          create_date: user.submitTime,
          review_date: user.alumniVerifyTime,
          reject_reason: user.rejectReason,
          alumniVerifyMethod: user.alumniVerifyMethod
        } : null
      }
    }
  },

  /**
   * 更新用户校友状态
   * @param {Object} params - 参数
   * @returns {Object} 操作结果
   */
  async updateAlumniStatus(params) {
    const { userId, alumniStatus } = params

    if (!userId) {
      return { errCode: 1, errMsg: '参数错误' }
    }

    if (![0, 1, 2].includes(alumniStatus)) {
      return { errCode: 2, errMsg: '状态值无效' }
    }

    await db.collection('uni-id-users').doc(userId).update({
      alumniStatus,
      alumniStatusUpdateDate: Date.now(),
      alumniStatusUpdateBy: this.uid
    })

    return { errCode: 0, errMsg: '更新成功' }
  },

  // ==================== 数据统计 ====================

  /**
   * 获取统计概览
   * @returns {Object} 统计数据
   */
  async getStatisticsOverview() {
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000
    const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000

    // 总用户数
    const totalUsersRes = await db.collection('uni-id-users').count()
    const totalUsers = totalUsersRes.total

    // 已认证校友数
    const verifiedUsersRes = await db.collection('uni-id-users')
      .where({ alumniStatus: 1 })
      .count()
    const verifiedUsers = verifiedUsersRes.total

    // 待审核数（alumniStatus === 0 且有 submitTime）
    const pendingVerifyRes = await db.collection('uni-id-users')
      .where({
        alumniStatus: 0,
        submitTime: dbCmd.exists(true)
      })
      .count()
    const pendingVerify = pendingVerifyRes.total

    // 今日新增用户
    const todayNewUsersRes = await db.collection('uni-id-users')
      .where({ register_date: dbCmd.gte(todayStart) })
      .count()
    const todayNewUsers = todayNewUsersRes.total

    // 本周新增用户
    const weekNewUsersRes = await db.collection('uni-id-users')
      .where({ register_date: dbCmd.gte(weekStart) })
      .count()
    const weekNewUsers = weekNewUsersRes.total

    // 本月新增用户
    const monthNewUsersRes = await db.collection('uni-id-users')
      .where({ register_date: dbCmd.gte(monthStart) })
      .count()
    const monthNewUsers = monthNewUsersRes.total

    // 好友关系数（容错处理，集合可能不存在）
    let friendships = 0
    try {
      const friendshipsRes = await db.collection('alumni-friends').count()
      friendships = friendshipsRes.total
    } catch (e) {
      // 集合不存在时忽略
    }

    return {
      errCode: 0,
      data: {
        totalUsers,
        verifiedUsers,
        pendingVerify,
        todayNewUsers,
        weekNewUsers,
        monthNewUsers,
        friendships,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(1) : 0
      }
    }
  },

  /**
   * 获取用户增长趋势
   * @param {Object} params - 参数
   * @returns {Object} 趋势数据
   */
  async getUserGrowthTrend(params = {}) {
    const { days = 30 } = params
    const now = Date.now()
    const startTime = now - days * 24 * 60 * 60 * 1000

    // 获取时间范围内的用户
    const usersRes = await db.collection('uni-id-users')
      .where({ register_date: dbCmd.gte(startTime) })
      .field({ register_date: true })
      .get()

    // 按天统计
    const dailyStats = {}
    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
      dailyStats[dateStr] = 0
    }

    usersRes.data.forEach(user => {
      const date = new Date(user.register_date)
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
      if (dailyStats[dateStr] !== undefined) {
        dailyStats[dateStr]++
      }
    })

    // 转换为数组格式
    const trend = Object.entries(dailyStats)
      .map(([date, count]) => ({ date, count }))
      .reverse()

    return {
      errCode: 0,
      data: trend
    }
  },

  /**
   * 获取入学年份分布（从 uni-id-users 的 educations 字段统计）
   * @returns {Object} 分布数据
   */
  async getEnrollmentYearDistribution() {
    const usersRes = await db.collection('uni-id-users')
      .where({
        alumniStatus: 1,
        educations: dbCmd.exists(true)
      })
      .field({ educations: true })
      .get()

    const distribution = {}
    usersRes.data.forEach(user => {
      const primaryEdu = user.educations?.find(e => e.isPrimary) || user.educations?.[0]
      const year = primaryEdu?.enrollmentYear
      if (year) {
        distribution[year] = (distribution[year] || 0) + 1
      }
    })

    // 转换为数组并排序，使用 _id 字段名适配前端
    const result = Object.entries(distribution)
      .map(([year, count]) => ({ _id: parseInt(year), count }))
      .sort((a, b) => b._id - a._id)

    return {
      errCode: 0,
      data: result
    }
  },

  /**
   * 获取城市分布（从 uni-id-users 的 city 字段统计）
   * @returns {Object} 分布数据
   */
  async getCityDistribution() {
    const usersRes = await db.collection('uni-id-users')
      .where({
        alumniStatus: 1,
        city: dbCmd.exists(true)
      })
      .field({ city: true })
      .get()

    const distribution = {}
    usersRes.data.forEach(user => {
      const city = user.city
      if (city) {
        distribution[city] = (distribution[city] || 0) + 1
      }
    })

    // 转换为数组并按数量排序，使用 _id 字段名适配前端
    const result = Object.entries(distribution)
      .map(([city, count]) => ({ _id: city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    return {
      errCode: 0,
      data: result
    }
  },

  /**
   * 获取行业分布（从 uni-id-users 的 industry 字段统计）
   * @returns {Object} 分布数据
   */
  async getIndustryDistribution() {
    const usersRes = await db.collection('uni-id-users')
      .where({
        alumniStatus: 1,
        industry: dbCmd.exists(true)
      })
      .field({ industry: true })
      .get()

    const distribution = {}
    usersRes.data.forEach(user => {
      const industry = user.industry
      if (industry) {
        distribution[industry] = (distribution[industry] || 0) + 1
      }
    })

    // 转换为数组并按数量排序，使用 _id 字段名适配前端
    const result = Object.entries(distribution)
      .map(([industry, count]) => ({ _id: industry, count }))
      .sort((a, b) => b.count - a.count)

    return {
      errCode: 0,
      data: result
    }
  }
}
