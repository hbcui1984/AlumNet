<template>
  <view class="page-container">
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

    <!-- 推荐认证进度（如果开启） -->
    <view v-if="showRecommendProgress" class="recommend-section">
      <view class="section-header">
        <text class="section-title">校友推荐</text>
        <text class="section-subtitle">已获得 {{ recommendCount }}/{{ requiredRecommendCount }} 位校友推荐</text>
      </view>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: recommendProgress + '%' }"></view>
      </view>
      <view class="recommend-tips">
        <text class="tips-text">邀请已认证的校友为您推荐，达到 {{ requiredRecommendCount }} 人即可完成认证</text>
      </view>
    </view>

    <!-- 认证表单 -->
    <view v-if="verificationStatus !== 1" class="form-section">
      <view class="section-header">
        <text class="section-title">填写认证信息</text>
      </view>

      <!-- 真实姓名 -->
      <view class="form-item">
        <text class="form-label required">真实姓名</text>
        <input
          class="form-input"
          v-model="formData.realName"
          placeholder="请输入真实姓名"
          maxlength="20"
        />
      </view>

      <!-- 教育经历 -->
      <view class="education-section">
        <view class="education-header">
          <text class="form-label required">教育经历</text>
          <view v-if="formData.educations.length < 5" class="add-btn" @click="addEducation">
            <uni-icons type="plusempty" size="16" color="var(--primary-color)"></uni-icons>
            <text class="add-text">添加</text>
          </view>
        </view>

        <view
          v-for="(edu, index) in formData.educations"
          :key="index"
          class="education-card"
        >
          <view class="edu-header">
            <text class="edu-index">学历 {{ index + 1 }}</text>
            <view v-if="formData.educations.length > 1" class="delete-btn" @click="removeEducation(index)">
              <uni-icons type="trash" size="18" color="#999"></uni-icons>
            </view>
          </view>

          <!-- 学历类型 -->
          <view class="form-item">
            <text class="form-label required">学历类型</text>
            <picker
              :value="getDegreeIndex(edu.degree)"
              :range="degreeOptions"
              range-key="label"
              @change="onDegreeChange($event, index)"
            >
              <view class="picker-value">
                {{ getDegreeLabel(edu.degree) || '请选择学历类型' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <!-- 入学年份 -->
          <view class="form-item">
            <text class="form-label required">入学年份</text>
            <picker
              mode="selector"
              :value="getYearIndex(edu.enrollmentYear)"
              :range="yearOptions"
              @change="onEnrollmentYearChange($event, index)"
            >
              <view class="picker-value">
                {{ edu.enrollmentYear || '请选择入学年份' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <!-- 毕业年份 -->
          <view class="form-item">
            <text class="form-label">毕业年份</text>
            <picker
              mode="selector"
              :value="getYearIndex(edu.graduationYear)"
              :range="yearOptions"
              @change="onGraduationYearChange($event, index)"
            >
              <view class="picker-value">
                {{ edu.graduationYear || '请选择毕业年份（可选）' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <!-- 学院（大学） -->
          <view v-if="isUniversityDegree(edu.degree)" class="form-item">
            <text class="form-label">学院</text>
            <picker
              v-if="collegeOptions.length > 0"
              :value="getCollegeIndex(edu.college)"
              :range="collegeOptions"
              range-key="name"
              @change="onCollegeChange($event, index)"
            >
              <view class="picker-value">
                {{ edu.college || '请选择学院' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
            <input
              v-else
              class="form-input"
              v-model="edu.college"
              placeholder="请输入学院"
            />
          </view>

          <!-- 专业（大学） -->
          <view v-if="isUniversityDegree(edu.degree)" class="form-item">
            <text class="form-label">专业</text>
            <picker
              v-if="getMajorOptions(edu.college).length > 0"
              :value="getMajorIndex(edu.college, edu.major)"
              :range="getMajorOptions(edu.college)"
              @change="onMajorChange($event, index)"
            >
              <view class="picker-value">
                {{ edu.major || '请选择专业' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
            <input
              v-else
              class="form-input"
              v-model="edu.major"
              placeholder="请输入专业"
            />
          </view>

          <!-- 班级 -->
          <view class="form-item">
            <text class="form-label">班级</text>
            <input
              class="form-input"
              v-model="edu.className"
              placeholder="请输入班级（可选）"
            />
          </view>

          <!-- 学号 -->
          <view class="form-item">
            <text class="form-label">学号</text>
            <input
              class="form-input"
              v-model="edu.studentId"
              placeholder="请输入学号（可选）"
            />
          </view>

          <!-- 设为主要学历 -->
          <view v-if="formData.educations.length > 1" class="form-item row">
            <text class="form-label">设为主要学历</text>
            <switch :checked="edu.isPrimary" @change="onPrimaryChange($event, index)" />
          </view>
        </view>
      </view>

      <!-- 证明材料（如果需要） -->
      <view v-if="requireProof" class="proof-section">
        <view class="section-header">
          <text class="section-title">证明材料</text>
          <text class="section-subtitle">上传学生证、毕业证等证明材料</text>
        </view>
        <uni-file-picker
          v-model="formData.proofFiles"
          file-mediatype="image"
          mode="grid"
          :limit="3"
          @select="onProofSelect"
          @delete="onProofDelete"
        ></uni-file-picker>
      </view>

      <!-- 提交按钮 -->
      <button class="submit-btn" :loading="submitting" @click="submitVerification">
        {{ verificationStatus === 2 ? '重新提交认证' : '提交认证' }}
      </button>
    </view>

    <!-- 已认证信息展示 -->
    <view v-else class="verified-section">
      <view class="verified-info">
        <view class="info-item">
          <text class="info-label">真实姓名</text>
          <text class="info-value">{{ userProfile.realName }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">认证时间</text>
          <text class="info-value">{{ formatTime(userProfile.alumniVerifyTime) }}</text>
        </view>
        <view v-for="(edu, index) in userProfile.educations" :key="index" class="edu-info">
          <text class="edu-info-title">{{ getDegreeLabel(edu.degree) }} {{ edu.isPrimary ? '（主要）' : '' }}</text>
          <text class="edu-info-detail">{{ edu.enrollmentYear }} - {{ edu.graduationYear || '至今' }}</text>
          <text v-if="edu.college" class="edu-info-detail">{{ edu.college }} {{ edu.major }}</text>
        </view>
      </view>
      <button class="edit-btn" @click="navigateToProfile">编辑个人资料</button>
    </view>
  </view>
</template>

<script>
const alumniCo = uniCloud.importObject('alumni-co')

export default {
  data() {
    return {
      loading: true,
      submitting: false,
      verificationStatus: 0, // 0待认证 1已认证 2已拒绝
      recommendCount: 0,
      requiredRecommendCount: 3,
      enableRecommendVerify: false,
      requireProof: false,
      userProfile: {},
      schoolConfig: {},
      formData: {
        realName: '',
        educations: [
          {
            degree: '',
            enrollmentYear: null,
            graduationYear: null,
            college: '',
            major: '',
            className: '',
            studentId: '',
            isPrimary: true
          }
        ],
        proofFiles: []
      },
      degreeOptions: [
        { value: 'bachelor', label: '本科' },
        { value: 'master', label: '硕士' },
        { value: 'doctor', label: '博士' },
        { value: 'highschool', label: '高中' },
        { value: 'middleschool', label: '初中' }
      ],
      collegeOptions: [],
      yearOptions: []
    }
  },
  computed: {
    statusClass() {
      return {
        'status-pending': this.verificationStatus === 0,
        'status-verified': this.verificationStatus === 1,
        'status-rejected': this.verificationStatus === 2
      }
    },
    statusIcon() {
      const icons = {
        0: 'info',
        1: 'checkbox',
        2: 'closeempty'
      }
      return icons[this.verificationStatus] || 'info'
    },
    statusIconColor() {
      const colors = {
        0: '#F39C12',
        1: 'var(--primary-color)',
        2: '#E74C3C'
      }
      return colors[this.verificationStatus] || '#999'
    },
    statusTitle() {
      const titles = {
        0: '待认证',
        1: '已认证',
        2: '认证被拒绝'
      }
      return titles[this.verificationStatus] || '待认证'
    },
    statusDesc() {
      const descs = {
        0: '完成校友认证后可查看校友信息和发起交换名片',
        1: '您已通过校友身份认证',
        2: '您的认证信息未通过审核，请重新提交'
      }
      return descs[this.verificationStatus] || ''
    },
    showRecommendProgress() {
      return this.enableRecommendVerify && this.verificationStatus !== 1
    },
    recommendProgress() {
      return Math.min(100, (this.recommendCount / this.requiredRecommendCount) * 100)
    }
  },
  onLoad() {
    this.initYearOptions()
    this.loadData()
  },
  methods: {
    initYearOptions() {
      const currentYear = new Date().getFullYear()
      const years = []
      for (let y = currentYear; y >= 1950; y--) {
        years.push(y)
      }
      this.yearOptions = years
    },
    async loadData() {
      uni.showLoading({ title: '加载中' })
      try {
        // 并行加载数据
        const [statusRes, profileRes, configRes] = await Promise.all([
          alumniCo.getVerificationStatus(),
          alumniCo.getMyProfile(),
          alumniCo.getSchoolConfig()
        ])

        // 认证状态
        if (statusRes.errCode === 0) {
          this.verificationStatus = statusRes.data.status || 0
          this.recommendCount = statusRes.data.recommendCount || 0
          this.requiredRecommendCount = statusRes.data.requiredRecommendCount || 3
        }

        // 用户资料
        if (profileRes.errCode === 0) {
          this.userProfile = profileRes.data
          // 如果有已填写的信息，预填表单
          if (profileRes.data.realName) {
            this.formData.realName = profileRes.data.realName
          }
          if (profileRes.data.educations && profileRes.data.educations.length > 0) {
            this.formData.educations = profileRes.data.educations.map(edu => ({
              ...edu,
              isPrimary: edu.isPrimary || false
            }))
          }
        }

        // 学校配置
        if (configRes.errCode === 0) {
          this.schoolConfig = configRes.data
          const features = configRes.data.features || {}
          this.enableRecommendVerify = features.enableRecommendVerify || false
          this.requireProof = features.requireProof || false
          this.requiredRecommendCount = features.recommendCount || 3

          // 加载学院配置
          if (configRes.data.colleges) {
            this.collegeOptions = configRes.data.colleges
          }

          // 根据学校类型过滤学历选项
          if (configRes.data.type === 'highschool') {
            this.degreeOptions = [{ value: 'highschool', label: '高中' }]
          } else if (configRes.data.type === 'middleschool') {
            this.degreeOptions = [{ value: 'middleschool', label: '初中' }]
          }
        }
      } catch (e) {
        console.error('加载数据失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        uni.hideLoading()
        this.loading = false
      }
    },
    getDegreeIndex(degree) {
      return this.degreeOptions.findIndex(d => d.value === degree)
    },
    getDegreeLabel(degree) {
      const option = this.degreeOptions.find(d => d.value === degree)
      return option ? option.label : ''
    },
    getYearIndex(year) {
      return this.yearOptions.indexOf(year)
    },
    getCollegeIndex(college) {
      return this.collegeOptions.findIndex(c => c.name === college)
    },
    getMajorOptions(college) {
      const collegeObj = this.collegeOptions.find(c => c.name === college)
      return collegeObj ? collegeObj.majors : []
    },
    getMajorIndex(college, major) {
      const majors = this.getMajorOptions(college)
      return majors.indexOf(major)
    },
    isUniversityDegree(degree) {
      return ['bachelor', 'master', 'doctor'].includes(degree)
    },
    onDegreeChange(e, index) {
      const degreeIndex = e.detail.value
      this.formData.educations[index].degree = this.degreeOptions[degreeIndex].value
    },
    onEnrollmentYearChange(e, index) {
      this.formData.educations[index].enrollmentYear = this.yearOptions[e.detail.value]
    },
    onGraduationYearChange(e, index) {
      this.formData.educations[index].graduationYear = this.yearOptions[e.detail.value]
    },
    onCollegeChange(e, index) {
      const college = this.collegeOptions[e.detail.value]
      this.formData.educations[index].college = college.name
      this.formData.educations[index].major = '' // 重置专业
    },
    onMajorChange(e, index) {
      const edu = this.formData.educations[index]
      const majors = this.getMajorOptions(edu.college)
      edu.major = majors[e.detail.value]
    },
    onPrimaryChange(e, index) {
      // 只能有一个主要学历
      this.formData.educations.forEach((edu, i) => {
        edu.isPrimary = i === index && e.detail.value
      })
    },
    addEducation() {
      if (this.formData.educations.length >= 5) {
        uni.showToast({ title: '最多添加5条教育经历', icon: 'none' })
        return
      }
      this.formData.educations.push({
        degree: '',
        enrollmentYear: null,
        graduationYear: null,
        college: '',
        major: '',
        className: '',
        studentId: '',
        isPrimary: false
      })
    },
    removeEducation(index) {
      const removed = this.formData.educations.splice(index, 1)[0]
      // 如果删除的是主要学历，将第一条设为主要
      if (removed.isPrimary && this.formData.educations.length > 0) {
        this.formData.educations[0].isPrimary = true
      }
    },
    onProofSelect(e) {
      console.log('选择证明材料', e)
    },
    onProofDelete(e) {
      console.log('删除证明材料', e)
    },
    validateForm() {
      if (!this.formData.realName || this.formData.realName.length < 2) {
        uni.showToast({ title: '请输入真实姓名', icon: 'none' })
        return false
      }

      for (const edu of this.formData.educations) {
        if (!edu.degree) {
          uni.showToast({ title: '请选择学历类型', icon: 'none' })
          return false
        }
        if (!edu.enrollmentYear) {
          uni.showToast({ title: '请选择入学年份', icon: 'none' })
          return false
        }
      }

      if (this.requireProof && this.formData.proofFiles.length === 0) {
        uni.showToast({ title: '请上传证明材料', icon: 'none' })
        return false
      }

      return true
    },
    async submitVerification() {
      if (!this.validateForm()) return

      this.submitting = true
      try {
        // 上传证明材料
        let proofUrls = []
        if (this.formData.proofFiles.length > 0) {
          for (const file of this.formData.proofFiles) {
            if (file.url && !file.url.startsWith('cloud://')) {
              const uploadRes = await uniCloud.uploadFile({
                filePath: file.url,
                cloudPath: `verify-proof/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
              })
              proofUrls.push(uploadRes.fileID)
            } else if (file.url) {
              proofUrls.push(file.url)
            }
          }
        }

        const res = await alumniCo.submitVerification({
          realName: this.formData.realName,
          educations: this.formData.educations,
          proofUrls
        })

        if (res.errCode === 0) {
          uni.showToast({ title: res.errMsg, icon: 'success' })
          this.verificationStatus = res.data.status
          if (res.data.status === 1) {
            // 认证通过，刷新数据
            this.loadData()
          }
        } else {
          uni.showToast({ title: res.errMsg || '提交失败', icon: 'none' })
        }
      } catch (e) {
        console.error('提交认证失败', e)
        uni.showToast({ title: '提交失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    },
    navigateToProfile() {
      uni.navigateTo({
        url: '/pages/alumni/profile/profile'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
}

.status-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;

  &.status-pending {
    border-left: 8rpx solid #F39C12;
  }
  &.status-verified {
    border-left: 8rpx solid var(--primary-color);
  }
  &.status-rejected {
    border-left: 8rpx solid #E74C3C;
  }
}

.status-icon {
  margin-right: 24rpx;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.status-desc {
  font-size: 26rpx;
  color: #666;
}

.recommend-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.section-subtitle {
  font-size: 26rpx;
  color: #666;
  margin-left: 16rpx;
}

.progress-bar {
  height: 16rpx;
  background-color: #eee;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.recommend-tips {
  padding: 16rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
}

.tips-text {
  font-size: 24rpx;
  color: #999;
}

.form-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.form-item {
  margin-bottom: 24rpx;

  &.row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  display: block;

  &.required::before {
    content: '*';
    color: #E74C3C;
    margin-right: 4rpx;
  }
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-value {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
}

.education-section {
  margin-top: 30rpx;
}

.education-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.add-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8rpx 16rpx;
  background-color: rgba(43, 92, 230, 0.1);
  border-radius: 8rpx;
}

.add-text {
  font-size: 26rpx;
  color: var(--primary-color);
  margin-left: 4rpx;
}

.education-card {
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.edu-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #eee;
}

.edu-index {
  font-size: 28rpx;
  font-weight: bold;
  color: var(--primary-color);
}

.delete-btn {
  padding: 8rpx;
}

.proof-section {
  margin-top: 30rpx;
}

.submit-btn {
  margin-top: 40rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;
}

.verified-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.verified-info {
  margin-bottom: 30rpx;
}

.info-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #333;
}

.edu-info {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.edu-info-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.edu-info-detail {
  font-size: 26rpx;
  color: #666;
  display: block;
}

.edit-btn {
  height: 80rpx;
  line-height: 80rpx;
  background-color: #fff;
  color: var(--primary-color);
  font-size: 30rpx;
  border: 2rpx solid var(--primary-color);
  border-radius: 40rpx;
}
</style>
