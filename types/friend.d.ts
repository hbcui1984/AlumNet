/**
 * 好友相关类型定义
 */

/** 名片请求状态 */
export enum CardRequestStatus {
  Pending = 0,      // 待处理
  Accepted = 1,     // 已同意
  Rejected = 2,     // 已拒绝
  Expired = 3       // 已过期
}

/** 好友状态 */
export enum FriendStatus {
  Normal = 1,           // 正常
  DeletedByA = 2,       // A删除B
  DeletedByB = 3,       // B删除A
  DeletedBoth = 4       // 双向删除
}

/** 名片交换请求 */
export interface CardRequest {
  _id: string
  fromUserId: string
  toUserId: string
  message?: string
  status: CardRequestStatus
  rejectReason?: string
  handleTime?: number
  expireTime: number
  createTime: number

  // 关联信息（查询时填充）
  fromUser?: {
    _id: string
    avatar: string
    realName: string
    college?: string
    enrollmentYear?: number
    company?: string
    position?: string
  }
  toUser?: {
    _id: string
    avatar: string
    realName: string
    college?: string
    enrollmentYear?: number
    company?: string
    position?: string
  }
}

/** 好友关系 */
export interface FriendRelation {
  _id: string
  userIdA: string
  userIdB: string
  remarkA?: string
  remarkB?: string
  sourceRequestId: string
  status: FriendStatus
  createTime: number
  updateTime: number
}

/** 好友信息（列表展示） */
export interface FriendInfo {
  _id: string               // 好友关系ID
  friendUserId: string      // 好友用户ID
  avatar: string
  realName: string
  remark?: string           // 我给对方的备注
  college?: string
  enrollmentYear?: number
  company?: string
  position?: string
  workCity?: string
  tags?: string[]
  createTime: number        // 成为好友时间
}

/** 好友详情（完整信息，好友才能看到） */
export interface FriendDetail {
  _id: string
  friendUserId: string
  avatar: string
  realName: string
  remark?: string
  gender?: number

  // 教育信息
  college?: string
  major?: string
  enrollmentYear?: number
  graduationYear?: number

  // 职业信息
  company?: string
  position?: string
  industry?: string
  workCity?: string

  // 联系方式（好友可见）
  phone?: string
  wechatId?: string
  email?: string

  // 其他
  bio?: string
  tags?: string[]

  createTime: number
}

/** 好友关系检查结果 */
export interface FriendshipCheckResult {
  isFriend: boolean
  hasPendingRequest: boolean
  pendingRequestId?: string
  pendingRequestType?: 'sent' | 'received'
}
