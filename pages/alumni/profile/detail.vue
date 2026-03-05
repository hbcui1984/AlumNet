<template>
  <view class="page-container">
    <view v-if="loading" class="loading-wrap">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <scroll-view v-else class="content-scroll" scroll-y>
      <!-- 认证状态卡片 -->
      <view class="status-card" :class="statusClass">
        <view class="status-icon">
          <uni-icons :type="statusIcon" size="48" :color="statusIconColor"></uni-icons>
        </view>
        <view class="status-info">
          <text class="status-title">{{ statusTitle }}</text>
          <text class="status-desc">{{ statusDesc }}</text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="info-section">
        <view class="section-header">
          <text class="section-title">基本信息</text>
        </view>
        <view class="info-item">
          <text class="info-label">真实姓名</text>
          <text class="info-value">{{ userProfile.realName || '-' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">性别</text>
          <text class="info-value">{{ userProfile.gender === 1 ? '男' : userProfile.gender === 2 ? '女' : '-' }}</text>
        </view>
      </view>

      <!-- 本校学历 -->
      <view v-if="localEducations.length > 0" class="info-section">
        <view class="section-header">
          <text class="section-title">本校学历</text>
        </view>
        <view v-for="(edu, index) in localEducations" :key="index" class="edu-card">
          <view class="edu-row">
            <text class="edu-label">学历层次</text>
            <text class="edu-value">{{ getDegreeLabel(edu.degree) }}</text>
          </view>
          <view class="edu-row">
            <text class="edu-label">入学年份</text>
            <text class="edu-value">{{ edu.enrollmentYear }}级</text>
          </view>
          <view v-if="edu.college" class="edu-row">
            <text class="edu-label">学院</text>
            <text class="edu-value">{{ edu.college }}</text>
          </view>
          <view v-if="edu.major" class="edu-row">
            <text class="edu-label">专业</text>
            <text class="edu-value">{{ edu.major }}</text>
          </view>
          <view v-if="edu.className" class="edu-row">
            <text class="edu-label">班级</text>
            <text class="edu-value">{{ edu.className }}</text>
          </view>
        </view>
      </view>

      <!-- 其他学历 -->
      <view v-if="otherEducations.length > 0" class="info-section">
        <view class="section-header">
          <text class="section-title">其他学历</text>
        </view>
        <view v-for="(edu, index) in otherEducations" :key="index" class="edu-card">
          <view class="edu-row">
            <text class="edu-label">学校</text>
            <text class="edu-value">{{ edu.schoolName }}</text>
          </view>
          <view class="edu-row">
            <text class="edu-label">学历层次</text>
            <text class="edu-value">{{ getDegreeLabel(edu.degree) }}</text>
          </view>
          <view class="edu-row">
            <text class="edu-label">入学年份</text>
            <text class="edu-value">{{ edu.enrollmentYear }}级</text>
          </view>
          <view v-if="edu.major" class="edu-row">
            <text class="edu-label">专业</text>
            <text class="edu-value">{{ edu.major }}</text>
          </view>
        </view>
      </view>

      <!-- 工作信息 -->
      <view class="info-section">
        <view class="section-header">
          <text class="section-title">工作信息</text>
        </view>
        <view class="info-item">
          <text class="info-label">当前公司</text>
          <text class="info-value">{{ userProfile.currentCompany || '-' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">当前职位</text>
          <text class="info-value">{{ userProfile.currentPosition || '-' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">所在城市</text>
          <text class="info-value">{{ userProfile.city || '-' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">所在行业</text>
          <text class="info-value">{{ userProfile.industry || '-' }}</text>
        </view>
      </view>

      <!-- 个人简介 -->
      <view v-if="userProfile.bio" class="info-section">
        <view class="section-header">
          <text class="section-title">个人简介</text>
        </view>
        <view class="bio-content">
          <text>{{ userProfile.bio }}</text>
        </view>
      </view>

      <!-- 兴趣爱好 -->
      <view v-if="userProfile.interests && userProfile.interests.length > 0" class="info-section">
        <view class="section-header">
          <text class="section-title">兴趣爱好</text>
        </view>
        <view class="tags-wrap">
          <view v-for="(item, index) in userProfile.interests" :key="index" class="tag-item">
            <text>{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 底部编辑按钮 -->
    <view v-if="!loading" class="bottom-bar">
      <button class="edit-btn" @click="goToEdit">编辑资料</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      userProfile: {}
    }
  },
  computed: {
    localEducations() {
      return (this.userProfile.educations || []).filter(e => e.isLocal === true)
    },
    otherEducations() {
      return (this.userProfile.educations || []).filter(e => e.isLocal === false)
    },
    statusClass() {
      const status = this.userProfile.alumniStatus
      if (status === 1) return 'status-verified'
      if (status === 2) return 'status-rejected'
      return 'status-pending'
    },
    statusIcon() {
      const status = this.userProfile.alumniStatus
      if (status === 1) return 'checkmarkempty'
      if (status === 2) return 'closeempty'
      return 'info'
    },
    statusIconColor() {
      const status = this.userProfile.alumniStatus
      if (status === 1) return '#27AE60'
      if (status === 2) return '#E74C3C'
      return '#F39C12'
    },
    statusTitle() {
      const status = this.userProfile.alumniStatus
      if (status === 1) return '认证已通过'
      if (status === 2) return '认证未通过'
      return '待审核'
    },
    statusDesc() {
      const status = this.userProfile.alumniStatus
      if (status === 1) return '您已成为认证校友'
      if (status === 2) return this.userProfile.rejectReason || '请修改后重新提交'
      return '我们会尽快审核您的信息'
    }
  },
  onLoad() {
    this.loadUserProfile()
  },
  onShow() {
    this.loadUserProfile()
  },
  methods: {
    async loadUserProfile() {
      this.loading = true
      try {
        const alumniCo = uniCloud.importObject('alumni-co')
        const res = await alumniCo.getMyProfile()
        if (res.errCode === 0) {
          this.userProfile = res.data
          // 如果未认证，引导去认证页面
          if (!this.userProfile.alumniStatus || this.userProfile.alumniStatus < 0) {
            uni.showModal({
              title: '提示',
              content: '您还未提交校友认证，请先完成认证',
              showCancel: false,
              success: () => {
                uni.redirectTo({ url: '/pages/alumni/verify/verify' })
              }
            })
          }
        }
      } catch (e) {
        console.error('加载失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    getDegreeLabel(degree) {
      const map = { 'highschool': '高中', 'junior': '大专', 'undergraduate': '本科', 'master': '硕士', 'doctor': '博士' }
      return map[degree] || degree
    },
    goToEdit() {
      uni.navigateTo({ url: '/pages/alumni/verify/verify?mode=edit' })
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 80px;
}
.loading-wrap {
  padding: 100px 0;
}
.content-scroll {
  height: calc(100vh - 80px);
}
.status-card {
  margin: 16px;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.status-verified { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
.status-rejected { background: linear-gradient(135deg, #ffebee, #ffcdd2); }
.status-pending { background: linear-gradient(135deg, #fff3e0, #ffe0b2); }
.status-info {
  flex: 1;
}
.status-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4px;
}
.status-desc {
  font-size: 14px;
  color: #666;
}
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}
.avatar-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.info-section {
  background: #fff;
  margin: 12px 16px;
  border-radius: 12px;
  padding: 16px;
}
.section-header {
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--primary-color);
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.info-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}
.info-item:last-child {
  border-bottom: none;
}
.info-label {
  font-size: 14px;
  color: #999;
}
.info-value {
  font-size: 14px;
  color: #333;
  text-align: right;
  flex: 1;
  margin-left: 16px;
}
.edu-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}
.edu-card:last-child {
  margin-bottom: 0;
}
.edu-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}
.edu-label {
  font-size: 13px;
  color: #999;
}
.edu-value {
  font-size: 14px;
  color: #333;
  text-align: right;
}
.bio-content {
  font-size: 14px;
  color: #666;
  line-height: 22px;
}
.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-item {
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
}
.bottom-space {
  height: 20px;
}
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
}
.edit-btn {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: #fff;
  border-radius: 22px;
  font-size: 16px;
  font-weight: 600;
  border: none;
}
</style>
