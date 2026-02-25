<template>
  <view class="alumni-card-page">
    <!-- 校友卡展示 -->
    <view v-if="cardData" class="card-container">
      <view class="card-wrapper">
        <!-- 卡片背景 -->
        <view class="card-background" :style="{ background: cardGradient }">
          <!-- 学校信息 -->
          <view class="school-info">
            <image v-if="cardData.schoolLogo" :src="cardData.schoolLogo" class="school-logo" mode="aspectFit" />
            <text class="school-name">{{ cardData.schoolName }}</text>
            <text class="card-title">校友卡</text>
          </view>

          <!-- 校友信息 -->
          <view class="alumni-info">
            <view class="info-left">
              <view class="info-item">
                <text class="label">姓　名：</text>
                <text class="value">{{ cardData.realName }}</text>
              </view>
              <view class="info-item">
                <text class="label">毕业时间：</text>
                <text class="value">{{ formatGraduationYear }}</text>
              </view>
              <view v-if="cardData.college" class="info-item">
                <text class="label">学　院：</text>
                <text class="value">{{ cardData.college }}</text>
              </view>
              <view v-if="cardData.major" class="info-item">
                <text class="label">专　业：</text>
                <text class="value">{{ cardData.major }}</text>
              </view>
              <view v-if="cardData.className" class="info-item">
                <text class="label">班　级：</text>
                <text class="value">{{ cardData.className }}</text>
              </view>
            </view>

            <!-- 校友照片 -->
            <view class="info-right">
              <image :src="cardData.cardPhotoUrl || cardData.avatar || '/static/default-avatar.png'" class="alumni-photo" mode="aspectFill" />
            </view>
          </view>

          <!-- 卡号 -->
          <view class="card-number">
            <text>No. {{ cardData.alumniCardNo }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button class="btn-save" @click="saveToAlbum">保存到相册</button>
        <button class="btn-share" open-type="share">分享给好友</button>
      </view>

      <!-- 提示信息 -->
      <view class="tips">
        <text class="tips-text">此卡为{{ cardData.schoolName }}校友专属身份凭证</text>
        <text class="tips-text">认证时间：{{ formatVerifyTime }}</text>
      </view>
    </view>

    <!-- 未认证提示 -->
    <view v-else-if="!loading && !cardData" class="empty-state">
      <image src="/static/empty-card.png" class="empty-icon" mode="aspectFit" />
      <text class="empty-text">您还未通过校友认证</text>
      <button class="btn-verify" @click="goToVerify">去认证</button>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading" />
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      cardData: null,
      schoolConfig: null
    }
  },

  computed: {
    // 卡片渐变背景（优先用 cardData 中内嵌的 branding，其次用 schoolConfig）
    cardGradient() {
      const branding = this.cardData?.branding || this.schoolConfig?.branding || {}
      const primary = branding.primaryColor || '#4A90E2'
      const light = branding.primaryLight || '#2E5C8A'
      return `linear-gradient(135deg, ${primary} 0%, ${light} 100%)`
    },

    // 格式化毕业年份
    formatGraduationYear() {
      if (this.cardData.graduationYear) {
        return `${this.cardData.graduationYear}年`
      }
      if (this.cardData.enrollmentYear) {
        return `${this.cardData.enrollmentYear}级`
      }
      return '-'
    },

    // 格式化认证时间
    formatVerifyTime() {
      if (!this.cardData.verifyTime) return '-'
      const date = new Date(this.cardData.verifyTime)
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
    }
  },

  onLoad() {
    this.loadCardData()
  },

  onShareAppMessage() {
    return {
      title: `我是${this.cardData?.schoolName || ''}校友`,
      path: '/pages/index/index'
    }
  },

  methods: {
    // 加载校友卡数据
    async loadCardData() {
      try {
        this.loading = true

        // 获取校友卡信息
        const alumniObj = uniCloud.importObject('alumni-co')
        const res = await alumniObj.getAlumniCard()

        if (res.errCode === 0) {
          this.cardData = res.data
        }

        // 获取学校配置
        const configRes = await alumniObj.getSchoolConfig()
        if (configRes.errCode === 0) {
          this.schoolConfig = configRes.data
        }
      } catch (err) {
        console.error('加载校友卡失败:', err)
        if (err.errCode === 'NOT_VERIFIED') {
          // 未认证，不显示错误提示
          this.cardData = null
        } else {
          uni.showToast({
            title: err.errMsg || '加载失败',
            icon: 'none'
          })
        }
      } finally {
        this.loading = false
      }
    },

    // 保存到相册
    async saveToAlbum() {
      try {
        uni.showLoading({ title: '生成中...' })

        // TODO: 使用 canvas 绘制校友卡并保存
        // 这里需要实现 canvas 绘制逻辑

        uni.showToast({
          title: '功能开发中',
          icon: 'none'
        })
      } catch (err) {
        console.error('保存失败:', err)
        uni.showToast({
          title: '保存失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },

    // 去认证
    goToVerify() {
      uni.navigateTo({
        url: '/pages/alumni/verify/verify'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.alumni-card-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7fa 0%, #ffffff 100%);
  padding: 40rpx 30rpx;
}

.card-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-wrapper {
  width: 100%;
  max-width: 690rpx;
  margin-bottom: 60rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
}

.card-background {
  position: relative;
  padding: 60rpx 40rpx 40rpx;
  color: #ffffff;
}

.school-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
}

.school-logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 20rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  padding: 10rpx;
}

.school-name {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
  text-align: center;
}

.card-title {
  font-size: 28rpx;
  opacity: 0.9;
}

.alumni-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.info-left {
  flex: 1;
}

.info-item {
  display: flex;
  margin-bottom: 20rpx;
  font-size: 28rpx;
}

.label {
  opacity: 0.9;
  min-width: 160rpx;
}

.value {
  font-weight: 500;
}

.info-right {
  margin-left: 30rpx;
}

.alumni-photo {
  width: 200rpx;
  height: 260rpx;
  border-radius: 12rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
}

.card-number {
  text-align: left;
  font-size: 24rpx;
  opacity: 0.8;
  letter-spacing: 2rpx;
}

.action-buttons {
  display: flex;
  gap: 30rpx;
  width: 100%;
  max-width: 690rpx;
  margin-bottom: 40rpx;
}

.btn-save,
.btn-share {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 500;
}

.btn-save {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.btn-share {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #ffffff;
}

.tips {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.tips-text {
  font-size: 24rpx;
  color: #999999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-icon {
  width: 300rpx;
  height: 300rpx;
  margin-bottom: 40rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 32rpx;
  color: #999999;
  margin-bottom: 60rpx;
}

.btn-verify {
  width: 400rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 500;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
}
</style>
