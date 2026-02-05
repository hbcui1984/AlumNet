/**
 * 通用类型定义
 */

/** API 响应基础结构 */
export interface ApiResponse<T = any> {
  code: number
  message?: string
  data?: T
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  lastId?: string
}

/** 分页响应 */
export interface PaginationResult<T> {
  list: T[]
  total?: number
  hasMore: boolean
  lastId?: string
}

/** 字典项 */
export interface DictItem {
  value: string
  label: string
  sort?: number
  enabled?: boolean
}

/** 字典数据 */
export interface DictData {
  _id: string
  type: string
  items: DictItem[]
}

/** 学校配置 */
export interface SchoolConfig {
  _id: string
  name: string
  shortName: string
  type: 'university' | 'highschool' | 'middleschool'
  logo: string
  appName: string

  theme?: {
    primaryColor: string
    primaryLight: string
    primaryDark: string
    primaryRgb: string
    secondaryColor: string
    accentColor: string
  }

  branding?: {
    slogan: string
    welcomeText: string
    copyrightText: string
  }

  degrees?: string[]
  colleges?: Array<{
    name: string
    majors: string[]
  }>
  grades?: string[]

  features?: {
    enableDonation: boolean
    enableMap: boolean
    enableActivity: boolean
    enableOrganization: boolean
    enableRecommendVerify: boolean
    recommendCount: number
    requireProof: boolean
  }
}
