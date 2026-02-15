/**
 * 校友组织云对象
 * @description 处理组织创建、成员管理、审批等业务逻辑
 */
const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

const DEFAULT_PAGE_SIZE = 20

const ORG_TYPES = ['regional', 'industry', 'college', 'interest']

/**
 * 检查是否已登录
 * @param {string} uid
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
 * 检查组织管理权限（creator 或 admin）
 * @param {string} organizationId
 * @param {string} uid
 * @returns {Promise<Object>} 成员记录
 */
async function checkAdminPermission(organizationId, uid) {
	const memberRes = await db.collection('alumni-organization-members').where({
		organizationId,
		userId: uid,
		role: dbCmd.in(['creator', 'admin']),
		status: 1
	}).get()

	if (!memberRes.data || memberRes.data.length === 0) {
		throw {
			errCode: 'NO_PERMISSION',
			errMsg: '无管理权限'
		}
	}
	return memberRes.data[0]
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
	 * 获取组织列表
	 * @param {Object} params
	 * @param {string} [params.type] - 组织类型筛选
	 * @param {string} [params.keyword] - 搜索关键词
	 * @param {number} [params.pageSize] - 每页数量
	 * @param {string} [params.cursor] - 游标
	 * @returns {Promise<Object>}
	 */
	async getList({ type, keyword, pageSize = DEFAULT_PAGE_SIZE, cursor } = {}) {
		const limit = Math.min(Math.max(1, pageSize), 50)

		const matchConditions = { status: 1 }

		if (type && ORG_TYPES.includes(type)) {
			matchConditions.type = type
		}

		if (keyword) {
			matchConditions.name = new RegExp(keyword, 'i')
		}

		if (cursor) {
			matchConditions._id = dbCmd.lt(cursor)
		}

		const res = await db.collection('alumni-organizations')
			.aggregate()
			.match(matchConditions)
			.sort({ createTime: -1 })
			.limit(limit + 1)
			.lookup({
				from: 'uni-id-users',
				localField: 'creatorId',
				foreignField: '_id',
				as: 'creator'
			})
			.project({
				name: 1,
				type: 1,
				logo: 1,
				description: 1,
				memberCount: 1,
				activityCount: 1,
				region: 1,
				industry: 1,
				college: 1,
				interest: 1,
				createTime: 1,
				'creator._id': 1,
				'creator.realName': 1,
				'creator.nickname': 1
			})
			.end()

		const data = res.data || []
		const hasMore = data.length > limit
		const list = hasMore ? data.slice(0, limit) : data
		const nextCursor = list.length > 0 ? list[list.length - 1]._id : null

		const processedList = list.map(item => ({
			...item,
			creator: item.creator?.[0] || null
		}))

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
	 * 获取组织详情
	 * @param {string} id - 组织ID
	 * @returns {Promise<Object>}
	 */
	async getDetail(id) {
		if (!id) {
			throw { errCode: 'INVALID_PARAM', errMsg: '请指定组织ID' }
		}

		const orgRes = await db.collection('alumni-organizations').doc(id).get()
		if (!orgRes.data || orgRes.data.length === 0) {
			throw { errCode: 'NOT_FOUND', errMsg: '组织不存在' }
		}

		const org = orgRes.data[0]

		// 查询创建者信息
		const creatorRes = await db.collection('uni-id-users').doc(org.creatorId).field({
			_id: 1, avatar: 1, realName: 1, nickname: 1
		}).get()

		org.creator = creatorRes.data?.[0] || null

		// 查询当前用户的成员状态
		let myMember = null
		if (this.uid) {
			const memberRes = await db.collection('alumni-organization-members').where({
				organizationId: id,
				userId: this.uid,
				status: dbCmd.in([0, 1])
			}).get()
			myMember = memberRes.data?.[0] || null
		}

		// 查询前6个成员头像
		const membersRes = await db.collection('alumni-organization-members')
			.aggregate()
			.match({ organizationId: id, status: 1 })
			.sort({ role: 1, joinTime: 1 })
			.limit(6)
			.lookup({
				from: 'uni-id-users',
				localField: 'userId',
				foreignField: '_id',
				as: 'user'
			})
			.project({
				userId: 1,
				role: 1,
				'user._id': 1,
				'user.avatar': 1,
				'user.realName': 1,
				'user.nickname': 1
			})
			.end()

		const previewMembers = (membersRes.data || []).map(m => ({
			...m,
			user: m.user?.[0] || null
		}))

		// 管理员可见：待审核列表
		let pendingRequests = []
		if (myMember && ['creator', 'admin'].includes(myMember.role) && myMember.status === 1) {
			const pendingRes = await db.collection('alumni-organization-members')
				.aggregate()
				.match({ organizationId: id, status: 0 })
				.sort({ createTime: -1 })
				.limit(20)
				.lookup({
					from: 'uni-id-users',
					localField: 'userId',
					foreignField: '_id',
					as: 'user'
				})
				.project({
					userId: 1,
					createTime: 1,
					'user._id': 1,
					'user.avatar': 1,
					'user.realName': 1,
					'user.nickname': 1
				})
				.end()

			pendingRequests = (pendingRes.data || []).map(m => ({
				...m,
				user: m.user?.[0] || null
			}))
		}

		return {
			errCode: 0,
			data: {
				...org,
				myMember,
				previewMembers,
				pendingRequests
			}
		}
	},

	/**
	 * 创建组织
	 * @param {Object} data - 组织信息
	 * @returns {Promise<Object>}
	 */
	async create(data) {
		checkLogin(this.uid)

		const { name, type, logo, cover, description, region, industry, college, interest } = data || {}

		if (!name || !name.trim()) {
			throw { errCode: 'INVALID_PARAM', errMsg: '请输入组织名称' }
		}
		if (!type || !ORG_TYPES.includes(type)) {
			throw { errCode: 'INVALID_PARAM', errMsg: '请选择组织类型' }
		}

		// 检查同名组织
		const existRes = await db.collection('alumni-organizations').where({
			name: name.trim(),
			status: dbCmd.in([0, 1])
		}).count()
		if (existRes.total > 0) {
			throw { errCode: 'NAME_EXISTS', errMsg: '该组织名称已存在' }
		}

		const now = Date.now()
		const orgData = {
			name: name.trim(),
			type,
			logo: logo || '',
			cover: cover || '',
			description: description || '',
			announcement: '',
			creatorId: this.uid,
			memberCount: 1,
			activityCount: 0,
			status: 1,
			createTime: now,
			updateTime: now
		}

		// 类型专属字段
		if (type === 'regional' && region) {
			orgData.region = region
		}
		if (type === 'industry' && industry) {
			orgData.industry = industry
		}
		if (type === 'college' && college) {
			orgData.college = college
		}
		if (type === 'interest' && interest) {
			orgData.interest = interest
		}

		const transaction = await db.startTransaction()
		try {
			const orgAddRes = await transaction.collection('alumni-organizations').add(orgData)
			const orgId = orgAddRes.id

			// 创建者自动成为 creator 角色成员
			await transaction.collection('alumni-organization-members').add({
				organizationId: orgId,
				userId: this.uid,
				role: 'creator',
				status: 1,
				joinTime: now,
				createTime: now,
				updateTime: now
			})

			await transaction.commit()

			return {
				errCode: 0,
				errMsg: '创建成功',
				data: { id: orgId }
			}
		} catch (e) {
			await transaction.rollback()
			throw { errCode: 'SYSTEM_ERROR', errMsg: '创建失败，请重试' }
		}
	},

	/**
	 * 更新组织信息（仅 creator/admin）
	 * @param {string} id - 组织ID
	 * @param {Object} data - 更新数据
	 * @returns {Promise<Object>}
	 */
	async update(id, data) {
		checkLogin(this.uid)

		if (!id) {
			throw { errCode: 'INVALID_PARAM', errMsg: '请指定组织ID' }
		}

		await checkAdminPermission(id, this.uid)

		const allowedFields = ['name', 'logo', 'cover', 'description', 'announcement', 'region', 'industry', 'college', 'interest']
		const updateData = { updateTime: Date.now() }

		for (const key of allowedFields) {
			if (data[key] !== undefined) {
				updateData[key] = data[key]
			}
		}

		// 名称唯一性检查
		if (updateData.name) {
			const existRes = await db.collection('alumni-organizations').where({
				name: updateData.name.trim(),
				_id: dbCmd.neq(id),
				status: dbCmd.in([0, 1])
			}).count()
			if (existRes.total > 0) {
				throw { errCode: 'NAME_EXISTS', errMsg: '该组织名称已存在' }
			}
			updateData.name = updateData.name.trim()
		}

		await db.collection('alumni-organizations').doc(id).update(updateData)

		return { errCode: 0, errMsg: '更新成功' }
	},

	/**
	 * 申请加入组织
	 * @param {string} organizationId
	 * @returns {Promise<Object>}
	 */
	async join(organizationId) {
		checkLogin(this.uid)

		if (!organizationId) {
			throw { errCode: 'INVALID_PARAM', errMsg: '请指定组织' }
		}

		// 检查组织是否存在且正常
		const orgRes = await db.collection('alumni-organizations').doc(organizationId).field({ status: 1 }).get()
		if (!orgRes.data || orgRes.data.length === 0 || orgRes.data[0].status !== 1) {
			throw { errCode: 'NOT_FOUND', errMsg: '组织不存在或已解散' }
		}

		// 检查是否已有记录
		const existRes = await db.collection('alumni-organization-members').where({
			organizationId,
			userId: this.uid,
			status: dbCmd.in([0, 1])
		}).get()

		if (existRes.data && existRes.data.length > 0) {
			const existing = existRes.data[0]
			if (existing.status === 0) {
				throw { errCode: 'ALREADY_PENDING', errMsg: '您已提交申请，请等待审核' }
			}
			if (existing.status === 1) {
				throw { errCode: 'ALREADY_MEMBER', errMsg: '您已是该组织成员' }
			}
		}

		const now = Date.now()
		await db.collection('alumni-organization-members').add({
			organizationId,
			userId: this.uid,
			role: 'member',
			status: 0,
			createTime: now,
			updateTime: now
		})

		return { errCode: 0, errMsg: '申请已提交，等待审核' }
	},

	/**
	 * 退出组织（creator 不可退出）
	 * @param {string} organizationId
	 * @returns {Promise<Object>}
	 */
	async leave(organizationId) {
		checkLogin(this.uid)

		if (!organizationId) {
			throw { errCode: 'INVALID_PARAM', errMsg: '请指定组织' }
		}

		const memberRes = await db.collection('alumni-organization-members').where({
			organizationId,
			userId: this.uid,
			status: 1
		}).get()

		if (!memberRes.data || memberRes.data.length === 0) {
			throw { errCode: 'NOT_MEMBER', errMsg: '您不是该组织成员' }
		}

		const member = memberRes.data[0]
		if (member.role === 'creator') {
			throw { errCode: 'CREATOR_CANNOT_LEAVE', errMsg: '创建者不能退出组织' }
		}

		const transaction = await db.startTransaction()
		try {
			await transaction.collection('alumni-organization-members').doc(member._id).update({
				status: 2,
				updateTime: Date.now()
			})

			await transaction.collection('alumni-organizations').doc(organizationId).update({
				memberCount: dbCmd.inc(-1),
				updateTime: Date.now()
			})

			await transaction.commit()
			return { errCode: 0, errMsg: '已退出组织' }
		} catch (e) {
			await transaction.rollback()
			throw { errCode: 'SYSTEM_ERROR', errMsg: '操作失败，请重试' }
		}
	},

	/**
	 * 获取成员列表
	 * @param {Object} params
	 * @param {string} params.organizationId
	 * @param {string} [params.role] - 角色筛选
	 * @param {number} [params.pageSize]
	 * @param {string} [params.cursor]
	 * @returns {Promise<Object>}
	 */
	async getMembers({ organizationId, role, pageSize = DEFAULT_PAGE_SIZE, cursor } = {}) {
		if (!organizationId) {
			throw { errCode: 'INVALID_PARAM', errMsg: '请指定组织' }
		}

		const limit = Math.min(Math.max(1, pageSize), 50)

		const matchConditions = {
			organizationId,
			status: 1
		}

		if (role && ['creator', 'admin', 'member'].includes(role)) {
			matchConditions.role = role
		}

		if (cursor) {
			matchConditions._id = dbCmd.gt(cursor)
		}

		const res = await db.collection('alumni-organization-members')
			.aggregate()
			.match(matchConditions)
			.sort({ role: 1, joinTime: 1 })
			.limit(limit + 1)
			.lookup({
				from: 'uni-id-users',
				localField: 'userId',
				foreignField: '_id',
				as: 'user'
			})
			.project({
				userId: 1,
				role: 1,
				title: 1,
				joinTime: 1,
				'user._id': 1,
				'user.avatar': 1,
				'user.realName': 1,
				'user.nickname': 1,
				'user.currentCompany': 1,
				'user.currentPosition': 1
			})
			.end()

		const data = res.data || []
		const hasMore = data.length > limit
		const list = hasMore ? data.slice(0, limit) : data
		const nextCursor = list.length > 0 ? list[list.length - 1]._id : null

		const processedList = list.map(m => ({
			...m,
			user: m.user?.[0] || null
		}))

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
	 * 获取我加入的组织列表
	 * @returns {Promise<Object>}
	 */
	async getMyOrganizations() {
		checkLogin(this.uid)

		const memberRes = await db.collection('alumni-organization-members').where({
			userId: this.uid,
			status: 1
		}).field({
			organizationId: 1,
			role: 1,
			joinTime: 1
		}).orderBy('joinTime', 'desc').get()

		const members = memberRes.data || []
		if (members.length === 0) {
			return { errCode: 0, data: { list: [] } }
		}

		const orgIds = members.map(m => m.organizationId)
		const orgRes = await db.collection('alumni-organizations').where({
			_id: dbCmd.in(orgIds),
			status: 1
		}).field({
			name: 1, type: 1, logo: 1, description: 1, memberCount: 1
		}).get()

		const orgMap = {}
		for (const org of (orgRes.data || [])) {
			orgMap[org._id] = org
		}

		const list = members
			.map(m => {
				const org = orgMap[m.organizationId]
				if (!org) return null
				return { ...org, myRole: m.role, joinTime: m.joinTime }
			})
			.filter(Boolean)

		return { errCode: 0, data: { list } }
	},

	/**
	 * 审批加入申请（仅 creator/admin）
	 * @param {Object} params
	 * @param {string} params.memberId - 成员记录ID
	 * @param {string} params.action - approve/reject
	 * @returns {Promise<Object>}
	 */
	async handleJoinRequest({ memberId, action }) {
		checkLogin(this.uid)

		if (!memberId) {
			throw { errCode: 'INVALID_PARAM', errMsg: '请指定申请记录' }
		}
		if (!['approve', 'reject'].includes(action)) {
			throw { errCode: 'INVALID_PARAM', errMsg: '操作类型无效' }
		}

		const memberRes = await db.collection('alumni-organization-members').doc(memberId).get()
		if (!memberRes.data || memberRes.data.length === 0) {
			throw { errCode: 'NOT_FOUND', errMsg: '申请记录不存在' }
		}

		const member = memberRes.data[0]
		if (member.status !== 0) {
			throw { errCode: 'ALREADY_PROCESSED', errMsg: '该申请已处理' }
		}

		// 检查管理权限
		await checkAdminPermission(member.organizationId, this.uid)

		const now = Date.now()

		if (action === 'approve') {
			const transaction = await db.startTransaction()
			try {
				await transaction.collection('alumni-organization-members').doc(memberId).update({
					status: 1,
					joinTime: now,
					updateTime: now
				})

				await transaction.collection('alumni-organizations').doc(member.organizationId).update({
					memberCount: dbCmd.inc(1),
					updateTime: now
				})

				await transaction.commit()
				return { errCode: 0, errMsg: '已通过申请' }
			} catch (e) {
				await transaction.rollback()
				throw { errCode: 'SYSTEM_ERROR', errMsg: '操作失败，请重试' }
			}
		} else {
			await db.collection('alumni-organization-members').doc(memberId).update({
				status: 3,
				updateTime: now
			})
			return { errCode: 0, errMsg: '已拒绝申请' }
		}
	}
}
