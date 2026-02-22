<template>
  <view class="page-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <template v-else-if="alumni">
      <!-- 头部信息 -->
      <view class="header-section">
        <view class="header-bg"></view>
        <view class="profile-info">
          <image
            class="avatar"
            :src="alumni.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
          ></image>
          <view class="name-row">
            <text class="name">{{ alumni.realName || alumni.nickname || '校友' }}</text>
            <view class="verified-badge">
              <uni-icons type="checkbox" size="16" color="#fff"></uni-icons>
              <text>已认证</text>
            </view>
          </view>
          <text v-if="alumni.bio" class="bio">{{ alumni.bio }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-section">
        <template v-if="alumni.isFriend">
          <button class="action-btn primary" @click="startChat">
            <uni-icons type="chat" size="20" color="#fff"></uni-icons>
            <text>发消息</text>
          </button>
          <button class="action-btn secondary" @click="showFriendOptions">
            <uni-icons type="more" size="20" color="var(--primary-color)"></uni-icons>
          </button>
        </template>
        <template v-else>
          <button
            v-if="!alumni.cardRequestStatus"
            class="action-btn primary full"
            @click="sendCardRequest"
          >
            <uni-icons type="person-filled" size="20" color="#fff"></uni-icons>
            <text>交换名片</text>
          </button>
          <button
            v-else-if="alumni.cardRequestStatus?.type === 'sent'"
            class="action-btn disabled full"
            disabled
          >
            <text>已发送名片请求</text>
          </button>
          <button
            v-else-if="alumni.cardRequestStatus?.type === 'received'"
            class="action-btn primary full"
            @click="acceptCardRequest"
          >
            <text>接受名片请求</text>
          </button>
        </template>
      </view>

      <!-- 基本信息 -->
      <view class="info-section">
        <view class="section-header">
          <text class="section-title">基本信息</text>
        </view>
        <view class="info-list">
          <view v-if="alumni.gender" class="info-item">
            <text class="info-label">性别</text>
            <text class="info-value">{{ alumni.gender === 1 ? '男' : '女' }}</text>
          </view>
          <view v-if="alumni.city || alumni.province" class="info-item">
            <text class="info-label">所在地</text>
            <text class="info-value">{{ alumni.province }} {{ alumni.city }}</text>
          </view>
          <view v-if="alumni.industry" class="info-item">
            <text class="info-label">行业</text>
            <text class="info-value">{{ alumni.industry }}</text>
          </view>
        </view>
      </view>

      <!-- 工作信息 -->
      <view v-if="alumni.currentCompany || alumni.currentPosition" class="info-section">
        <view class="section-header">
          <text class="section-title">工作信息</text>
        </view>
        <view class="info-list">
          <view v-if="alumni.currentCompany" class="info-item">
            <text class="info-label">公司</text>
            <text class="info-value">{{ alumni.currentCompany }}</text>
          </view>
          <view v-if="alumni.currentPosition" class="info-item">
            <text class="info-label">职位</text>
            <text class="info-value">{{ alumni.currentPosition }}</text>
          </view>
        </view>
      </view>

      <!-- 教育经历 -->
      <view v-if="alumni.educations && alumni.educations.length > 0" class="info-section">
        <view class="section-header">
          <text class="section-title">教育经历</text>
        </view>
        <view class="education-list">
          <view
            v-for="(edu, index) in alumni.educations"
            :key="index"
            class="education-item"
          >
            <view class="edu-icon">
              <uni-icons type="flag" size="20" color="var(--primary-color)"></uni-icons>
            </view>
            <view class="edu-content">
              <view class="edu-header">
                <view class="edu-title">
                  <text class="degree">{{ getDegreeLabel(edu.degree) }}</text>
                  <text v-if="edu.isPrimary" class="primary-tag">主要</text>
                </view>
                <text class="edu-time">{{ edu.enrollmentYear }} - {{ edu.graduationYear || '至今' }}</text>
              </view>
              <text v-if="edu.college" class="edu-college">{{ edu.college }}</text>
              <text v-if="edu.major" class="edu-major">专业：{{ edu.major }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 兴趣标签 -->
      <view v-if="alumni.interests && alumni.interests.length > 0" class="info-section">
        <view class="section-header">
          <text class="section-title">兴趣爱好</text>
        </view>
        <view class="interests-wrap">
          <view v-for="(interest, index) in alumni.interests" :key="index" class="interest-tag">
            {{ interest }}
          </view>
        </view>
      </view>

      <!-- 联系方式（仅好友可见） -->
      <view v-if="alumni.isFriend && (alumni.mobile || alumni.email)" class="info-section">
        <view class="section-header">
          <text class="section-title">联系方式</text>
        </view>
        <view class="info-list">
          <view v-if="alumni.mobile" class="info-item clickable" @click="callPhone">
            <text class="info-label">电话</text>
            <view class="info-value-wrap">
              <text class="info-value">{{ alumni.mobile }}</text>
              <uni-icons type="phone" size="18" color="var(--primary-color)"></uni-icons>
            </view>
          </view>
          <view v-if="alumni.email" class="info-item clickable" @click="copyEmail">
            <text class="info-label">邮箱</text>
            <view class="info-value-wrap">
              <text class="info-value">{{ alumni.email }}</text>
              <uni-icons type="paperclip" size="18" color="var(--primary-color)"></uni-icons>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 发送名片请求弹窗 -->
    <uni-popup ref="cardRequestPopup" type="center">
      <view class="card-request-popup">
        <text class="popup-title">发送名片请求</text>
        <textarea
          class="message-input"
          v-model="requestMessage"
          placeholder="请输入留言（选填）"
          maxlength="200"
        ></textarea>
        <view class="popup-actions">
          <button class="cancel-btn" @click="closeCardRequestPopup">取消</button>
          <button class="confirm-btn" :loading="sendingRequest" @click="confirmSendRequest">发送</button>
        </view>
      </view>
    </uni-popup>

    <!-- 好友操作弹窗 -->
    <uni-popup ref="friendOptionsPopup" type="bottom">
      <view class="friend-options">
        <view class="option-item" @click="setRemark">
          <uni-icons type="compose" size="20" color="#333"></uni-icons>
          <text>设置备注</text>
        </view>
        <view class="option-item danger" @click="confirmDeleteFriend">
          <uni-icons type="trash" size="20" color="#E74C3C"></uni-icons>
          <text>删除好友</text>
        </view>
        <view class="option-cancel" @click="closeFriendOptions">取消</view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
const alumniSearchCo = uniCloud.importObject('alumni-search-co')
const alumniFriendCo = uniCloud.importObject('alumni-friend-co')

export default {
  data() {
    return {
      userId: '',
      loading: true,
      alumni: null,
      requestMessage: '',
      sendingRequest: false,
      degreeOptions: {
        bachelor: '本科',
        master: '硕士',
        doctor: '博士',
        highschool: '高中',
        middleschool: '初中'
      }
    }
  },
  onLoad(options) {
    if (options.id) {
      this.userId = options.id
      this.loadAlumniDetail()
    } else {
      uni.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
    }
  },
  methods: {
    async loadAlumniDetail() {
      this.loading = true
      try {
        const res = await alumniSearchCo.getAlumniDetail(this.userId)
        if (res.errCode === 0) {
          this.alumni = res.data
          // 设置导航栏标题
          uni.setNavigationBarTitle({
            title: res.data.realName || res.data.nickname || '校友详情'
          })
        } else {
          uni.showToast({ title: res.errMsg || '加载失败', icon: 'none' })
        }
      } catch (e) {
        console.error('加载校友详情失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    getDegreeLabel(degree) {
      return this.degreeOptions[degree] || degree
    },
    sendCardRequest() {
      this.requestMessage = ''
      this.$refs.cardRequestPopup.open()
    },
    closeCardRequestPopup() {
      this.$refs.cardRequestPopup.close()
    },
    async confirmSendRequest() {
      this.sendingRequest = true
      try {
        const res = await alumniFriendCo.sendCardRequest({
          toUserId: this.userId,
          message: this.requestMessage
        })
        if (res.errCode === 0) {
          uni.showToast({ title: '请求已发送', icon: 'success' })
          this.closeCardRequestPopup()
          // 更新状态
          this.alumni.cardRequestStatus = {
            type: 'sent',
            requestId: res.data.requestId,
            status: 0
          }
        } else {
          uni.showToast({ title: res.errMsg || '发送失败', icon: 'none' })
        }
      } catch (e) {
        console.error('发送名片请求失败', e)
        uni.showToast({ title: '发送失败', icon: 'none' })
      } finally {
        this.sendingRequest = false
      }
    },
    async acceptCardRequest() {
      if (!this.alumni.cardRequestStatus?.requestId) return

      uni.showLoading({ title: '处理中' })
      try {
        const res = await alumniFriendCo.handleCardRequest({
          requestId: this.alumni.cardRequestStatus.requestId,
          action: 'accept'
        })
        if (res.errCode === 0) {
          uni.showToast({ title: '已添加为好友', icon: 'success' })
          this.alumni.isFriend = true
          this.alumni.cardRequestStatus = null
        } else {
          uni.showToast({ title: res.errMsg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        console.error('接受请求失败', e)
        uni.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    startChat() {
      // 跳转到聊天页面（集成 uni-im）
      uni.navigateTo({
        url: `/uni_modules/uni-im/pages/chat/chat?user_id=${this.userId}`
      })
    },
    showFriendOptions() {
      this.$refs.friendOptionsPopup.open()
    },
    closeFriendOptions() {
      this.$refs.friendOptionsPopup.close()
    },
    setRemark() {
      this.closeFriendOptions()
      uni.showModal({
        title: '设置备注',
        editable: true,
        placeholderText: '请输入备注名',
        success: async (res) => {
          if (res.confirm && res.content !== undefined) {
            try {
              const result = await alumniFriendCo.setFriendRemark({
                friendUserId: this.userId,
                remark: res.content
              })
              if (result.errCode === 0) {
                uni.showToast({ title: '设置成功', icon: 'success' })
              }
            } catch (e) {
              uni.showToast({ title: '设置失败', icon: 'none' })
            }
          }
        }
      })
    },
    confirmDeleteFriend() {
      this.closeFriendOptions()
      uni.showModal({
        title: '删除好友',
        content: '确定要删除该好友吗？删除后将无法查看其联系方式。',
        confirmColor: '#E74C3C',
        success: async (res) => {
          if (res.confirm) {
            try {
              const result = await alumniFriendCo.deleteFriend({
                friendUserId: this.userId
              })
              if (result.errCode === 0) {
                uni.showToast({ title: '已删除', icon: 'success' })
                this.alumni.isFriend = false
                // 隐藏联系方式
                this.alumni.mobile = null
                this.alumni.email = null
              }
            } catch (e) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },
    callPhone() {
      if (this.alumni.mobile) {
        uni.makePhoneCall({
          phoneNumber: this.alumni.mobile
        })
      }
    },
    copyEmail() {
      if (this.alumni.email) {
        uni.setClipboardData({
          data: this.alumni.email,
          success: () => {
            uni.showToast({ title: '已复制邮箱', icon: 'success' })
          }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.header-section {
  position: relative;
  padding-bottom: 40rpx;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 400rpx;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
}

.profile-info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 100rpx;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 6rpx solid #fff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.name-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 20rpx;
}

.name {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
}

.verified-badge {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: 12rpx;
  padding: 6rpx 16rpx;
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #fff;
}

.bio {
  margin-top: 16rpx;
  padding: 0 40rpx;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.action-section {
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding: 0 40rpx 30rpx;
}

.action-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  padding: 0 40rpx;
  font-size: 28rpx;
  border-radius: 40rpx;
  margin: 0 10rpx;
  border: none;

  &::after {
    border: none;
  }

  &.primary {
    background-color: var(--primary-color);
    background-image: linear-gradient(135deg, var(--primary-color), var(--primary-light));
    color: #fff;
  }

  &.secondary {
    background-color: #fff;
    border: 2rpx solid var(--primary-color);
    color: var(--primary-color);
  }

  &.disabled {
    background-color: #ccc;
    color: #fff;
  }

  &.full {
    flex: 1;
    max-width: 400rpx;
  }

  text {
    margin-left: 8rpx;
  }
}

.info-section {
  margin: 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.info-list {
  /* empty */
}

.info-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  &.clickable {
    &:active {
      background-color: #f9f9f9;
    }
  }
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #333;
}

.info-value-wrap {
  display: flex;
  flex-direction: row;
  align-items: center;

  .info-value {
    margin-right: 12rpx;
  }
}

.education-list {
  /* empty */
}

.education-item {
  display: flex;
  flex-direction: row;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.edu-icon {
  width: 40rpx;
  margin-right: 20rpx;
  padding-top: 4rpx;
}

.edu-content {
  flex: 1;
}

.edu-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.edu-title {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.degree {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.primary-tag {
  margin-left: 12rpx;
  padding: 4rpx 12rpx;
  font-size: 22rpx;
  color: #fff;
  background-color: var(--primary-color);
  border-radius: 8rpx;
}

.edu-time {
  font-size: 24rpx;
  color: #999;
}

.edu-college {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
  font-weight: 500;
}

.edu-major {
  font-size: 26rpx;
  color: #666;
  display: block;
}

.edu-title {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8rpx;
}

.degree {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.primary-tag {
  margin-left: 12rpx;
  padding: 2rpx 12rpx;
  font-size: 22rpx;
  color: var(--primary-color);
  background-color: rgba(43, 92, 230, 0.1);
  border-radius: 4rpx;
}

.edu-time,
.edu-detail {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 4rpx;
}

.interests-wrap {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.interest-tag {
  padding: 8rpx 20rpx;
  margin: 0 12rpx 12rpx 0;
  font-size: 26rpx;
  color: var(--primary-color);
  background-color: rgba(43, 92, 230, 0.1);
  border-radius: 20rpx;
}

/* 弹窗样式 */
.card-request-popup {
  width: 600rpx;
  padding: 40rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 30rpx;
}

.message-input {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.popup-actions {
  display: flex;
  flex-direction: row;
  margin-top: 30rpx;
}

.cancel-btn,
.confirm-btn {
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

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.confirm-btn {
  background-color: var(--primary-color);
  background-image: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: #fff;
}

/* 好友操作弹窗 */
.friend-options {
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.option-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  font-size: 30rpx;
  color: #333;
  border-bottom: 1rpx solid #f0f0f0;

  &.danger {
    color: #E74C3C;
  }

  text {
    margin-left: 12rpx;
  }
}

.option-cancel {
  height: 100rpx;
  line-height: 100rpx;
  text-align: center;
  font-size: 30rpx;
  color: #666;
  background-color: #f9f9f9;
}
</style>
