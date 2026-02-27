/**
 * 校友会云对象
 * @description 处理校友认证、个人资料、推荐等业务逻辑
 */
const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

/**
 * @typedef {Object} Education
 * @property {string} degree - 学历类型
 * @property {number} enrollmentYear - 入学年份
 * @property {number} graduationYear - 毕业年份
 * @property {string} [college] - 学院
 * @property {string} [major] - 专业
 * @property {string} [grade] - 年级（中学）
 * @property {string} [className] - 班级
 * @property {string} [studentId] - 学号
 * @property {boolean} [isPrimary] - 是否主要学历
 */

/**
 * @typedef {Object} ProfileUpdateData
 * @property {string} [realName] - 真实姓名
 * @property {string} [avatar] - 头像
 * @property {Education[]} [educations] - 教育经历
 * @property {string} [currentCompany] - 当前公司
 * @property {string} [currentPosition] - 当前职位
 * @property {string} [industry] - 行业
 * @property {string} [province] - 省份
 * @property {string} [city] - 城市
 * @property {string[]} [interests] - 兴趣标签
 * @property {string} [bio] - 个人简介
 * @property {boolean} [contactVisible] - 联系方式是否可见
 * @property {boolean} [profileVisible] - 个人资料是否可见
 */

/**
 * @typedef {Object} VerificationData
 * @property {string} realName - 真实姓名
 * @property {Education[]} educations - 教育经历
 * @property {string[]} [proofUrls] - 证明材料URL
 * @property {string} [idCard] - 身份证号
 * @property {string} [classTeacher] - 高三班主任（高中）
 * @property {string} [middleSchool] - 初中毕业学校
 * @property {string[]} [teachers] - 任课老师列表
 * @property {string} [messageToSchool] - 对母校寄语
 */

/**
 * 生成校友卡号
 * @param {string} enrollmentYear - 入学年份
 * @param {number} sequence - 序号
 * @returns {string} 校友卡号，格式：年份+8位序号，如 20150000055
 */
function generateAlumniCardNo(enrollmentYear, sequence) {
  const paddedSequence = String(sequence).padStart(8, '0')
  return `${enrollmentYear}${paddedSequence}`
}

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

// 学历等级权重，用于排序（值越大学历越高）
const DEGREE_WEIGHT = {
  doctor: 4,
  master: 3,
  bachelor: 2,
  highschool: 1,
  middleschool: 0
}

/**
 * 将本校学历按学历高低排序（博士>硕士>本科>高中>初中）
 * @param {Education[]} educations
 * @returns {Education[]}
 */
function sortLocalEducations(educations) {
  return [...educations].sort((a, b) => (DEGREE_WEIGHT[b.degree] || 0) - (DEGREE_WEIGHT[a.degree] || 0))
}

/**
 * 验证教育经历数据
 * @param {Education[]} educations - 完整教育经历数组（含本校和其他学校）
 * @param {string} schoolType - 学校类型：university, highschool, middleschool
 * @param {string[]} localDegrees - 本校提供的学历类型
 */
function validateEducations(educations, schoolType = 'university', localDegrees = []) {
  if (!Array.isArray(educations) || educations.length === 0) {
    throw { errCode: 'INVALID_PARAM', errMsg: '教育经历不能为空' }
  }

  const localEds = educations.filter(e => e.isLocal)
  const otherEds = educations.filter(e => !e.isLocal)

  // 本校学历：至少1条，最多3条
  if (localEds.length === 0) {
    throw { errCode: 'INVALID_PARAM', errMsg: '请至少填写一条本校学历' }
  }
  if (localEds.length > 3) {
    throw { errCode: 'INVALID_PARAM', errMsg: '本校学历最多3条' }
  }
  // 其他学历：最多3条
  if (otherEds.length > 3) {
    throw { errCode: 'INVALID_PARAM', errMsg: '其他学历最多3条' }
  }

  const validDegrees = ['bachelor', 'master', 'doctor', 'highschool', 'middleschool']
  const currentYear = new Date().getFullYear()

  for (const edu of educations) {
    if (!edu.degree || !validDegrees.includes(edu.degree)) {
      throw { errCode: 'INVALID_PARAM', errMsg: '学历类型无效' }
    }
    if (!edu.enrollmentYear || edu.enrollmentYear < 1900 || edu.enrollmentYear > currentYear) {
      throw { errCode: 'INVALID_PARAM', errMsg: '入学年份无效' }
    }
    if (edu.graduationYear && edu.graduationYear < edu.enrollmentYear) {
      throw { errCode: 'INVALID_PARAM', errMsg: '毕业年份不能早于入学年份' }
    }
    // 非本校学历必须填写学校名称
    if (!edu.isLocal && !edu.schoolName) {
      throw { errCode: 'INVALID_PARAM', errMsg: '请填写学校名称' }
    }
  }

  // 本校学历的特殊校验
  for (const edu of localEds) {
    // 高中/初中校友会：班主任必填
    if (schoolType !== 'university' && !edu.headTeacher) {
      throw { errCode: 'INVALID_PARAM', errMsg: '请填写班主任姓名' }
    }
  }
}

/**
 * 生成唯一的校友卡号
 * @param {number} enrollmentYear - 入学年份
 * @returns {Promise<string>} 校友卡号
 */
async function generateUniqueCardNo(enrollmentYear) {
  const userCollection = db.collection('uni-id-users')

  // 查询该年份最大的卡号
  const res = await userCollection
    .where({
      alumniCardNo: dbCmd.exists(true),
      alumniCardNo: new RegExp(`^${enrollmentYear}`)
    })
    .orderBy('alumniCardNo', 'desc')
    .limit(1)
    .get()

  let sequence = 1
  if (res.data && res.data.length > 0) {
    const lastCardNo = res.data[0].alumniCardNo
    const lastSequence = parseInt(lastCardNo.substring(4))
    sequence = lastSequence + 1
  }

  return generateAlumniCardNo(enrollmentYear, sequence)
}

module.exports = {
  _before: async function() {
    // 获取客户端信息
    this.clientInfo = this.getClientInfo()

    // 初始化uni-id-common
    this.uniIdCommon = uniIdCommon.createInstance({
      clientInfo: this.clientInfo
    })

    // 获取当前用户ID（部分接口需要登录）
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
   * 获取当前用户的校友资料
   * @returns {Promise<Object>} 用户校友资料
   */
  async getMyProfile() {
    checkLogin(this.uid)

    const userCollection = db.collection('uni-id-users')
    const res = await userCollection.doc(this.uid).field({
      _id: 1,
      avatar: 1,
      nickname: 1,
      realName: 1,
      gender: 1,
      alumniStatus: 1,
      alumniVerifyTime: 1,
      alumniCardNo: 1,
      educations: 1,
      currentCompany: 1,
      currentPosition: 1,
      industry: 1,
      province: 1,
      city: 1,
      interests: 1,
      bio: 1,
      contactVisible: 1,
      profileVisible: 1,
      recommendCount: 1,
      friendCount: 1,
      mobile: 1,
      email: 1,
      idCard: 1,
      classTeacher: 1,
      middleSchool: 1,
      teachers: 1,
      messageToSchool: 1
    }).get()

    if (!res.data || res.data.length === 0) {
      throw {
        errCode: 'USER_NOT_FOUND',
        errMsg: '用户不存在'
      }
    }

    return {
      errCode: 0,
      data: res.data[0]
    }
  },

  /**
   * 更新当前用户的校友资料
   * @param {ProfileUpdateData} data - 要更新的资料
   * @returns {Promise<Object>} 更新结果
   */
  async updateMyProfile(data) {
    checkLogin(this.uid)

    // 允许更新的字段白名单
    const allowedFields = [
      'avatar', 'realName', 'educations', 'currentCompany',
      'currentPosition', 'industry', 'province', 'city',
      'interests', 'bio', 'contactVisible', 'profileVisible',
      'idCard', 'classTeacher', 'middleSchool', 'teachers', 'messageToSchool'
    ]

    // 过滤非法字段
    const updateData = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '没有可更新的字段'
      }
    }

    // 验证教育经历
    if (updateData.educations) {
      validateEducations(updateData.educations)
    }

    // 验证兴趣标签数量
    if (updateData.interests && updateData.interests.length > 10) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '兴趣标签最多10个'
      }
    }

    const userCollection = db.collection('uni-id-users')
    await userCollection.doc(this.uid).update(updateData)

    return {
      errCode: 0,
      errMsg: '更新成功'
    }
  },

  /**
   * 提交校友认证
   * @param {VerificationData} data - 认证信息
   * @returns {Promise<Object>} 提交结果
   */
  async submitVerification(data) {
    checkLogin(this.uid)

    const {
      realName,
      gender,
      educations,
      proofUrls,
      employmentStatus,
      company,
      position,
      occupationDesc,
      message,
      city,
      cardPhotoUrl,
      diplomaUrls,
      schoolType
    } = data

    // 参数验证
    if (!realName || realName.length < 2 || realName.length > 20) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请填写有效的真实姓名'
      }
    }

    const validEmploymentStatus = ['employed', 'freelance', 'retired', 'student']
    if (!employmentStatus || !validEmploymentStatus.includes(employmentStatus)) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请选择就业状态'
      }
    }

    if (employmentStatus === 'employed') {
      if (!company) {
        throw { errCode: 'INVALID_PARAM', errMsg: '请填写工作单位' }
      }
      if (!position) {
        throw { errCode: 'INVALID_PARAM', errMsg: '请填写职位' }
      }
    }

    if (!city) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请填写现居城市'
      }
    }

    if (!cardPhotoUrl) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请上传校友卡照片'
      }
    }

    // 获取学校配置（用于验证）
    const configRes = await db.collection('alumni-school-config').limit(1).get()
    const schoolConfig = configRes.data?.[0] || {}
    const localDegrees = schoolConfig.localDegrees || []

    validateEducations(educations, schoolType, localDegrees)

    // 检查当前认证状态
    const userCollection = db.collection('uni-id-users')
    const currentUser = await userCollection.doc(this.uid).field({
      alumniStatus: 1
    }).get()

    if (currentUser.data[0]?.alumniStatus === 1) {
      throw {
        errCode: 'ALREADY_VERIFIED',
        errMsg: '您已通过校友认证'
      }
    }

    // 本校学历按学历高低排序，其他学历追加在后
    const localEds = sortLocalEducations(educations.filter(e => e.isLocal))
    const otherEds = educations.filter(e => !e.isLocal)
    const sortedEducations = [...localEds, ...otherEds]

    // 更新用户信息
    const updateData = {
      realName,
      gender,
      educations: sortedEducations,
      employmentStatus,
      currentCompany: employmentStatus === 'employed' ? company : '',
      currentPosition: employmentStatus === 'employed' ? position : '',
      city,
      cardPhotoUrl,
      alumniStatus: 0
    }

    // 添加可选字段
    if (employmentStatus === 'freelance' && occupationDesc) updateData.occupationDesc = occupationDesc
    if (message) updateData.messageToSchool = message
    if (diplomaUrls && diplomaUrls.length > 0) updateData.diplomaUrls = diplomaUrls
    if (proofUrls && proofUrls.length > 0) updateData.verifyProof = proofUrls

    updateData.submitTime = Date.now()

    await userCollection.doc(this.uid).update(updateData)

    return {
      errCode: 0,
      errMsg: '认证信息已提交，请等待审核',
      data: {
        status: updateData.alumniStatus
      }
    }
  },

  /**
   * 获取认证状态
   * @returns {Promise<Object>} 认证状态信息
   */
  async getVerificationStatus() {
    checkLogin(this.uid)

    const userCollection = db.collection('uni-id-users')
    const res = await userCollection.doc(this.uid).field({
      alumniStatus: 1,
      alumniVerifyTime: 1,
      recommendCount: 1
    }).get()

    if (!res.data || res.data.length === 0) {
      throw {
        errCode: 'USER_NOT_FOUND',
        errMsg: '用户不存在'
      }
    }

    // 获取学校配置
    const configRes = await db.collection('alumni-school-config')
      .doc('school_config')
      .get()

    const schoolConfig = configRes.data?.[0] || {}
    const features = schoolConfig.features || {}

    const userData = res.data[0]
    const result = {
      status: userData.alumniStatus || 0,
      verifyTime: userData.alumniVerifyTime,
      recommendCount: userData.recommendCount || 0
    }

    // 如果是推荐认证模式，返回所需推荐数
    if (features.enableRecommendVerify) {
      result.requiredRecommendCount = features.recommendCount || 3
    }

    return {
      errCode: 0,
      data: result
    }
  },

  /**
   * 推荐校友（需要自己已认证）
   * @param {Object} params
   * @param {string} params.toUserId - 被推荐人ID
   * @param {string} [params.message] - 推荐说明
   * @param {string} [params.relation] - 与被推荐人关系
   * @returns {Promise<Object>} 推荐结果
   */
  async recommendAlumni({ toUserId, message, relation }) {
    checkLogin(this.uid)

    if (!toUserId) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请指定被推荐人'
      }
    }

    if (toUserId === this.uid) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '不能推荐自己'
      }
    }

    // 检查自己是否已认证
    const userCollection = db.collection('uni-id-users')
    const myInfo = await userCollection.doc(this.uid).field({
      alumniStatus: 1
    }).get()

    if (myInfo.data[0]?.alumniStatus !== 1) {
      throw {
        errCode: 'NOT_VERIFIED',
        errMsg: '只有已认证校友才能推荐他人'
      }
    }

    // 检查被推荐人是否存在且未认证
    const targetInfo = await userCollection.doc(toUserId).field({
      alumniStatus: 1,
      realName: 1,
      educations: 1
    }).get()

    if (!targetInfo.data || targetInfo.data.length === 0) {
      throw {
        errCode: 'USER_NOT_FOUND',
        errMsg: '被推荐人不存在'
      }
    }

    if (targetInfo.data[0]?.alumniStatus === 1) {
      throw {
        errCode: 'ALREADY_VERIFIED',
        errMsg: '该用户已通过认证，无需推荐'
      }
    }

    // 检查是否已推荐过
    const recommendCollection = db.collection('alumni-recommendations')
    const existRes = await recommendCollection.where({
      fromUserId: this.uid,
      toUserId: toUserId,
      status: 0
    }).count()

    if (existRes.total > 0) {
      throw {
        errCode: 'ALREADY_RECOMMENDED',
        errMsg: '您已推荐过该用户'
      }
    }

    // 创建推荐记录
    await recommendCollection.add({
      fromUserId: this.uid,
      toUserId: toUserId,
      message: message || '',
      relation: relation || '',
      status: 0,
      createTime: Date.now()
    })

    // 更新被推荐人的推荐数
    await userCollection.doc(toUserId).update({
      recommendCount: dbCmd.inc(1)
    })

    // 检查是否达到认证条件
    const configRes = await db.collection('alumni-school-config')
      .doc('school_config')
      .get()

    const schoolConfig = configRes.data?.[0] || {}
    const features = schoolConfig.features || {}

    if (features.enableRecommendVerify) {
      const requiredCount = features.recommendCount || 3
      const newRecommendRes = await recommendCollection.where({
        toUserId: toUserId,
        status: 0
      }).count()

      if (newRecommendRes.total >= requiredCount) {
        // 达到条件，自动认证
        const now = Date.now()
        const primaryEdu = targetInfo.data[0]?.educations?.find(e => e.isPrimary) || targetInfo.data[0]?.educations?.[0]

        const updateFields = {
          alumniStatus: 1,
          alumniVerifyTime: now,
          alumniVerifyMethod: 'recommend',
          recommendCount: newRecommendRes.total
        }

        // 生成校友卡号
        if (primaryEdu?.enrollmentYear) {
          updateFields.alumniCardNo = await generateUniqueCardNo(primaryEdu.enrollmentYear)
        }

        await userCollection.doc(toUserId).update(updateFields)

        // 记录审计日志（容错，不影响主流程）
        try {
          await db.collection('alumni-verify-logs').add({
            userId: toUserId,
            method: 'recommend',
            recommendCount: newRecommendRes.total,
            requiredCount,
            lastRecommenderId: this.uid,
            result: 'approved',
            createTime: now
          })
        } catch (e) {
          console.warn('写入审计日志失败', e.message)
        }
      }
    }

    return {
      errCode: 0,
      errMsg: '推荐成功'
    }
  },

  /**
   * 获取我收到的推荐列表
   * @returns {Promise<Object>} 推荐列表
   */
  async getMyRecommendations() {
    checkLogin(this.uid)

    const recommendCollection = db.collection('alumni-recommendations')
    const res = await recommendCollection
      .aggregate()
      .match({
        toUserId: this.uid,
        status: 0
      })
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
        relation: 1,
        createTime: 1,
        'fromUser._id': 1,
        'fromUser.avatar': 1,
        'fromUser.realName': 1,
        'fromUser.nickname': 1
      })
      .sort({ createTime: -1 })
      .end()

    return {
      errCode: 0,
      data: res.data || []
    }
  },

  /**
   * 获取学校配置
   * @returns {Promise<Object>} 学校配置
   */
  async getSchoolConfig() {
    const configRes = await db.collection('alumni-school-config').limit(1).get()

    if (!configRes.data || configRes.data.length === 0) {
      // 返回默认配置
      return {
        errCode: 0,
        data: {
          name: '校友会',
          type: 'university',
          localDegrees: ['bachelor', 'master', 'doctor'],
          colleges: [],
          features: {
            enableVerification: true,
            enableFriendship: true,
            enableChat: true,
            enableActivity: true,
            enableRecommendVerify: false,
            recommendCount: 3,
            requireProof: false
          }
        }
      }
    }

    return {
      errCode: 0,
      data: configRes.data[0]
    }
  },

  /**
   * 获取校友卡信息
   * @returns {Promise<Object>} 校友卡信息
   */
  async getAlumniCard() {
    checkLogin(this.uid)

    const userCollection = db.collection('uni-id-users')
    const [res, configRes2] = await Promise.all([
      userCollection.doc(this.uid).field({
        _id: 1,
        avatar: 1,
        realName: 1,
        alumniStatus: 1,
        alumniCardNo: 1,
        alumniVerifyTime: 1,
        educations: 1,
        cardPhotoUrl: 1
      }).get(),
      db.collection('alumni-school-config').limit(1).get()
    ])

    if (!res.data || res.data.length === 0) {
      throw {
        errCode: 'USER_NOT_FOUND',
        errMsg: '用户不存在'
      }
    }

    const user = res.data[0]

    if (user.alumniStatus !== 1) {
      throw {
        errCode: 'NOT_VERIFIED',
        errMsg: '您尚未通过校友认证'
      }
    }

    const schoolConfig = configRes2.data?.[0] || { name: '校友会' }

    // 获取主要学历
    const primaryEdu = user.educations?.find(e => e.isPrimary) || user.educations?.[0]

    return {
      errCode: 0,
      data: {
        schoolName: schoolConfig.name,
        schoolLogo: schoolConfig.logo,
        branding: schoolConfig.branding || {},
        realName: user.realName,
        avatar: user.avatar,
        cardPhotoUrl: user.cardPhotoUrl,
        alumniCardNo: user.alumniCardNo,
        graduationYear: primaryEdu?.graduationYear,
        enrollmentYear: primaryEdu?.enrollmentYear,
        college: primaryEdu?.college,
        major: primaryEdu?.major,
        className: primaryEdu?.className,
        verifyTime: user.alumniVerifyTime
      }
    }
  },

  /**
   * 获取字典数据
   * @param {string} type - 字典类型: industry/interest/city/degree
   * @returns {Promise<Object>} 字典数据
   */
  async getDictionary(type) {
    if (!type) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请指定字典类型'
      }
    }

    const dictCollection = db.collection('alumni-dictionaries')
    const res = await dictCollection.where({
      type: type
    }).get()

    if (!res.data || res.data.length === 0) {
      return {
        errCode: 0,
        data: { type, items: [] }
      }
    }

    // 过滤已禁用的选项
    const dict = res.data[0]
    if (dict.items) {
      dict.items = dict.items.filter(item => item.enabled !== false)
      dict.items.sort((a, b) => (a.sort || 0) - (b.sort || 0))
    }

    return {
      errCode: 0,
      data: dict
    }
  },

  /**
   * 获取多个字典数据
   * @param {string[]} types - 字典类型数组
   * @returns {Promise<Object>} 字典数据映射
   */
  async getDictionaries(types) {
    if (!types || !Array.isArray(types) || types.length === 0) {
      throw {
        errCode: 'INVALID_PARAM',
        errMsg: '请指定字典类型'
      }
    }

    const dictCollection = db.collection('alumni-dictionaries')
    const res = await dictCollection.where({
      type: dbCmd.in(types)
    }).get()

    const dictMap = {}
    for (const dict of (res.data || [])) {
      if (dict.items) {
        dict.items = dict.items.filter(item => item.enabled !== false)
        dict.items.sort((a, b) => (a.sort || 0) - (b.sort || 0))
      }
      dictMap[dict.type] = dict.items || []
    }

    // 补充未找到的字典
    for (const type of types) {
      if (!dictMap[type]) {
        dictMap[type] = []
      }
    }

    return {
      errCode: 0,
      data: dictMap
    }
  }
}
