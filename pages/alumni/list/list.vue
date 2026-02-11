<template>
  <view class="page-container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索姓名、公司、职位"
          confirm-type="search"
          @confirm="onSearch"
        />
        <view v-if="keyword" class="clear-btn" @click="clearKeyword">
          <uni-icons type="clear" size="18" color="#999"></uni-icons>
        </view>
      </view>
      <view class="filter-btn" @click="showFilterPopup = true">
        <uni-icons type="settings" size="20" color="var(--primary-color)"></uni-icons>
      </view>
    </view>

    <!-- 快捷筛选标签 -->
    <scroll-view class="quick-filters" scroll-x>
      <view
        v-for="filter in quickFilters"
        :key="filter.key"
        class="filter-tag"
        :class="{ active: activeQuickFilter === filter.key }"
        @click="onQuickFilter(filter.key)"
      >
        {{ filter.label }}
      </view>
    </scroll-view>

    <!-- 已选筛选条件 -->
    <view v-if="hasActiveFilters" class="active-filters">
      <scroll-view scroll-x class="filter-scroll">
        <view v-if="searchParams.enrollmentYear" class="filter-chip" @click="clearFilter('enrollmentYear')">
          {{ searchParams.enrollmentYear }}级
          <uni-icons type="closeempty" size="14" color="#666"></uni-icons>
        </view>
        <view v-if="searchParams.college" class="filter-chip" @click="clearFilter('college')">
          {{ searchParams.college }}
          <uni-icons type="closeempty" size="14" color="#666"></uni-icons>
        </view>
        <view v-if="searchParams.industry" class="filter-chip" @click="clearFilter('industry')">
          {{ searchParams.industry }}
          <uni-icons type="closeempty" size="14" color="#666"></uni-icons>
        </view>
        <view v-if="searchParams.city" class="filter-chip" @click="clearFilter('city')">
          {{ searchParams.city }}
          <uni-icons type="closeempty" size="14" color="#666"></uni-icons>
        </view>
      </scroll-view>
      <view class="clear-all" @click="clearAllFilters">清除</view>
    </view>

    <!-- 统计信息 -->
    <view class="stats-bar">
      <text class="stats-text">共找到 {{ totalCount }} 位校友</text>
    </view>

    <!-- 校友列表 -->
    <scroll-view
      class="alumni-list"
      scroll-y
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="loading && list.length === 0" class="loading-wrap">
        <uni-load-more status="loading"></uni-load-more>
      </view>

      <view v-else-if="list.length === 0" class="empty-wrap">
        <uni-icons type="contact" size="64" color="#ccc"></uni-icons>
        <text class="empty-text">暂无校友数据</text>
      </view>

      <view v-else>
        <view
          v-for="item in list"
          :key="item._id"
          class="alumni-card"
          @click="goToDetail(item._id)"
        >
          <image
            class="avatar"
            :src="item.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
          ></image>
          <view class="info">
            <view class="name-row">
              <text class="name">{{ item.realName || item.nickname || '校友' }}</text>
              <view class="verified-tag">
                <uni-icons type="checkbox" size="14" color="var(--primary-color)"></uni-icons>
                <text>已认证</text>
              </view>
            </view>
            <view v-if="item.primaryEducation" class="edu-info">
              <text class="edu-text">
                {{ item.primaryEducation.enrollmentYear }}级
                <text v-if="item.primaryEducation.college"> · {{ item.primaryEducation.college }}</text>
              </text>
            </view>
            <view v-if="item.currentCompany || item.currentPosition" class="work-info">
              <text class="work-text">
                {{ item.currentPosition }}
                <text v-if="item.currentCompany && item.currentPosition"> @ </text>
                {{ item.currentCompany }}
              </text>
            </view>
            <view class="tags-row">
              <text v-if="item.industry" class="tag">{{ item.industry }}</text>
              <text v-if="item.city" class="tag">{{ item.city }}</text>
            </view>
          </view>
          <uni-icons type="arrowright" size="16" color="#ccc"></uni-icons>
        </view>

        <uni-load-more :status="loadMoreStatus"></uni-load-more>
      </view>
    </scroll-view>

    <!-- 筛选弹窗 -->
    <uni-popup ref="filterPopup" type="right" :mask-click="true" @change="onPopupChange">
      <view class="filter-popup">
        <view class="popup-header">
          <text class="popup-title">筛选条件</text>
          <view class="popup-close" @click="closeFilterPopup">
            <uni-icons type="closeempty" size="20" color="#333"></uni-icons>
          </view>
        </view>

        <scroll-view class="popup-content" scroll-y>
          <!-- 入学年份 -->
          <view class="filter-group">
            <text class="filter-group-title">入学年份</text>
            <view class="filter-options">
              <view
                v-for="year in filterOptions.enrollmentYears"
                :key="year.value"
                class="filter-option"
                :class="{ active: tempFilters.enrollmentYear === year.value }"
                @click="selectFilter('enrollmentYear', year.value)"
              >
                {{ year.value }}级
                <text class="count">({{ year.count }})</text>
              </view>
            </view>
          </view>

          <!-- 学院 -->
          <view v-if="filterOptions.colleges.length > 0" class="filter-group">
            <text class="filter-group-title">学院</text>
            <view class="filter-options">
              <view
                v-for="college in filterOptions.colleges"
                :key="college.value"
                class="filter-option"
                :class="{ active: tempFilters.college === college.value }"
                @click="selectFilter('college', college.value)"
              >
                {{ college.value }}
                <text class="count">({{ college.count }})</text>
              </view>
            </view>
          </view>

          <!-- 行业 -->
          <view class="filter-group">
            <text class="filter-group-title">行业</text>
            <view class="filter-options">
              <view
                v-for="industry in filterOptions.industries"
                :key="industry.value"
                class="filter-option"
                :class="{ active: tempFilters.industry === industry.value }"
                @click="selectFilter('industry', industry.value)"
              >
                {{ industry.value }}
                <text class="count">({{ industry.count }})</text>
              </view>
            </view>
          </view>

          <!-- 城市 -->
          <view class="filter-group">
            <text class="filter-group-title">所在城市</text>
            <view class="filter-options">
              <view
                v-for="city in filterOptions.cities"
                :key="city.value"
                class="filter-option"
                :class="{ active: tempFilters.city === city.value }"
                @click="selectFilter('city', city.value)"
              >
                {{ city.value }}
                <text class="count">({{ city.count }})</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="popup-footer">
          <button class="reset-btn" @click="resetFilters">重置</button>
          <button class="apply-btn" @click="applyFilters">确定</button>
        </view>
      </view>
    </uni-popup>

    <!-- 自定义TabBar -->
    <custom-tabbar :current="1"></custom-tabbar>
  </view>
</template>

<script>
import customTabbar from '@/components/custom-tabbar/custom-tabbar.vue'

const alumniSearchCo = uniCloud.importObject('alumni-search-co')

export default {
  components: {
    customTabbar
  },
  data() {
    return {
      keyword: '',
      loading: false,
      refreshing: false,
      list: [],
      cursor: null,
      hasMore: true,
      totalCount: 0,
      searchParams: {
        enrollmentYear: null,
        college: '',
        industry: '',
        city: '',
        province: '',
        interests: []
      },
      tempFilters: {},
      filterOptions: {
        enrollmentYears: [],
        colleges: [],
        industries: [],
        cities: []
      },
      quickFilters: [
        { key: 'sameYear', label: '同届' },
        { key: 'sameCity', label: '同城' },
        { key: 'sameIndustry', label: '同行' }
      ],
      activeQuickFilter: '',
      showFilterPopup: false
    }
  },
  computed: {
    hasActiveFilters() {
      return this.searchParams.enrollmentYear ||
        this.searchParams.college ||
        this.searchParams.industry ||
        this.searchParams.city
    },
    loadMoreStatus() {
      if (this.loading) return 'loading'
      if (!this.hasMore) return 'noMore'
      return 'more'
    }
  },
  onLoad() {
    this.loadFilterOptions()
    this.loadList()
  },
  methods: {
    async loadFilterOptions() {
      try {
        const res = await alumniSearchCo.getFilterOptions()
        if (res.errCode === 0) {
          this.filterOptions = res.data
        }
      } catch (e) {
        console.error('加载筛选选项失败', e)
      }
    },
    async loadList(reset = true) {
      if (this.loading) return
      if (!reset && !this.hasMore) return

      this.loading = true

      if (reset) {
        this.list = []
        this.cursor = null
        this.hasMore = true
      }

      try {
        const res = await alumniSearchCo.searchAlumni({
          ...this.searchParams,
          keyword: this.keyword,
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
          this.totalCount = this.list.length + (hasMore ? '+' : '')
        }
      } catch (e) {
        console.error('加载校友列表失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },
    loadMore() {
      if (!this.loading && this.hasMore) {
        this.loadList(false)
      }
    },
    onRefresh() {
      this.refreshing = true
      this.loadList(true)
    },
    onSearch() {
      this.activeQuickFilter = ''
      this.loadList(true)
    },
    clearKeyword() {
      this.keyword = ''
      this.loadList(true)
    },
    async onQuickFilter(key) {
      if (this.activeQuickFilter === key) {
        this.activeQuickFilter = ''
        this.loadList(true)
        return
      }

      this.activeQuickFilter = key
      this.loading = true

      try {
        let res
        switch (key) {
          case 'sameYear':
            res = await alumniSearchCo.getSameYearAlumni({ pageSize: 20 })
            break
          case 'sameCity':
            res = await alumniSearchCo.getSameCityAlumni({ pageSize: 20 })
            break
          case 'sameIndustry':
            res = await alumniSearchCo.getSameIndustryAlumni({ pageSize: 20 })
            break
        }

        if (res && res.errCode === 0) {
          this.list = res.data.list
          this.hasMore = res.data.hasMore
          this.cursor = res.data.cursor
          this.totalCount = this.list.length + (res.data.hasMore ? '+' : '')
        }
      } catch (e) {
        console.error('快捷筛选失败', e)
      } finally {
        this.loading = false
      }
    },
    onPopupChange(e) {
      this.showFilterPopup = e.show
      if (e.show) {
        this.tempFilters = { ...this.searchParams }
      }
    },
    selectFilter(type, value) {
      if (this.tempFilters[type] === value) {
        this.tempFilters[type] = type === 'enrollmentYear' ? null : ''
      } else {
        this.tempFilters[type] = value
      }
    },
    resetFilters() {
      this.tempFilters = {
        enrollmentYear: null,
        college: '',
        industry: '',
        city: '',
        province: '',
        interests: []
      }
    },
    applyFilters() {
      this.searchParams = { ...this.tempFilters }
      this.activeQuickFilter = ''
      this.closeFilterPopup()
      this.loadList(true)
    },
    closeFilterPopup() {
      this.$refs.filterPopup.close()
    },
    clearFilter(type) {
      this.searchParams[type] = type === 'enrollmentYear' ? null : ''
      this.loadList(true)
    },
    clearAllFilters() {
      this.searchParams = {
        enrollmentYear: null,
        college: '',
        industry: '',
        city: '',
        province: '',
        interests: []
      }
      this.loadList(true)
    },
    goToDetail(userId) {
      uni.navigateTo({
        url: `/pages/alumni/detail/detail?id=${userId}`
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
  background-color: var(--bg-page);
}

.search-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: #fff;
}

.search-input-wrap {
  flex: 1;
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

.clear-btn {
  padding: 8rpx;
}

.filter-btn {
  margin-left: 20rpx;
  padding: 16rpx;
}

.quick-filters {
  white-space: nowrap;
  padding: 16rpx 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-tag {
  display: inline-block;
  padding: 12rpx 32rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: #666;
  background-color: #f5f5f5;
  border-radius: 32rpx;

  &.active {
    color: var(--primary-color);
    background-color: rgba(43, 92, 230, 0.1);
  }
}

.active-filters {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: #fff;
}

.filter-scroll {
  flex: 1;
  white-space: nowrap;
}

.filter-chip {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  padding: 8rpx 20rpx;
  margin-right: 12rpx;
  font-size: 24rpx;
  color: #666;
  background-color: #f5f5f5;
  border-radius: 24rpx;
}

.clear-all {
  font-size: 26rpx;
  color: var(--primary-color);
  padding-left: 16rpx;
}

.stats-bar {
  padding: 16rpx 20rpx;
  background-color: #fff;
  border-top: 1rpx solid #f0f0f0;
}

.stats-text {
  font-size: 24rpx;
  color: #999;
}

.alumni-list {
  flex: 1;
  padding: 16rpx;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
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

.alumni-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.avatar {
  width: 100rpx;
  height: 100rpx;
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
  margin-bottom: 8rpx;
}

.name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-right: 12rpx;
}

.verified-tag {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 22rpx;
  color: var(--primary-color);
}

.edu-info,
.work-info {
  margin-bottom: 6rpx;
}

.edu-text,
.work-text {
  font-size: 26rpx;
  color: #666;
}

.tags-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 8rpx;
}

.tag {
  font-size: 22rpx;
  color: #999;
  padding: 4rpx 12rpx;
  margin-right: 8rpx;
  background-color: #f5f5f5;
  border-radius: 4rpx;
}

/* 筛选弹窗 */
.filter-popup {
  width: 600rpx;
  height: 100vh;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.popup-close {
  padding: 8rpx;
}

.popup-content {
  flex: 1;
  padding: 20rpx;
}

.filter-group {
  margin-bottom: 30rpx;
}

.filter-group-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.filter-options {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.filter-option {
  padding: 12rpx 24rpx;
  margin: 0 12rpx 12rpx 0;
  font-size: 26rpx;
  color: #666;
  background-color: #f5f5f5;
  border-radius: 8rpx;

  &.active {
    color: var(--primary-color);
    background-color: rgba(43, 92, 230, 0.1);
  }

  .count {
    font-size: 22rpx;
    color: #999;
    margin-left: 4rpx;
  }
}

.popup-footer {
  display: flex;
  flex-direction: row;
  padding: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.reset-btn,
.apply-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border-radius: 40rpx;
  margin: 0 10rpx;
  border: none;

  &::after {
    border: none;
  }
}

.reset-btn {
  background-color: #f5f5f5;
  color: #666;
}

.apply-btn {
  background-color: var(--primary-color);
  background-image: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: #fff;
}
</style>
