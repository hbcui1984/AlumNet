<template>
  <view class="custom-tabbar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
    <view
      v-for="(item, index) in tabList"
      :key="index"
      class="tabbar-item"
      :class="{ active: currentIndex === index }"
      @click="switchTab(index)"
    >
      <view class="icon-wrap">
        <uni-icons
          :type="currentIndex === index ? item.activeIcon : item.icon"
          :size="24"
          :color="currentIndex === index ? activeColor : inactiveColor"
        ></uni-icons>
        <view v-if="item.badge && item.badge > 0" class="badge">
          {{ item.badge > 99 ? '99+' : item.badge }}
        </view>
      </view>
      <text class="tabbar-text" :style="{ color: currentIndex === index ? activeColor : inactiveColor }">
        {{ item.text }}
      </text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CustomTabbar',
  props: {
    current: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      activeColor: '#2B5CE6',
      inactiveColor: '#999999',
      safeAreaBottom: 0,
      tabList: [
        {
          pagePath: '/pages/index/index',
          icon: 'home',
          activeIcon: 'home-filled',
          text: '首页',
          badge: 0
        },
        {
          pagePath: '/pages/alumni/list/list',
          icon: 'contact',
          activeIcon: 'contact-filled',
          text: '找校友',
          badge: 0
        },
        {
          pagePath: '/pages/ucenter/ucenter',
          icon: 'person',
          activeIcon: 'person-filled',
          text: '我的',
          badge: 0
        }
      ]
    }
  },
  computed: {
    currentIndex() {
      return this.current
    }
  },
  created() {
    // 获取安全区域
    const systemInfo = uni.getSystemInfoSync()
    this.safeAreaBottom = systemInfo.safeAreaInsets?.bottom || 0
  },
  methods: {
    switchTab(index) {
      if (index === this.currentIndex) return

      const item = this.tabList[index]
      uni.switchTab({
        url: item.pagePath
      })
    },
    // 外部调用更新角标
    setBadge(index, count) {
      if (this.tabList[index]) {
        this.tabList[index].badge = count
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  height: 100rpx;
  background-color: #ffffff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
  z-index: 999;
}

.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;

  &.active {
    .tabbar-text {
      font-weight: 500;
    }
  }
}

.icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4rpx;
}

.badge {
  position: absolute;
  top: -10rpx;
  right: -20rpx;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  padding: 0 8rpx;
  background-color: #E74C3C;
  border-radius: 16rpx;
  font-size: 20rpx;
  color: #ffffff;
  text-align: center;
}

.tabbar-text {
  font-size: 22rpx;
  line-height: 1;
}
</style>
