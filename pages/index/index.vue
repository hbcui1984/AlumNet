<template>
  <view class="page-container">
    <!-- 头部区域 -->
    <view class="header">
      <view class="header-decor header-decor-1"></view>
      <view class="header-decor header-decor-2"></view>
      <view class="school-info">
        <image
          class="school-logo"
          :src="schoolConfig.logo || '/static/school-logo.png'"
          mode="aspectFit"
        ></image>
        <view class="school-text">
          <text class="school-name">{{ schoolConfig.appName || '校友会' }}</text>
          <text class="school-slogan">{{ schoolConfig.branding?.slogan || '欢迎回家' }}</text>
        </view>
      </view>
      <view class="user-action" @click="goToProfile">
        <image
          class="user-avatar"
          :src="userInfo.avatar || '/static/default-avatar.png'"
          mode="aspectFill"
        ></image>
      </view>
    </view>

    <!-- 主要内容区域 -->
    <scroll-view class="main-content" scroll-y>
    <view v-if="!isVerified" class="verify-banner" @click="goToVerify">
      <view class="banner-content">
        <uni-icons type="info" size="20" color="#F39C12"></uni-icons>
        <text class="banner-text">完成校友认证，解锁更多功能</text>
      </view>
      <view class="banner-action">
        <text>去认证</text>
        <uni-icons type="arrowright" size="14" color="var(--primary-color)"></uni-icons>
      </view>
    </view>
    <view v-else class="card-banner" @click="goToCard">
      <view class="banner-content">
        <uni-icons type="auth-filled" size="20" color="var(--primary-color)"></uni-icons>
        <text class="banner-text verified-text">已认证校友</text>
      </view>
      <view class="banner-action">
        <text>查看校友卡</text>
        <uni-icons type="arrowright" size="14" color="var(--primary-color)"></uni-icons>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-entry">
      <view class="entry-item" @click="goToAlumniList">
        <view class="entry-icon" style="background: linear-gradient(135deg, rgba(43, 92, 230, 0.06), rgba(43, 92, 230, 0.14));">
          <uni-icons type="contact" size="28" color="var(--primary-color)"></uni-icons>
        </view>
        <text class="entry-text">找校友</text>
      </view>
      <view class="entry-item" @click="goToFriends">
        <view class="entry-icon" style="background: linear-gradient(135deg, rgba(39, 174, 96, 0.06), rgba(39, 174, 96, 0.14));">
          <uni-icons type="person" size="28" color="#27AE60"></uni-icons>
        </view>
        <text class="entry-text">我的好友</text>
        <view v-if="friendRequestCount > 0" class="badge">{{ friendRequestCount }}</view>
      </view>
      <view class="entry-item" @click="goToActivities">
        <view class="entry-icon" style="background: linear-gradient(135deg, rgba(243, 156, 18, 0.06), rgba(243, 156, 18, 0.14));">
          <uni-icons type="calendar" size="28" color="#F39C12"></uni-icons>
        </view>
        <text class="entry-text">校友活动</text>
      </view>
      <view class="entry-item" @click="goToOrganizations">
        <view class="entry-icon" style="background: linear-gradient(135deg, rgba(155, 89, 182, 0.06), rgba(155, 89, 182, 0.14));">
          <uni-icons type="staff" size="28" color="#9B59B6"></uni-icons>
        </view>
        <text class="entry-text">校友组织</text>
      </view>
    </view>

    <!-- 统计数据 -->
    <view class="stats-section">
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-value">{{ statistics.verifiedCount || 0 }}</text>
          <text class="stat-label">认证校友</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-value">{{ statistics.activityCount || 0 }}</text>
          <text class="stat-label">校友活动</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-value">{{ statistics.organizationCount || 0 }}</text>
          <text class="stat-label">校友组织</text>
        </view>
      </view>
    </view>

    <!-- 推荐校友 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">推荐校友</text>
        <view class="section-more" @click="goToAlumniList">
          <text>查看更多</text>
          <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
        </view>
      </view>
      <scroll-view class="alumni-scroll" scroll-x>
        <view
          v-for="item in recommendedAlumni"
          :key="item._id"
          class="alumni-card-mini"
          @click="goToAlumniDetail(item._id)"
        >
          <image
            class="alumni-avatar"
            :src="item.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
          ></image>
          <text class="alumni-name">{{ item.realName || item.nickname || '校友' }}</text>
          <text class="alumni-info">{{ getAlumniInfo(item) }}</text>
        </view>
        <view v-if="recommendedAlumni.length === 0" class="empty-placeholder">
          <text>暂无推荐</text>
        </view>
      </scroll-view>
    </view>

    <!-- 最新活动 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">最新活动</text>
        <view class="section-more" @click="goToActivities">
          <text>查看更多</text>
          <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
        </view>
      </view>
      <view v-if="latestActivities.length > 0" class="activity-list">
        <view
          v-for="activity in latestActivities"
          :key="activity._id"
          class="activity-card"
          @click="goToActivityDetail(activity._id)"
        >
          <image
            class="activity-cover"
            :src="activity.cover || '/static/activity-default.png'"
            mode="aspectFill"
          ></image>
          <view class="activity-info">
            <text class="activity-title">{{ activity.title }}</text>
            <view class="activity-meta">
              <uni-icons type="calendar" size="14" color="#999"></uni-icons>
              <text>{{ formatDate(activity.startTime) }}</text>
            </view>
            <view class="activity-meta">
              <uni-icons type="location" size="14" color="#999"></uni-icons>
              <text>{{ activity.location?.name || '线上活动' }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty-section">
        <text class="empty-text">暂无活动</text>
      </view>
    </view>
    </scroll-view>

    <!-- 自定义TabBar -->
    <custom-tabbar :current="0"></custom-tabbar>
  </view>
</template>

<script>
import { store, mutations } from '@/uni_modules/uni-id-pages/common/store.js'
import customTabbar from '@/components/custom-tabbar/custom-tabbar.vue'

const alumniCo = uniCloud.importObject('alumni-co')
const alumniSearchCo = uniCloud.importObject('alumni-search-co')
const alumniFriendCo = uniCloud.importObject('alumni-friend-co')
const alumniActivityCo = uniCloud.importObject('alumni-activity-co')

export default {
  components: {
    customTabbar
  },
  data() {
    return {
      schoolConfig: {},
      statistics: {},
      recommendedAlumni: [],
      latestActivities: [],
      friendRequestCount: 0
    }
  },
  computed: {
    userInfo() {
      return store.userInfo || {}
    },
    hasLogin() {
      return store.hasLogin
    },
    isVerified() {
      return this.userInfo.alumniStatus === 1
    }
  },
  onLoad() {
    this.loadData()
  },
  onShow() {
    if (this.hasLogin && uniCloud.getCurrentUserInfo().tokenExpired > Date.now()) {
      // 刷新用户状态（含 alumniStatus），确保审核通过后 banner 消失
      mutations.updateUserInfo()
      this.loadFriendRequestCount()
    }
  },
  methods: {
    async loadData() {
      // 加载学校配置
      try {
        const configRes = await alumniCo.getSchoolConfig()
        if (configRes.errCode === 0) {
          this.schoolConfig = configRes.data
        }
      } catch (e) {
        console.error('加载学校配置失败', e)
      }

      // 加载统计数据
      try {
        const statsRes = await alumniSearchCo.getAlumniStatistics()
        if (statsRes.errCode === 0) {
          this.statistics = statsRes.data
        }
      } catch (e) {
        console.error('加载统计数据失败', e)
      }

      // 加载活动统计
      try {
        const activityStatsRes = await alumniActivityCo.getActivityStatistics()
        if (activityStatsRes.errCode === 0) {
          this.statistics = { ...this.statistics, ...activityStatsRes.data }
        }
      } catch (e) {
        console.error('加载活动统计失败', e)
      }

      // 加载最新活动
      this.loadLatestActivities()

      // 如果已登录且token未过期，加载更多数据
      if (this.hasLogin && uniCloud.getCurrentUserInfo().tokenExpired > Date.now()) {
        this.loadRecommendedAlumni()
        this.loadFriendRequestCount()
      }
    },
    async loadRecommendedAlumni() {
      try {
        const res = await alumniSearchCo.searchAlumni({ pageSize: 10 })
        if (res.errCode === 0) {
          this.recommendedAlumni = res.data.list
        }
      } catch (e) {
        console.error('加载推荐校友失败', e)
      }
    },
    async loadFriendRequestCount() {
      try {
        const res = await alumniFriendCo.getPendingRequestCount()
        if (res.errCode === 0) {
          this.friendRequestCount = res.data.count
        }
      } catch (e) {
        console.error('加载好友请求数量失败', e)
      }
    },
    async loadLatestActivities() {
      try {
        const res = await alumniActivityCo.getActivityList({
          status: 1,
          pageNum: 1,
          pageSize: 3
        })
        if (res.errCode === 0) {
          this.latestActivities = res.data.list
        }
      } catch (e) {
        console.error('加载最新活动失败', e)
      }
    },
    getAlumniInfo(alumni) {
      if (alumni.primaryEducation) {
        return `${alumni.primaryEducation.enrollmentYear}级`
      }
      if (alumni.currentCompany) {
        return alumni.currentCompany
      }
      return ''
    },
    formatDate(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return `${date.getMonth() + 1}月${date.getDate()}日`
    },
    goToProfile() {
      if (!this.hasLogin) {
        uni.navigateTo({
          url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
        })
        return
      }
      uni.navigateTo({
        url: '/pages/ucenter/ucenter'
      })
    },
    goToVerify() {
      uni.navigateTo({
        url: '/pages/alumni/verify/verify'
      })
    },
    goToCard() {
      uni.navigateTo({
        url: '/pages/alumni/card/card'
      })
    },
    goToAlumniList() {
      uni.switchTab({
        url: '/pages/alumni/list/list'
      })
    },
    goToFriends() {
      uni.navigateTo({
        url: '/pages/alumni/friends/friends'
      })
    },
    goToActivities() {
      uni.navigateTo({
        url: '/pages/activity/list'
      })
    },
    goToOrganizations() {
      uni.navigateTo({
        url: '/pages/alumni/organizations/list'
      })
    },
    goToActivityDetail(id) {
      uni.navigateTo({
        url: `/pages/activity/detail?id=${id}`
      })
    },
    goToAlumniDetail(id) {
      uni.navigateTo({
        url: `/pages/alumni/detail/detail?id=${id}`
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: var(--bg-page);
}

.main-content {
  height: calc(100vh - 140rpx - env(safe-area-inset-top));
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 50%, var(--primary-light) 100%);
  min-height: 160rpx;
  position: relative;
  overflow: hidden;
}

.header-decor {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.06);
}

.header-decor-1 {
  width: 300rpx;
  height: 300rpx;
  top: -100rpx;
  right: -60rpx;
}

.header-decor-2 {
  width: 200rpx;
  height: 200rpx;
  bottom: -80rpx;
  left: -40rpx;
}

.school-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  z-index: 1;
}

.school-logo {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background-color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

.school-text {
  margin-left: 20rpx;
}

.school-name {
  font-size: 38rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.school-slogan {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  display: block;
  margin-top: 4rpx;
  letter-spacing: 2rpx;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.08);
}

.user-action {
  padding: 8rpx;
  position: relative;
  z-index: 1;
}

.user-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.12);
}

.verify-banner {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin: 20rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #FFF9E6, #FFF3CC);
  border-radius: 12rpx;
  border: 1rpx solid rgba(243, 156, 18, 0.3);
  box-shadow: 0 2rpx 8rpx rgba(243, 156, 18, 0.08);
}

.banner-content {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.banner-text {
  font-size: 26rpx;
  color: #333;
  margin-left: 12rpx;
}

.banner-action {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 26rpx;
  color: var(--primary-color);
}

.card-banner {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin: 20rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #EEF2FF, #E0E8FF);
  border-radius: 12rpx;
  border: 1rpx solid rgba(43, 92, 230, 0.2);
  box-shadow: 0 2rpx 8rpx rgba(43, 92, 230, 0.08);
}

.verified-text {
  color: var(--primary-color);
}

.quick-entry {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  padding: 30rpx 20rpx;
  margin: 20rpx;
  background-color: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.entry-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.entry-text {
  font-size: 24rpx;
  color: #333;
}

.badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  padding: 0 8rpx;
  background-color: #E74C3C;
  border-radius: 18rpx;
  font-size: 22rpx;
  color: #fff;
  text-align: center;
}

.stats-section {
  margin: 20rpx;
}

.stats-card {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  padding: 30rpx;
  background: linear-gradient(135deg, #f0f4ff, #e8eeff);
  border-radius: 16rpx;
  border-left: 6rpx solid var(--primary-color);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 44rpx;
  font-weight: bold;
  color: var(--primary-color);
}

.stat-label {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background-color: rgba(43, 92, 230, 0.15);
}

.section {
  margin: 20rpx;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  border-left: 6rpx solid var(--primary-color);
  padding-left: 16rpx;
}

.section-more {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 26rpx;
  color: #999;
}

.alumni-scroll {
  white-space: nowrap;
}

.alumni-card-mini {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 160rpx;
  margin-right: 20rpx;
  padding: 16rpx 8rpx;
  background-color: #fafbff;
  border-radius: 12rpx;
}

.alumni-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  margin-bottom: 12rpx;
  border: 3rpx solid rgba(43, 92, 230, 0.15);
}

.alumni-name {
  font-size: 26rpx;
  color: #333;
  margin-bottom: 4rpx;
  max-width: 160rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alumni-info {
  font-size: 22rpx;
  color: #999;
}

.empty-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 200rpx;
  height: 120rpx;
  color: #999;
  font-size: 26rpx;
}

.activity-list {
  /* empty */
}

.activity-card {
  display: flex;
  flex-direction: row;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.activity-cover {
  width: 180rpx;
  height: 120rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
}

.activity-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.activity-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
}

.activity-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 24rpx;
  color: #999;

  text {
    margin-left: 8rpx;
  }
}

.empty-section {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}
</style>
