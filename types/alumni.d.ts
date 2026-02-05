/**
 * 校友相关类型定义
 */

/** 学历类型 */
export type DegreeType = 'bachelor' | 'master' | 'doctor' | 'highschool' | 'middleschool'

/** 学校类型 */
export type SchoolType = 'university' | 'highschool' | 'middleschool'

/** 校友认证状态 */
export enum AlumniStatus {
  Pending = 0,      // 待认证
  Verified = 1,     // 已认证
  Rejected = 2      // 已拒绝
}

/** 隐私可见范围 */
export type PrivacyScope = 'all' | 'classmate' | 'friend' | 'none'

/** 教育经历 */
export interface Education {
  degree: DegreeType
  enrollmentYear: number        // 入学年份
  graduationYear: number        // 毕业年份
  studentId?: string            // 学号
  className?: string            // 班级
  college?: string              // 学院（大学专用）
  major?: string                // 专业（大学专用）
  grade?: string                // 年级（中学专用）
  isPrimary: boolean            // 是否主要学历
}

/** 隐私设置 */
export interface PrivacySettings {
  showPhone: PrivacyScope
  showWechat: PrivacyScope
  showEmail: PrivacyScope
  showCompany: PrivacyScope
  showInMap: boolean
}

/** 校友完整信息 */
export interface AlumniProfile {
  _id: string
  avatar: string
  realName: string
  nickname?: string
  gender?: number
  phone?: string

  // 教育信息
  educations: Education[]

  // 职业信息
  company?: string
  position?: string
  industry?: string
  workCity?: string
  workProvince?: string

  // 联系方式
  email?: string
  wechatId?: string

  // 其他
  bio?: string
  tags?: string[]

  // 认证状态
  alumniStatus: AlumniStatus
  alumniVerifyTime?: number
  alumniRejectReason?: string

  // 隐私设置
  privacy?: PrivacySettings

  // 时间
  createTime?: number
  updateTime?: number
}

/** 校友列表项（简化版，用于列表展示） */
export interface AlumniListItem {
  _id: string
  avatar: string
  realName: string
  enrollmentYear?: number
  graduationYear?: number
  college?: string
  major?: string
  industry?: string
  company?: string
  position?: string
  workCity?: string
  tags?: string[]
  isFriend?: boolean
  hasPendingRequest?: boolean
}

/** 搜索参数 */
export interface AlumniSearchParams {
  enrollmentYear?: number
  graduationYear?: number
  industry?: string
  interests?: string[]
  city?: string
  college?: string
  major?: string
  keyword?: string
  lastId?: string
  pageSize?: number
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[]
  total?: number
  hasMore: boolean
  lastId?: string
}

/** 筛选选项 */
export interface FilterOption {
  label: string
  value: string | number
  count?: number
}
