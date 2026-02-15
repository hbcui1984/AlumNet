<template>
  <view class="activity-detail-page">
    <scroll-view v-if="activity" class="detail-scroll" scroll-y>
      <!-- 封面图 -->
      <image 
        class="activity-cover" 
        :src="activity.cover || '/static/logo.png'"
        mode="aspectFill"
      ></image>

      <!-- 活动信息 -->
      <view class="activity-info-card">
        <view class="activity-header">
          <text class="activity-title">{{ activity.title }}</text>
          <view class="activity-status" :class="'status-' + activity.status">
            <text>{{ getStatusText(activity.status) }}</text>
          </view>
        </view>

        <view class="info-list">
          <view class="info-row">
            <view class="info-icon">
              <uni-icons type="calendar" size="20" color="#2B5CE6"></uni-icons>
            </view>
            <view class="info-content">
              <text class="info-label">活动时间</text>
              <text class="info-value">{{ formatDateTime(activity.startTime) }}</text>
              <text v-if="activity.endTime" class="info-value">至 {{ formatDateTime(activity.endTime) }}</text>
            </view>
          </view>

          <view class="info-row">
            <view class="info-icon">
              <uni-icons type="location" size="20" color="#2B5CE6"></uni-icons>
            </view>
            <view class="info-content">
              <text class="info-label">活动地点</text>
              <text class="info-value">{{ getLocationText(activity) }}</text>
              <text v-if="activity.location?.address" class="info-sub">{{ activity.location.address }}</text>
            </view>
          </view>

          <view class="info-row">
            <view class="info-icon">
              <uni-icons type="person" size="20" color="#2B5CE6"></uni-icons>
            </view>
            <view class="info-content">
              <text class="info-label">报名人数</text>
              <text class="info-value">
                {{ activity.currentParticipants || 0 }}人已报名
                <text v-if="activity.maxParticipants > 0"> / 限{{ activity.maxParticipants }}人</text>
              </text>
            </view>
          </view>

          <view v-if="activity.fee > 0" class="info-row">
            <view class="info-icon">
              <uni-icons type="wallet" size="20" color="#2B5CE6"></uni-icons>
            </view>
            <view class="info-content">
              <text class="info-label">活动费用</text>
              <text class="info-value fee">¥{{ activity.fee }}</text>
            </view>
          </view>

          <view v-if="activity.signupDeadline" class="info-row">
            <view class="info-icon">
              <uni-icons type="clock" size="20" color="#2B5CE6"></uni-icons>
            </view>
            <view class="info-content">
              <text class="info-label">报名截止</text>
              <text class="info-value">{{ formatDateTime(activity.signupDeadline) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 活动详情 -->
      <view class="activity-detail-card">
        <view class="card-title">
          <text>活动详情</text>
        </view>
        <view class="detail-content">
          <text v-if="activity.description" class="description">{{ activity.description }}</text>
          <rich-text v-if="activity.content" :nodes="activity.content"></rich-text>
          <text v-if="!activity.description && !activity.content" class="empty-text">暂无详情</text>
        </view>
      </view>

      <!-- 标签 -->
      <view v-if="activity.tags && activity.tags.length > 0" class="activity-tags-card">
        <view class="card-title">
          <text>活动标签</text>
        </view>
        <view class="tags-list">
          <view v-for="(tag, index) in activity.tags" :key="index" class="tag-item">
            <text>{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- 底部占位 -->
      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 加载状态 -->
    <view v-else class="loading-container">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="activity" class="bottom-bar">
      <view class="bar-left">
        <view class="price-info">
          <text v-if="activity.fee > 0" class="price">¥{{ activity.fee }}</text>
          <text v-else class="price free">免费</text>
        </view>
      </view>
      <view class="bar-right">
        <button 
          v-if="activity.status === 1 && !activity.isSignedUp"
          class="signup-btn primary"
          @click="onSignup"
        >
          立即报名
        </button>
        <button 
          v-else-if="activity.isSignedUp && activity.status === 1"
          class="signup-btn cancel"
          @click="onCancelSignup"
        >
          取消报名
        </button>
        <button 
          v-else
          class="signup-btn disabled"
          disabled
        >
          {{ getButtonText(activity) }}
        </button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activityId: '',
      activity: null
    }
  },
  onLoad(options) {
    if (options.id) {
      this.activityId = options.id
      this.loadActivityDetail()
    }
  },
  onShow() {
    // 从报名页返回时刷新数据
    if (this.activityId) {
      this.loadActivityDetail()
    }
  },
  methods: {
    async loadActivityDetail() {
      try {
        uni.showLoading({ title: '加载中' })
        const activityCo = uniCloud.importObject('alumni-activity-co')
        const res = await activityCo.getActivityDetail(this.activityId)
        
        if (res.errCode === 0) {
          this.activity = res.data
        } else {
          uni.showToast({ title: res.errMsg, icon: 'none' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        }
      } catch (e) {
        console.error('加载活动详情失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    async onSignup() {
      // 检查登录状态
      const userInfo = uniCloud.getCurrentUserInfo()
      if (!userInfo.uid) {
        uni.showModal({
          title: '提示',
          content: '请先登录',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({
                url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
              })
            }
          }
        })
        return
      }

      // 检查人数限制
      if (this.activity.maxParticipants > 0 && 
          this.activity.currentParticipants >= this.activity.maxParticipants) {
        uni.showToast({ title: '活动人数已满', icon: 'none' })
        return
      }

      // 检查报名截止时间
      if (this.activity.signupDeadline && Date.now() > this.activity.signupDeadline) {
        uni.showToast({ title: '报名已截止', icon: 'none' })
        return
      }

      uni.showModal({
        title: '确认报名',
        content: `确定报名参加"${this.activity.title}"吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              uni.showLoading({ title: '报名中' })
              const activityCo = uniCloud.importObject('alumni-activity-co')
              const result = await activityCo.signupActivity(this.activityId, {})
              
              if (result.errCode === 0) {
                uni.showToast({ title: '报名成功', icon: 'success' })
                this.loadActivityDetail()
              } else {
                uni.showToast({ title: result.errMsg, icon: 'none' })
              }
            } catch (e) {
              console.error('报名失败', e)
              uni.showToast({ title: '报名失败', icon: 'none' })
            } finally {
              uni.hideLoading()
            }
          }
        }
      })
    },
    async onCancelSignup() {
      uni.showModal({
        title: '取消报名',
        content: '确定要取消报名吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              uni.showLoading({ title: '处理中' })
              const activityCo = uniCloud.importObject('alumni-activity-co')
              const result = await activityCo.cancelSignup(this.activityId)
              
              if (result.errCode === 0) {
                uni.showToast({ title: '已取消报名', icon: 'success' })
                this.loadActivityDetail()
              } else {
                uni.showToast({ title: result.errMsg, icon: 'none' })
              }
            } catch (e) {
              console.error('取消报名失败', e)
              uni.showToast({ title: '操作失败', icon: 'none' })
            } finally {
              uni.hideLoading()
            }
          }
        }
      })
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
      if (activity.type === 'hybrid') {
        return activity.location?.name ? `${activity.location.name}（线上线下结合）` : '线上线下结合'
      }
      return activity.location?.name || '待定'
    },
    getButtonText(activity) {
      if (activity.isSignedUp) {
        return '已报名'
      }
      if (activity.status === 2) {
        return '报名已结束'
      }
      if (activity.status === 3) {
        return '活动进行中'
      }
      if (activity.status === 4) {
        return '活动已结束'
      }
      if (activity.status === 5) {
        return '活动已取消'
      }
      if (activity.maxParticipants > 0 && activity.currentParticipants >= activity.maxParticipants) {
        return '人数已满'
      }
      return '暂不可报名'
    },
    formatDateTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    }
  }
}
</script>

<style scoped>
.activity-detail-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.detail-scroll {
  flex: 1;
  padding-bottom: 80px;
}

.activity-cover {
  width: 100%;
  height: 250px;
}

.activity-info-card {
  background-color: #fff;
  padding: 16px;
  margin-bottom: 10px;
}

.activity-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.activity-title {
  flex: 1;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  line-height: 28px;
}

.activity-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 12px;
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

.info-list {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  flex-direction: row;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-icon {
  width: 32px;
  margin-right: 12px;
}

.info-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.info-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 4px;
}

.info-value {
  font-size: 15px;
  color: #333;
  line-height: 22px;
}

.info-value.fee {
  color: #ff5722;
  font-weight: 600;
  font-size: 18px;
}

.info-sub {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

.activity-detail-card,
.activity-tags-card {
  background-color: #fff;
  padding: 16px;
  margin-bottom: 10px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #2B5CE6;
}

.detail-content {
  display: flex;
  flex-direction: column;
  font-size: 15px;
  color: #666;
  line-height: 24px;
}

.description {
  margin-bottom: 12px;
}

.empty-text {
  color: #999;
  text-align: center;
  padding: 20px 0;
}

.tags-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.tag-item {
  padding: 6px 12px;
  margin-right: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  background-color: #f5f5f5;
  font-size: 13px;
  color: #666;
}

.bottom-placeholder {
  height: 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

.bar-left {
  display: flex;
  flex-direction: column;
}

.price-info {
  display: flex;
  flex-direction: row;
  align-items: baseline;
}

.price {
  font-size: 24px;
  font-weight: 600;
  color: #ff5722;
}

.price.free {
  color: #4caf50;
  font-size: 18px;
}

.bar-right {
  display: flex;
  flex-direction: row;
}

.signup-btn {
  padding: 12px 32px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
}

.signup-btn.primary {
  background: linear-gradient(135deg, #2B5CE6, #5B7FED);
  color: #fff;
}

.signup-btn.cancel {
  background-color: #fff;
  color: #ff5722;
  border: 1px solid #ff5722;
}

.signup-btn.disabled {
  background-color: #f5f5f5;
  color: #999;
}
</style>
