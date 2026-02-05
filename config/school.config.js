/**
 * 学校配置文件
 * 各高校部署时只需修改此文件即可完成个性化配置
 */
module.exports = {
  // ========== 基础信息（必填） ==========
  name: '示例大学',                      // 学校名称
  shortName: '示例',                     // 简称
  type: 'university',                    // 类型: university/highschool/middleschool
  logo: '/static/school-logo.png',       // 学校Logo路径

  // ========== 小程序信息（必填） ==========
  appName: '示例大学校友会',              // 小程序名称
  appId: '',                             // 微信小程序AppID（发布时填写）

  // ========== 主题配置（可选，有默认值） ==========
  theme: {
    primaryColor: '#2B5CE6',             // 主色调（学院蓝）
    primaryLight: '#5B7FED',             // 主色调-浅
    primaryDark: '#1E3FA8',              // 主色调-深
    primaryRgb: '43, 92, 230',           // 主色调RGB值
    secondaryColor: '#F39C12',           // 辅助色
    accentColor: '#27AE60',              // 点缀色
  },

  // ========== 品牌配置（可选） ==========
  branding: {
    slogan: '厚德博学，求实创新',          // 校训/标语
    welcomeText: '欢迎回家，校友',         // 欢迎语
    copyrightText: '© 示例大学校友会',     // 版权信息
  },

  // ========== 组织结构（根据学校类型配置） ==========

  // 大学配置
  degrees: ['bachelor', 'master', 'doctor'],  // 学历层次
  colleges: [
    {
      name: '计算机学院',
      majors: ['计算机科学与技术', '软件工程', '人工智能', '网络工程']
    },
    {
      name: '商学院',
      majors: ['工商管理', '市场营销', '会计学', '金融学']
    },
    {
      name: '机械工程学院',
      majors: ['机械设计制造及其自动化', '车辆工程', '工业设计']
    },
    {
      name: '外国语学院',
      majors: ['英语', '日语', '翻译']
    },
    // ... 添加更多学院
  ],

  // 中学配置（高中/初中使用，大学请注释掉）
  // grades: ['高一', '高二', '高三'],

  // ========== 功能开关（可选） ==========
  features: {
    enableDonation: false,               // 是否启用捐赠模块（需要支付资质）
    enableMap: true,                     // 是否启用校友地图
    enableActivity: true,                // 是否启用活动模块
    enableOrganization: true,            // 是否启用组织模块
    enableRecommendVerify: true,         // 是否启用推荐认证
    recommendCount: 3,                   // 推荐认证所需人数
    requireProof: false,                 // 是否必须上传证明材料
  },

  // ========== 认证配置 ==========
  verify: {
    // 入学年份范围
    enrollmentYearRange: {
      min: 1950,                         // 最早入学年份
      max: new Date().getFullYear(),     // 最晚入学年份（当前年）
    },
    // 请求过期时间（天）
    cardRequestExpireDays: 7,
  },
}
