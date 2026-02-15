<template>
  <view class="activity-list-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <uni-search-bar 
        v-model="keyword" 
        placeholder="搜索活动" 
        @confirm="onSearch"
        @clear="onSearch"
        cancelButton="none"
      ></uni-search-bar>
    </view>

    <!-- 筛选标签 -->
    <scroll-view class="filter-tabs-scroll" scroll-x>
      <view class="filter-tabs">
        <view 
          v-for="(tab, index) in filterTabs" 
          :key="index"
          class="filter-tab"
          :class="{ active: currentFilter === tab.value }"
          @click="onFilterChange(tab.value)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

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
              <view class="activity-status" :class="'status-' + activity.status">
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
                <text v-if="activity.maxParticipants > 0"> / {{ activity.maxParticipants }}人</text>
              </view>
              <view v-if="activity.fee > 0" class="meta-item fee">
                <text>¥{{ activity.fee }}</text>
              </view>
              <view v-else class="meta-item free">
                <text>免费</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading" class="empty-state">
        <image class="empty-icon" src="/static/uni-load-state/disconnection.png" mode="aspectFit"></image>
        <text class="empty-text">暂无活动</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <uni-load-more status="loading"></uni-load-more>
      </view>
      <view v-else-if="!hasMore && activityList.length > 0" class="loading-state">
        <uni-load-more status="noMore"></uni-load-more>
      </view>
    </scroll-view>

    <!-- 发布按钮 -->
    <view class="publish-btn" @click="goToPublish">
      <uni-icons type="plus" size="24" color="#fff"></uni-icons>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      keyword: '',
      currentFilter: null,
      filterTabs: [
        { label: '全部', value: null },
        { label: '报名中', value: 1 },
        { label: '进行中', value: 3 },
        { label: '已结束', value: 4 }
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
        const res = await activityCo.getActivityList({
          status: this.currentFilter,
          keyword: this.keyword,
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
    onSearch() {
      this.pageNum = 1
      this.activityList = []
      this.hasMore = true
      this.loadActivityList()
    },
    onFilterChange(value) {
      this.currentFilter = value
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
.activity-list-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.search-bar {
  background-color: #fff;
  padding: 10px;
}

.filter-tabs-scroll {
  background-color: #fff;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}

.filter-tabs {
  display: inline-block;
  padding: 10px;
  white-space: nowrap;
}

.filter-tab {
  display: inline-block;
  padding: 6px 16px;
  margin-right: 10px;
  border-radius: 20px;
  background-color: #f5f5f5;
  font-size: 14px;
  color: #666;
  vertical-align: middle;
}

.filter-tab.active {
  background-color: var(--primary-color, #2B5CE6);
  color: #fff;
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

.activity-status {
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

.meta-item.fee {
  color: #ff5722;
  font-weight: 600;
}

.meta-item.free {
  color: #4caf50;
  font-weight: 600;
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
}

.loading-state {
  padding: 20px;
}

.publish-btn {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, var(--primary-color, #2B5CE6), var(--primary-light, #5B7FED));
  box-shadow: 0 4px 12px rgba(43, 92, 230, 0.4);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
</style>
