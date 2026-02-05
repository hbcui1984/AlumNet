<template>
  <view class="page-container">
    <!-- 此页面重定向到好友页面的收到请求标签 -->
  </view>
</template>

<script>
export default {
  onLoad() {
    // 重定向到好友页面的收到请求标签
    uni.redirectTo({
      url: '/pages/alumni/friends/friends?tab=received'
    })
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
