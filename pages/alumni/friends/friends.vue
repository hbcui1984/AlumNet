<template>
  <view class="page-container">
    <!-- 顶部标签页 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: currentTab === 'friends' }"
        @click="switchTab('friends')"
      >
        <text>好友列表</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: currentTab === 'received' }"
        @click="switchTab('received')"
      >
        <text>收到的请求</text>
        <view v-if="pendingCount > 0" class="badge">{{ pendingCount }}</view>
      </view>
      <view
        class="tab-item"
        :class="{ active: currentTab === 'sent' }"
        @click="switchTab('sent')"
      >
        <text>发出的请求</text>
      </view>
    </view>

    <!-- 搜索栏（仅好友列表显示） -->
    <view v-if="currentTab === 'friends'" class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索好友"
          @input="onSearchInput"
        />
      </view>
    </view>

    <!-- 好友列表 -->
    <scroll-view
      v-if="currentTab === 'friends'"
      class="list-container"
      scroll-y
      @scrolltolower="loadMore"
    >
      <view v-if="loading && friendList.length === 0" class="loading-wrap">
        <uni-load-more status="loading"></uni-load-more>
      </view>
      <view v-else-if="friendList.length === 0" class="empty-wrap">
        <uni-icons type="person" size="64" color="#ccc"></uni-icons>
        <text class="empty-text">还没有好友</text>
        <button class="empty-btn" @click="goToFindAlumni">去找校友</button>
      </view>
      <view v-else>
        <view
          v-for="item in friendList"
          :key="item.friendId"
          class="friend-item"
          @click="goToDetail(item.userId)"
        >
          <image
            class="avatar"
            :src="item.user.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
          ></image>
          <view class="info">
            <view class="name-row">
              <text class="name">{{ item.remark || item.user.realName || item.user.nickname }}</text>
              <text v-if="item.remark && item.user.realName" class="real-name">（{{ item.user.realName }}）</text>
            </view>
            <text class="desc">
              {{ item.user.currentPosition || '' }}
              {{ item.user.currentPosition && item.user.currentCompany ? ' @ ' : '' }}
              {{ item.user.currentCompany || '' }}
            </text>
          </view>
          <uni-icons type="arrowright" size="16" color="#ccc"></uni-icons>
        </view>
        <uni-load-more :status="loadMoreStatus"></uni-load-more>
      </view>
    </scroll-view>

    <!-- 收到的请求 -->
    <scroll-view
      v-if="currentTab === 'received'"
      class="list-container"
      scroll-y
      @scrolltolower="loadMoreRequests"
    >
      <view v-if="loading && receivedList.length === 0" class="loading-wrap">
        <uni-load-more status="loading"></uni-load-more>
      </view>
      <view v-else-if="receivedList.length === 0" class="empty-wrap">
        <uni-icons type="email" size="64" color="#ccc"></uni-icons>
        <text class="empty-text">暂无收到的请求</text>
      </view>
      <view v-else>
        <view
          v-for="item in receivedList"
          :key="item._id"
          class="request-item"
        >
          <view class="request-main" @click="goToDetail(item.fromUser._id)">
            <image
              class="avatar"
              :src="item.fromUser.avatar || '/static/default-avatar.png'"
              mode="aspectFill"
            ></image>
            <view class="info">
              <text class="name">{{ item.fromUser.realName || item.fromUser.nickname }}</text>
              <text v-if="item.fromUser.primaryEducation" class="desc">
                {{ item.fromUser.primaryEducation.enrollmentYear }}级
                {{ item.fromUser.primaryEducation.college || '' }}
              </text>
              <text v-if="item.message" class="message">"{{ item.message }}"</text>
            </view>
          </view>
          <view v-if="item.status === 0" class="request-actions">
            <button class="reject-btn" @click="handleRequest(item._id, 'reject')">拒绝</button>
            <button class="accept-btn" @click="handleRequest(item._id, 'accept')">接受</button>
          </view>
          <view v-else class="request-status">
            <text v-if="item.status === 1" class="status-accepted">已接受</text>
            <text v-else-if="item.status === 2" class="status-rejected">已拒绝</text>
            <text v-else-if="item.status === 3" class="status-expired">已过期</text>
          </view>
        </view>
        <uni-load-more :status="requestLoadMoreStatus"></uni-load-more>
      </view>
    </scroll-view>

    <!-- 发出的请求 -->
    <scroll-view
      v-if="currentTab === 'sent'"
      class="list-container"
      scroll-y
      @scrolltolower="loadMoreSentRequests"
    >
      <view v-if="loading && sentList.length === 0" class="loading-wrap">
        <uni-load-more status="loading"></uni-load-more>
      </view>
      <view v-else-if="sentList.length === 0" class="empty-wrap">
        <uni-icons type="paperplane" size="64" color="#ccc"></uni-icons>
        <text class="empty-text">暂无发出的请求</text>
      </view>
      <view v-else>
        <view
          v-for="item in sentList"
          :key="item._id"
          class="request-item"
        >
          <view class="request-main" @click="goToDetail(item.toUser._id)">
            <image
              class="avatar"
              :src="item.toUser.avatar || '/static/default-avatar.png'"
              mode="aspectFill"
            ></image>
            <view class="info">
              <text class="name">{{ item.toUser.realName || item.toUser.nickname }}</text>
              <text v-if="item.toUser.primaryEducation" class="desc">
                {{ item.toUser.primaryEducation.enrollmentYear }}级
                {{ item.toUser.primaryEducation.college || '' }}
              </text>
              <text v-if="item.message" class="message">"{{ item.message }}"</text>
            </view>
          </view>
          <view class="request-status">
            <text v-if="item.status === 0" class="status-pending">待处理</text>
            <text v-else-if="item.status === 1" class="status-accepted">已接受</text>
            <text v-else-if="item.status === 2" class="status-rejected">已拒绝</text>
            <text v-else-if="item.status === 3" class="status-expired">已过期</text>
          </view>
          <view v-if="item.status === 0" class="cancel-action" @click="cancelRequest(item._id)">
            <text>撤回</text>
          </view>
        </view>
        <uni-load-more :status="sentLoadMoreStatus"></uni-load-more>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const alumniFriendCo = uniCloud.importObject('alumni-friend-co')

export default {
  data() {
    return {
      currentTab: 'friends',
      keyword: '',
      loading: false,
      pendingCount: 0,
      // 好友列表
      friendList: [],
      friendCursor: null,
      friendHasMore: true,
      // 收到的请求
      receivedList: [],
      receivedCursor: null,
      receivedHasMore: true,
      // 发出的请求
      sentList: [],
      sentCursor: null,
      sentHasMore: true,
      // 搜索防抖
      searchTimer: null
    }
  },
  computed: {
    loadMoreStatus() {
      if (this.loading) return 'loading'
      if (!this.friendHasMore) return 'noMore'
      return 'more'
    },
    requestLoadMoreStatus() {
      if (this.loading) return 'loading'
      if (!this.receivedHasMore) return 'noMore'
      return 'more'
    },
    sentLoadMoreStatus() {
      if (this.loading) return 'loading'
      if (!this.sentHasMore) return 'noMore'
      return 'more'
    }
  },
  onLoad(options) {
    if (options.tab) {
      this.currentTab = options.tab
    }
    this.loadData()
    this.loadPendingCount()
  },
  methods: {
    switchTab(tab) {
      this.currentTab = tab
      this.loadData()
    },
    loadData() {
      switch (this.currentTab) {
        case 'friends':
          this.loadFriendList(true)
          break
        case 'received':
          this.loadReceivedRequests(true)
          break
        case 'sent':
          this.loadSentRequests(true)
          break
      }
    },
    async loadPendingCount() {
      try {
        const res = await alumniFriendCo.getPendingRequestCount()
        if (res.errCode === 0) {
          this.pendingCount = res.data.count
        }
      } catch (e) {
        console.error('加载待处理数量失败', e)
      }
    },
    async loadFriendList(reset = false) {
      if (this.loading) return
      if (!reset && !this.friendHasMore) return

      this.loading = true

      if (reset) {
        this.friendList = []
        this.friendCursor = null
        this.friendHasMore = true
      }

      try {
        const res = await alumniFriendCo.getFriendList({
          keyword: this.keyword,
          cursor: this.friendCursor,
          pageSize: 20
        })

        if (res.errCode === 0) {
          const { list, hasMore, cursor } = res.data
          if (reset) {
            this.friendList = list
          } else {
            this.friendList = [...this.friendList, ...list]
          }
          this.friendHasMore = hasMore
          this.friendCursor = cursor
        }
      } catch (e) {
        console.error('加载好友列表失败', e)
      } finally {
        this.loading = false
      }
    },
    async loadReceivedRequests(reset = false) {
      if (this.loading) return
      if (!reset && !this.receivedHasMore) return

      this.loading = true

      if (reset) {
        this.receivedList = []
        this.receivedCursor = null
        this.receivedHasMore = true
      }

      try {
        const res = await alumniFriendCo.getReceivedRequests({
          cursor: this.receivedCursor,
          pageSize: 20
        })

        if (res.errCode === 0) {
          const { list, hasMore, cursor } = res.data
          if (reset) {
            this.receivedList = list
          } else {
            this.receivedList = [...this.receivedList, ...list]
          }
          this.receivedHasMore = hasMore
          this.receivedCursor = cursor
        }
      } catch (e) {
        console.error('加载收到的请求失败', e)
      } finally {
        this.loading = false
      }
    },
    async loadSentRequests(reset = false) {
      if (this.loading) return
      if (!reset && !this.sentHasMore) return

      this.loading = true

      if (reset) {
        this.sentList = []
        this.sentCursor = null
        this.sentHasMore = true
      }

      try {
        const res = await alumniFriendCo.getSentRequests({
          cursor: this.sentCursor,
          pageSize: 20
        })

        if (res.errCode === 0) {
          const { list, hasMore, cursor } = res.data
          if (reset) {
            this.sentList = list
          } else {
            this.sentList = [...this.sentList, ...list]
          }
          this.sentHasMore = hasMore
          this.sentCursor = cursor
        }
      } catch (e) {
        console.error('加载发出的请求失败', e)
      } finally {
        this.loading = false
      }
    },
    loadMore() {
      this.loadFriendList(false)
    },
    loadMoreRequests() {
      this.loadReceivedRequests(false)
    },
    loadMoreSentRequests() {
      this.loadSentRequests(false)
    },
    onSearchInput() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.loadFriendList(true)
      }, 300)
    },
    async handleRequest(requestId, action) {
      uni.showLoading({ title: '处理中' })
      try {
        const res = await alumniFriendCo.handleCardRequest({
          requestId,
          action
        })
        if (res.errCode === 0) {
          uni.showToast({
            title: action === 'accept' ? '已添加好友' : '已拒绝',
            icon: 'success'
          })
          // 更新列表中的状态
          const item = this.receivedList.find(r => r._id === requestId)
          if (item) {
            item.status = action === 'accept' ? 1 : 2
          }
          // 更新待处理数量
          if (this.pendingCount > 0) {
            this.pendingCount--
          }
        } else {
          uni.showToast({ title: res.errMsg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        console.error('处理请求失败', e)
        uni.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    async cancelRequest(requestId) {
      uni.showModal({
        title: '撤回请求',
        content: '确定要撤回该名片请求吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const result = await alumniFriendCo.cancelCardRequest({ requestId })
              if (result.errCode === 0) {
                uni.showToast({ title: '已撤回', icon: 'success' })
                this.sentList = this.sentList.filter(r => r._id !== requestId)
              } else {
                uni.showToast({ title: result.errMsg || '撤回失败', icon: 'none' })
              }
            } catch (e) {
              uni.showToast({ title: '撤回失败', icon: 'none' })
            }
          }
        }
      })
    },
    goToDetail(userId) {
      uni.navigateTo({
        url: `/pages/alumni/detail/detail?id=${userId}`
      })
    },
    goToFindAlumni() {
      uni.switchTab({
        url: '/pages/alumni/list/list'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.tab-bar {
  display: flex;
  flex-direction: row;
  background-color: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  font-size: 28rpx;
  color: #666;
  position: relative;

  &.active {
    color: var(--primary-color);
    font-weight: bold;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background-color: var(--primary-color);
      border-radius: 2rpx;
    }
  }
}

.badge {
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  padding: 0 8rpx;
  margin-left: 8rpx;
  background-color: #E74C3C;
  border-radius: 16rpx;
  font-size: 22rpx;
  color: #fff;
  text-align: center;
}

.search-bar {
  padding: 16rpx 20rpx;
  background-color: #fff;
}

.search-input-wrap {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
  background-color: #f5f5f5;
  border-radius: 36rpx;
}

.search-input {
  flex: 1;
  margin-left: 12rpx;
  font-size: 28rpx;
}

.list-container {
  flex: 1;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #999;
}

.empty-btn {
  margin-top: 30rpx;
  padding: 0 40rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  color: var(--primary-color);
  background-color: rgba(43, 92, 230, 0.1);
  border-radius: 36rpx;
}

.friend-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24rpx 20rpx;
  background-color: #fff;
  margin-bottom: 2rpx;

  &:active {
    background-color: #f9f9f9;
  }
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.info {
  flex: 1;
  overflow: hidden;
}

.name-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.real-name {
  font-size: 26rpx;
  color: #999;
  margin-left: 8rpx;
}

.desc {
  font-size: 26rpx;
  color: #666;
  margin-top: 8rpx;
  display: block;
}

.request-item {
  padding: 24rpx 20rpx;
  background-color: #fff;
  margin-bottom: 2rpx;
}

.request-main {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.message {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
  font-style: italic;
}

.request-actions {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.reject-btn,
.accept-btn {
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 40rpx;
  font-size: 26rpx;
  border-radius: 32rpx;
  margin-left: 20rpx;
}

.reject-btn {
  background-color: #f5f5f5;
  color: #666;
}

.accept-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: #fff;
}

.request-status {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
}

.status-pending {
  font-size: 24rpx;
  color: #F39C12;
}

.status-accepted {
  font-size: 24rpx;
  color: #27AE60;
}

.status-rejected {
  font-size: 24rpx;
  color: #E74C3C;
}

.status-expired {
  font-size: 24rpx;
  color: #999;
}

.cancel-action {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;

  text {
    font-size: 24rpx;
    color: var(--primary-color);
    padding: 8rpx 20rpx;
  }
}
</style>
