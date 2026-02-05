/**
 * 校友搜索云对象
 * @description 处理校友搜索、列表查询等业务逻辑
 */
const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

/**
 * @typedef {Object} SearchParams
 * @property {number} [enrollmentYear] - 入学年份
 * @property {string} [college] - 学院
 * @property {string} [major] - 专业
 * @property {string} [industry] - 行业
 * @property {string} [city] - 城市
 * @property {string} [province] - 省份
 * @property {string[]} [interests] - 兴趣标签
 * @property {string} [keyword] - 关键词（姓名/公司/职位）
 * @property {string} [cursor] - 游标（用于分页）
 * @property {number} [pageSize] - 每页数量，默认20
 */

/**
 * 默认每页数量
 */
const DEFAULT_PAGE_SIZE = 20

/**
 * 最大每页数量
 */
const MAX_PAGE_SIZE = 50

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
   * 检查是否已登录
   * @private
   */
  _checkLogin() {
    if (!this.uid) {
      throw {
        errCode: 'TOKEN_INVALID',
        errMsg: '请先登录'
      }
    }
  },

  /**
   * 搜索校友列表
   * @param {SearchParams} params - 搜索参数
   * @returns {Promise<Object>} 搜索结果
   */
  async searchAlumni(params = {}) {
    this._checkLogin()

    const {
      enrollmentYear,
      college,
      major,
      industry,
      city,
      province,
      interests,
      keyword,
      cursor,
      pageSize = DEFAULT_PAGE_SIZE
    } = params

    // 限制每页数量
    const limit = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE)

    // 构建查询条件
    const matchConditions = {
      alumniStatus: 1, // 只查询已认证校友
      profileVisible: dbCmd.neq(false), // 过滤隐藏用户
      _id: dbCmd.neq(this.uid) // 排除自己
    }

    // 入学年份筛选（在educations数组中查找）
    if (enrollmentYear) {
      matchConditions['educations.enrollmentYear'] = enrollmentYear
    }

    // 学院筛选
    if (college) {
      matchConditions['educations.college'] = college
    }

    // 专业筛选
    if (major) {
      matchConditions['educations.major'] = major
    }

    // 行业筛选
    if (industry) {
      matchConditions.industry = industry
    }

    // 城市筛选
    if (city) {
      matchConditions.city = city
    }

    // 省份筛选
    if (province) {
      matchConditions.province = province
    }

    // 兴趣筛选（匹配任意一个）
    if (interests && interests.length > 0) {
      matchConditions.interests = dbCmd.in(interests)
    }

    // 关键词搜索（姓名/公司/职位）
    if (keyword) {
      const keywordRegex = new RegExp(keyword, 'i')
      matchConditions.$or = [
        { realName: keywordRegex },
        { currentCompany: keywordRegex },
        { currentPosition: keywordRegex }
      ]
    }

    // 游标分页（基于_id）
    if (cursor) {
      matchConditions._id = dbCmd.gt(cursor)
    }

    // 执行查询
    const userCollection = db.collection('uni-id-users')
    const res = await userCollection
      .aggregate()
      .match(matchConditions)
      .sort({ _id: 1 })
      .limit(limit + 1) // 多取一条判断是否有下一页
      .project({
        _id: 1,
        avatar: 1,
        realName: 1,
        nickname: 1,
        gender: 1,
        educations: 1,
        currentCompany: 1,
        currentPosition: 1,
        industry: 1,
        province: 1,
        city: 1,
        interests: 1,
        bio: 1,
        alumniVerifyTime: 1
      })
      .end()

    const data = res.data || []
    const hasMore = data.length > limit
    const list = hasMore ? data.slice(0, limit) : data
    const nextCursor = list.length > 0 ? list[list.length - 1]._id : null

    // 处理返回数据，只返回主要学历
    const processedList = list.map(user => {
      const primaryEdu = user.educations?.find(e => e.isPrimary) || user.educations?.[0]
      return {
        ...user,
        primaryEducation: primaryEdu ? {
          degree: primaryEdu.degree,
          enrollmentYear: primaryEdu.enrollmentYear,
          graduationYear: primaryEdu.graduationYear,
          college: primaryEdu.college,
          major: primaryEdu.major
        } : null,
        educations: undefined // 不返回完整教育经历
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
   * 获取校友详情
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 校友详情
   */
  async getAlumniDetail(userId) {
    this._checkLogin()

    if (!userId) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请指定用户ID'
      }
    }

    const userCollection = db.collection('uni-id-users')
    const res = await userCollection.doc(userId).field({
      _id: 1,
      avatar: 1,
      realName: 1,
      nickname: 1,
      gender: 1,
      alumniStatus: 1,
      alumniVerifyTime: 1,
      educations: 1,
      currentCompany: 1,
      currentPosition: 1,
      industry: 1,
      province: 1,
      city: 1,
      interests: 1,
      bio: 1,
      contactVisible: 1,
      mobile: 1,
      email: 1,
      friendCount: 1
    }).get()

    if (!res.data || res.data.length === 0) {
      throw {
        errCode: 'USER_NOT_FOUND',
        errMsg: '用户不存在'
      }
    }

    const user = res.data[0]

    // 检查是否已认证
    if (user.alumniStatus !== 1) {
      throw {
        errCode: 'NOT_VERIFIED',
        errMsg: '该用户尚未通过校友认证'
      }
    }

    // 检查是否为好友
    const isFriend = await this._checkIsFriend(userId)

    // 根据好友关系和隐私设置决定是否返回联系方式
    if (!isFriend || user.contactVisible === false) {
      delete user.mobile
      delete user.email
    }

    // 查询名片交换状态
    const cardRequestStatus = await this._getCardRequestStatus(userId)

    return {
      errCode: 0,
      data: {
        ...user,
        isFriend,
        cardRequestStatus
      }
    }
  },

  /**
   * 检查是否为好友
   * @private
   * @param {string} targetUserId - 目标用户ID
   * @returns {Promise<boolean>}
   */
  async _checkIsFriend(targetUserId) {
    // 确保 userIdA < userIdB
    const [userIdA, userIdB] = [this.uid, targetUserId].sort()

    const friendCollection = db.collection('alumni-friends')
    const res = await friendCollection.where({
      userIdA,
      userIdB,
      status: 1 // 正常好友关系
    }).count()

    return res.total > 0
  },

  /**
   * 获取名片交换状态
   * @private
   * @param {string} targetUserId - 目标用户ID
   * @returns {Promise<Object|null>}
   */
  async _getCardRequestStatus(targetUserId) {
    const cardCollection = db.collection('alumni-card-requests')

    // 查询我发出的请求
    const sentRes = await cardCollection.where({
      fromUserId: this.uid,
      toUserId: targetUserId,
      status: 0 // 待处理
    }).get()

    if (sentRes.data && sentRes.data.length > 0) {
      return {
        type: 'sent',
        requestId: sentRes.data[0]._id,
        status: sentRes.data[0].status
      }
    }

    // 查询我收到的请求
    const receivedRes = await cardCollection.where({
      fromUserId: targetUserId,
      toUserId: this.uid,
      status: 0 // 待处理
    }).get()

    if (receivedRes.data && receivedRes.data.length > 0) {
      return {
        type: 'received',
        requestId: receivedRes.data[0]._id,
        status: receivedRes.data[0].status
      }
    }

    return null
  },

  /**
   * 获取筛选选项（带统计）
   * @returns {Promise<Object>} 筛选选项
   */
  async getFilterOptions() {
    // 从统计表获取数据
    const statsCollection = db.collection('alumni-statistics')

    // 并行查询各维度统计
    const [yearStats, industryStats, cityStats, collegeStats] = await Promise.all([
      statsCollection.where({
        type: 'enrollment_year',
        count: dbCmd.gt(0)
      }).orderBy('key', 'desc').limit(50).get(),

      statsCollection.where({
        type: 'industry',
        count: dbCmd.gt(0)
      }).orderBy('count', 'desc').limit(30).get(),

      statsCollection.where({
        type: 'city',
        count: dbCmd.gt(0)
      }).orderBy('count', 'desc').limit(50).get(),

      statsCollection.where({
        type: 'college',
        count: dbCmd.gt(0)
      }).orderBy('count', 'desc').limit(30).get()
    ])

    return {
      errCode: 0,
      data: {
        enrollmentYears: (yearStats.data || []).map(s => ({
          value: parseInt(s.key),
          count: s.verifiedCount || s.count
        })),
        industries: (industryStats.data || []).map(s => ({
          value: s.key,
          count: s.verifiedCount || s.count
        })),
        cities: (cityStats.data || []).map(s => ({
          value: s.key,
          count: s.verifiedCount || s.count
        })),
        colleges: (collegeStats.data || []).map(s => ({
          value: s.key,
          count: s.verifiedCount || s.count
        }))
      }
    }
  },

  /**
   * 获取校友统计数据
   * @returns {Promise<Object>} 统计数据
   */
  async getAlumniStatistics() {
    const userCollection = db.collection('uni-id-users')

    // 总数统计
    const [totalRes, verifiedRes] = await Promise.all([
      userCollection.where({
        alumniStatus: dbCmd.exists(true)
      }).count(),
      userCollection.where({
        alumniStatus: 1
      }).count()
    ])

    return {
      errCode: 0,
      data: {
        totalCount: totalRes.total,
        verifiedCount: verifiedRes.total
      }
    }
  },

  /**
   * 获取同届校友
   * @param {Object} params
   * @param {number} [params.pageSize] - 每页数量
   * @param {string} [params.cursor] - 游标
   * @returns {Promise<Object>} 同届校友列表
   */
  async getSameYearAlumni({ pageSize = 10, cursor } = {}) {
    this._checkLogin()

    // 获取当前用户的入学年份
    const userCollection = db.collection('uni-id-users')
    const myInfo = await userCollection.doc(this.uid).field({
      educations: 1
    }).get()

    const myEducations = myInfo.data?.[0]?.educations || []
    const primaryEdu = myEducations.find(e => e.isPrimary) || myEducations[0]

    if (!primaryEdu || !primaryEdu.enrollmentYear) {
      return {
        errCode: 0,
        data: { list: [], hasMore: false, cursor: null }
      }
    }

    // 搜索同届校友
    return this.searchAlumni({
      enrollmentYear: primaryEdu.enrollmentYear,
      pageSize,
      cursor
    })
  },

  /**
   * 获取同城校友
   * @param {Object} params
   * @param {number} [params.pageSize] - 每页数量
   * @param {string} [params.cursor] - 游标
   * @returns {Promise<Object>} 同城校友列表
   */
  async getSameCityAlumni({ pageSize = 10, cursor } = {}) {
    this._checkLogin()

    // 获取当前用户的城市
    const userCollection = db.collection('uni-id-users')
    const myInfo = await userCollection.doc(this.uid).field({
      city: 1
    }).get()

    const myCity = myInfo.data?.[0]?.city

    if (!myCity) {
      return {
        errCode: 0,
        data: { list: [], hasMore: false, cursor: null }
      }
    }

    return this.searchAlumni({
      city: myCity,
      pageSize,
      cursor
    })
  },

  /**
   * 获取同行业校友
   * @param {Object} params
   * @param {number} [params.pageSize] - 每页数量
   * @param {string} [params.cursor] - 游标
   * @returns {Promise<Object>} 同行业校友列表
   */
  async getSameIndustryAlumni({ pageSize = 10, cursor } = {}) {
    this._checkLogin()

    // 获取当前用户的行业
    const userCollection = db.collection('uni-id-users')
    const myInfo = await userCollection.doc(this.uid).field({
      industry: 1
    }).get()

    const myIndustry = myInfo.data?.[0]?.industry

    if (!myIndustry) {
      return {
        errCode: 0,
        data: { list: [], hasMore: false, cursor: null }
      }
    }

    return this.searchAlumni({
      industry: myIndustry,
      pageSize,
      cursor
    })
  }
}
