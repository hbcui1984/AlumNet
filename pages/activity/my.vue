<template>
  <view class="my-activity-page">
    <!-- 标签切换 -->
    <view class="tabs">
      <view 
        v-for="(tab, index) in tabs" 
        :key="index"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="onTabChange(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 活动列表 -->
    <scroll-view 
      class="activity-scroll"
      scroll-y
      @scrolltolower="loadMore"
      :lower-threshold="50"
    >
      <view v-if="activityList.length > 0" class="activity-list">
        <view 
          v-for="activity in activityList" 
          :key="activity._id"
          class="activity-item"
          @click="goToDetail(activity._id)"
        >
          <image 
            class="activity-cover" 
            :src="activity.cover || '/static/logo.png'"
            mode="aspectFill"
          ></image>
          <view class="activity-content">
            <view class="activity-header">
              <text class="activity-title">{{ activity.title }}</text>
              <view v-if="currentTab === 'signed'" class="signup-status" :class="'signup-' + activity.signupStatus">
                <text>{{ getSignupStatusText(activity.signupStatus) }}</text>
              </view>
              <view v-else class="activity-status" :class="'status-' + activity.status">
                <text>{{ getStatusText(activity.status) }}</text>
              </view>
            </view>
            <view class="activity-info">
              <view class="info-item">
                <uni-icons type="calendar" size="14" color="#999"></uni-icons>
                <text>{{ formatDate(activity.startTime) }}</text>
              </view>
              <view class="info-item">
                <uni-icons type="location" size="14" color="#999"></uni-icons>
                <text>{{ getLocationText(activity) }}</text>
              </view>
            </view>
            <view class="activity-meta">
              <view class="meta-item">
                <uni-icons type="person" size="14" color="#999"></uni-icons>
                <text>{{ activity.currentParticipants || 0 }}人报名</text>
              </view>
              <view v-if="currentTab === 'signed' && activity.signupTime" class="meta-item">
                <text class="signup-time">报名于 {{ formatSignupTime(activity.signupTime) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading" class="empty-state">
        <image class="empty-icon" src="/static/uni-load-state/disconnection.png" mode="aspectFit"></image>
        <text class="empty-text">{{ currentTab === 'signed' ? '暂无报名记录' : '暂未发布活动' }}</text>
        <button v-if="currentTab === 'published'" class="empty-btn" @click="goToPublish">发布活动</button>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <uni-load-more status="loading"></uni-load-more>
      </view>
      <view v-else-if="!hasMore && activityList.length > 0" class="loading-state">
        <uni-load-more status="noMore"></uni-load-more>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      currentTab: 'signed',
      tabs: [
        { label: '我报名的', value: 'signed' },
        { label: '我发布的', value: 'published' }
      ],
      activityList: [],
      pageNum: 1,
      pageSize: 10,
      hasMore: true,
      loading: false
    }
  },
  onLoad() {
    this.loadActivityList()
  },
  onShow() {
    // 从详情页返回时刷新列表
    this.pageNum = 1
    this.activityList = []
    this.hasMore = true
    this.loadActivityList()
  },
  onPullDownRefresh() {
    this.pageNum = 1
    this.activityList = []
    this.hasMore = true
    this.loadActivityList().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    async loadActivityList() {
      if (this.loading || !this.hasMore) return
      
      this.loading = true
      try {
        const activityCo = uniCloud.importObject('alumni-activity-co')
        const res = await activityCo.getMyActivities({
          type: this.currentTab,
          pageNum: this.pageNum,
          pageSize: this.pageSize
        })
        
        if (res.errCode === 0) {
          if (this.pageNum === 1) {
            this.activityList = res.data.list
          } else {
            this.activityList = [...this.activityList, ...res.data.list]
          }
          this.hasMore = res.data.hasMore
        } else {
          uni.showToast({ title: res.errMsg, icon: 'none' })
        }
      } catch (e) {
        console.error('加载活动列表失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.pageNum++
        this.loadActivityList()
      }
    },
    onTabChange(value) {
      this.currentTab = value
      this.pageNum = 1
      this.activityList = []
      this.hasMore = true
      this.loadActivityList()
    },
    getStatusText(status) {
      const statusMap = {
        0: '草稿',
        1: '报名中',
        2: '报名结束',
        3: '进行中',
        4: '已结束',
        5: '已取消'
      }
      return statusMap[status] || '未知'
    },
    getSignupStatusText(status) {
      const statusMap = {
        0: '已报名',
        1: '已签到',
        '-1': '已取消'
      }
      return statusMap[status] || '未知'
    },
    getLocationText(activity) {
      if (activity.type === 'online') {
        return '线上活动'
      }
      return activity.location?.name || '待定'
    },
    formatDate(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    },
    formatSignupTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${month}-${day}`
    },
    goToDetail(id) {
      uni.navigateTo({
        url: `/pages/activity/detail?id=${id}`
      })
    },
    goToPublish() {
      uni.navigateTo({
        url: '/pages/activity/publish'
      })
    }
  }
}
</script>

<style scoped>
.my-activity-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.tabs {
  display: flex;
  flex-direction: row;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  font-size: 15px;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: #2B5CE6;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background-color: #2B5CE6;
  border-radius: 2px;
}

.activity-scroll {
  flex: 1;
  padding: 10px;
}

.activity-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  flex-direction: row;
  background-color: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.activity-cover {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.activity-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 12px;
  justify-content: space-between;
}

.activity-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.activity-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 22px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.activity-status,
.signup-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 8px;
  flex-shrink: 0;
}

.status-1 {
  background-color: #e8f5e9;
  color: #4caf50;
}

.status-2 {
  background-color: #fff3e0;
  color: #ff9800;
}

.status-3 {
  background-color: #e3f2fd;
  color: #2196f3;
}

.status-4 {
  background-color: #f5f5f5;
  color: #999;
}

.signup-0 {
  background-color: #e8f5e9;
  color: #4caf50;
}

.signup-1 {
  background-color: #e3f2fd;
  color: #2196f3;
}

.activity-info {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.info-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.info-item text {
  margin-left: 4px;
}

.activity-meta {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.meta-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.meta-item text {
  margin-left: 4px;
}

.signup-time {
  font-size: 12px;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 120px;
  height: 120px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #999;
  margin-bottom: 20px;
}

.empty-btn {
  padding: 10px 24px;
  border-radius: 20px;
  background-color: #2B5CE6;
  color: #fff;
  font-size: 14px;
  border: none;
}

.loading-state {
  padding: 20px;
}
</style>
