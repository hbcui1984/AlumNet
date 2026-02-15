<template>
  <view class="page-container">
    <scroll-view class="main-content" scroll-y>
      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrap">
        <uni-load-more status="loading"></uni-load-more>
      </view>

      <template v-else-if="org">
        <!-- 头部 -->
        <view class="header" :style="headerStyle">
          <view class="header-overlay"></view>
          <view class="header-content">
            <image
              class="org-logo"
              :src="org.logo || '/static/default-avatar.png'"
              mode="aspectFill"
            ></image>
            <text class="org-name">{{ org.name }}</text>
            <text class="org-type-tag">{{ typeLabel(org.type) }}</text>
          </view>
        </view>

        <!-- 公告 -->
        <view v-if="org.announcement" class="section announcement-section">
          <view class="section-header">
            <uni-icons type="sound" size="18" color="#F39C12"></uni-icons>
            <text class="section-title-sm">公告</text>
          </view>
          <text class="announcement-text">{{ org.announcement }}</text>
        </view>

        <!-- 简介 & 统计 -->
        <view class="section">
          <text class="section-title">组织简介</text>
          <text class="desc-text">{{ org.description || '暂无简介' }}</text>
          <view class="type-info" v-if="typeExtraText">
            <uni-icons :type="typeExtraIcon" size="14" color="#999"></uni-icons>
            <text>{{ typeExtraText }}</text>
          </view>
          <view class="stats-row">
            <view class="stat-item">
              <text class="stat-value">{{ org.memberCount || 0 }}</text>
              <text class="stat-label">成员</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ org.activityCount || 0 }}</text>
              <text class="stat-label">活动</text>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="action-section">
          <button v-if="!org.myMember" class="action-btn primary-btn" @click="joinOrg">申请加入</button>
          <button v-else-if="org.myMember.status === 0" class="action-btn disabled-btn" disabled>审核中</button>
          <template v-else-if="org.myMember.status === 1">
            <button v-if="isAdmin" class="action-btn primary-btn" @click="goToEdit">管理组织</button>
            <button v-if="org.myMember.role !== 'creator'" class="action-btn danger-btn" @click="leaveOrg">退出组织</button>
          </template>
        </view>

        <!-- 成员预览 -->
        <view class="section">
          <view class="section-header-row">
            <text class="section-title">成员</text>
            <view class="section-more" @click="viewAllMembers">
              <text>查看全部</text>
              <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
            </view>
          </view>
          <view v-if="org.previewMembers && org.previewMembers.length > 0" class="member-preview">
            <view
              v-for="member in org.previewMembers"
              :key="member._id"
              class="member-avatar-item"
              @click="goToUserDetail(member.userId)"
            >
              <image
                class="member-avatar"
                :src="member.user?.avatar || '/static/default-avatar.png'"
                mode="aspectFill"
              ></image>
              <text class="member-name">{{ member.user?.realName || member.user?.nickname || '校友' }}</text>
              <text v-if="member.role === 'creator'" class="role-tag creator-tag">创建者</text>
              <text v-else-if="member.role === 'admin'" class="role-tag admin-tag">管理员</text>
            </view>
          </view>
          <view v-else class="empty-inline">
            <text>暂无成员</text>
          </view>
        </view>

        <!-- 待审核申请（管理员可见） -->
        <view v-if="isAdmin && org.pendingRequests && org.pendingRequests.length > 0" class="section">
          <text class="section-title">待审核申请</text>
          <view
            v-for="req in org.pendingRequests"
            :key="req._id"
            class="pending-item"
          >
            <view class="pending-main" @click="goToUserDetail(req.userId)">
              <image
                class="avatar-sm"
                :src="req.user?.avatar || '/static/default-avatar.png'"
                mode="aspectFill"
              ></image>
              <text class="pending-name">{{ req.user?.realName || req.user?.nickname || '校友' }}</text>
            </view>
            <view class="pending-actions">
              <button class="reject-btn" @click="handleRequest(req._id, 'reject')">拒绝</button>
              <button class="approve-btn" @click="handleRequest(req._id, 'approve')">通过</button>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script>
const orgCo = uniCloud.importObject('alumni-organization-co')

const TYPE_LABELS = {
  regional: '地方分会',
  industry: '行业分会',
  college: '院系分会',
  interest: '兴趣分会'
}

export default {
  data() {
    return {
      orgId: '',
      org: null,
      loading: true
    }
  },
  computed: {
    isAdmin() {
      const m = this.org?.myMember
      return m && ['creator', 'admin'].includes(m.role) && m.status === 1
    },
    headerStyle() {
      if (this.org?.cover) {
        return `background-image: url(${this.org.cover});`
      }
      return ''
    },
    typeExtraText() {
      if (!this.org) return ''
      switch (this.org.type) {
        case 'regional':
          if (this.org.region) {
            return [this.org.region.province, this.org.region.city, this.org.region.district].filter(Boolean).join(' ')
          }
          return ''
        case 'industry': return this.org.industry || ''
        case 'college': return this.org.college || ''
        case 'interest': return this.org.interest || ''
        default: return ''
      }
    },
    typeExtraIcon() {
      switch (this.org?.type) {
        case 'regional': return 'location'
        case 'industry': return 'shop'
        case 'college': return 'flag'
        case 'interest': return 'heart'
        default: return 'info'
      }
    }
  },
  onLoad(options) {
    this.orgId = options.id
    this.loadDetail()
  },
  methods: {
    typeLabel(type) {
      return TYPE_LABELS[type] || type
    },
    async loadDetail() {
      this.loading = true
      try {
        const res = await orgCo.getDetail(this.orgId)
        if (res.errCode === 0) {
          this.org = res.data
        } else {
          uni.showToast({ title: res.errMsg || '加载失败', icon: 'none' })
        }
      } catch (e) {
        console.error('加载组织详情失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async joinOrg() {
      uni.showLoading({ title: '提交中' })
      try {
        const res = await orgCo.join(this.orgId)
        uni.hideLoading()
        if (res.errCode === 0) {
          uni.showToast({ title: res.errMsg, icon: 'success' })
          this.loadDetail()
        } else {
          uni.showToast({ title: res.errMsg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.errMsg || '操作失败', icon: 'none' })
      }
    },
    async leaveOrg() {
      uni.showModal({
        title: '退出组织',
        content: '确定要退出该组织吗？',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中' })
            try {
              const result = await orgCo.leave(this.orgId)
              uni.hideLoading()
              if (result.errCode === 0) {
                uni.showToast({ title: '已退出', icon: 'success' })
                this.loadDetail()
              } else {
                uni.showToast({ title: result.errMsg || '操作失败', icon: 'none' })
              }
            } catch (e) {
              uni.hideLoading()
              uni.showToast({ title: e.errMsg || '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    async handleRequest(memberId, action) {
      uni.showLoading({ title: '处理中' })
      try {
        const res = await orgCo.handleJoinRequest({ memberId, action })
        uni.hideLoading()
        if (res.errCode === 0) {
          uni.showToast({ title: res.errMsg, icon: 'success' })
          this.loadDetail()
        } else {
          uni.showToast({ title: res.errMsg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.errMsg || '操作失败', icon: 'none' })
      }
    },
    goToEdit() {
      uni.navigateTo({
        url: `/pages/alumni/organizations/create?id=${this.orgId}`
      })
    },
    goToUserDetail(userId) {
      uni.navigateTo({
        url: `/pages/alumni/detail/detail?id=${userId}`
      })
    },
    viewAllMembers() {
      // 暂用 toast 提示，后续可扩展独立成员列表页
      uni.showToast({ title: '功能开发中', icon: 'none' })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.main-content {
  height: 100vh;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.header {
  position: relative;
  min-height: 320rpx;
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 50%, var(--primary-light) 100%);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

.org-logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.5);
  margin-bottom: 16rpx;
}

.org-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 12rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.2);
}

.org-type-tag {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  background-color: rgba(255, 255, 255, 0.2);
  padding: 4rpx 20rpx;
  border-radius: 20rpx;
}

.section {
  margin: 20rpx;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.announcement-section {
  background-color: #FFFBF0;
  border: 1rpx solid rgba(243, 156, 18, 0.2);
}

.section-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 12rpx;
}

.section-title-sm {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-left: 8rpx;
}

.announcement-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.desc-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  display: block;
}

.type-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #999;

  text {
    margin-left: 8rpx;
  }
}

.stats-row {
  display: flex;
  flex-direction: row;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0f0f0;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: var(--primary-color);
}

.stat-label {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}

.action-section {
  display: flex;
  flex-direction: row;
  padding: 0 20rpx;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  font-size: 30rpx;
  border-radius: 40rpx;
  border: none;

  &::after {
    border: none;
  }
}

.primary-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: #fff;
}

.disabled-btn {
  background-color: #e0e0e0;
  color: #999;
}

.danger-btn {
  background-color: #fff;
  color: #E74C3C;
  border: 1rpx solid #E74C3C;
}

.section-header-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-more {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 26rpx;
  color: #999;
}

.member-preview {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 24rpx;
}

.member-avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100rpx;
}

.member-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-bottom: 8rpx;
}

.member-name {
  font-size: 22rpx;
  color: #666;
  max-width: 100rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-tag {
  font-size: 20rpx;
  padding: 0 8rpx;
  border-radius: 4rpx;
  margin-top: 4rpx;
}

.creator-tag {
  color: #E67E22;
  background-color: rgba(230, 126, 34, 0.1);
}

.admin-tag {
  color: #2980B9;
  background-color: rgba(41, 128, 185, 0.1);
}

.empty-inline {
  text-align: center;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #999;
}

.pending-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.pending-main {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
}

.avatar-sm {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.pending-name {
  font-size: 28rpx;
  color: #333;
}

.pending-actions {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}

.reject-btn,
.approve-btn {
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 28rpx;
  font-size: 24rpx;
  border-radius: 28rpx;
  border: none;

  &::after {
    border: none;
  }
}

.reject-btn {
  background-color: #f5f5f5;
  color: #666;
}

.approve-btn {
  background-color: var(--primary-color);
  color: #fff;
}
</style>
