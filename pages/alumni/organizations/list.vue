<template>
  <view class="page-container">
    <!-- 类型标签页 -->
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentType === tab.value }"
        @click="switchType(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索组织"
          @input="onSearchInput"
        />
      </view>
    </view>

    <!-- 组织列表 -->
    <scroll-view
      class="list-container"
      scroll-y
      @scrolltolower="loadMore"
    >
      <view v-if="loading && list.length === 0" class="loading-wrap">
        <uni-load-more status="loading"></uni-load-more>
      </view>
      <view v-else-if="list.length === 0" class="empty-wrap">
        <uni-icons type="staff" size="64" color="#ccc"></uni-icons>
        <text class="empty-text">暂无组织</text>
      </view>
      <view v-else>
        <view
          v-for="item in list"
          :key="item._id"
          class="org-card"
          @click="goToDetail(item._id)"
        >
          <image
            class="org-logo"
            :src="item.logo || '/static/default-avatar.png'"
            mode="aspectFill"
          ></image>
          <view class="org-info">
            <view class="org-name-row">
              <text class="org-name">{{ item.name }}</text>
              <text class="org-type-tag" :class="'type-' + item.type">{{ typeLabel(item.type) }}</text>
            </view>
            <text class="org-desc">{{ item.description || '暂无简介' }}</text>
            <view class="org-meta">
              <uni-icons type="person" size="14" color="#999"></uni-icons>
              <text>{{ item.memberCount || 0 }}人</text>
            </view>
          </view>
        </view>
        <uni-load-more :status="loadMoreStatus"></uni-load-more>
      </view>
    </scroll-view>

    <!-- 浮动创建按钮 -->
    <view class="fab-btn" @click="goToCreate">
      <uni-icons type="plusempty" size="24" color="#fff"></uni-icons>
    </view>
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
      currentType: '',
      keyword: '',
      loading: false,
      list: [],
      cursor: null,
      hasMore: true,
      searchTimer: null,
      tabs: [
        { label: '全部', value: '' },
        { label: '地方分会', value: 'regional' },
        { label: '行业分会', value: 'industry' },
        { label: '院系分会', value: 'college' },
        { label: '兴趣分会', value: 'interest' }
      ]
    }
  },
  computed: {
    loadMoreStatus() {
      if (this.loading) return 'loading'
      if (!this.hasMore) return 'noMore'
      return 'more'
    }
  },
  onLoad() {
    this.loadList(true)
  },
  methods: {
    typeLabel(type) {
      return TYPE_LABELS[type] || type
    },
    switchType(type) {
      this.currentType = type
      this.loadList(true)
    },
    onSearchInput() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.loadList(true)
      }, 300)
    },
    async loadList(reset = false) {
      if (this.loading) return
      if (!reset && !this.hasMore) return

      this.loading = true
      if (reset) {
        this.list = []
        this.cursor = null
        this.hasMore = true
      }

      try {
        const res = await orgCo.getList({
          type: this.currentType || undefined,
          keyword: this.keyword || undefined,
          cursor: this.cursor,
          pageSize: 20
        })
        if (res.errCode === 0) {
          const { list, hasMore, cursor } = res.data
          if (reset) {
            this.list = list
          } else {
            this.list = [...this.list, ...list]
          }
          this.hasMore = hasMore
          this.cursor = cursor
        }
      } catch (e) {
        console.error('加载组织列表失败', e)
      } finally {
        this.loading = false
      }
    },
    loadMore() {
      this.loadList(false)
    },
    goToDetail(id) {
      uni.navigateTo({
        url: `/pages/alumni/organizations/detail?id=${id}`
      })
    },
    goToCreate() {
      uni.navigateTo({
        url: '/pages/alumni/organizations/create'
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
  white-space: nowrap;
  overflow-x: auto;
}

.tab-item {
  flex-shrink: 0;
  padding: 0 28rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
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

.org-card {
  display: flex;
  flex-direction: row;
  padding: 24rpx 20rpx;
  background-color: #fff;
  margin-bottom: 2rpx;

  &:active {
    background-color: #f9f9f9;
  }
}

.org-logo {
  width: 100rpx;
  height: 100rpx;
  border-radius: 16rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.org-info {
  flex: 1;
  overflow: hidden;
}

.org-name-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8rpx;
}

.org-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-right: 12rpx;
}

.org-type-tag {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.type-regional {
  color: #E67E22;
  background-color: rgba(230, 126, 34, 0.1);
}

.type-industry {
  color: #2980B9;
  background-color: rgba(41, 128, 185, 0.1);
}

.type-college {
  color: #27AE60;
  background-color: rgba(39, 174, 96, 0.1);
}

.type-interest {
  color: #9B59B6;
  background-color: rgba(155, 89, 182, 0.1);
}

.org-desc {
  font-size: 26rpx;
  color: #666;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.org-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 24rpx;
  color: #999;

  text {
    margin-left: 6rpx;
  }
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 80rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(43, 92, 230, 0.3);

  &:active {
    transform: scale(0.95);
  }
}
</style>
