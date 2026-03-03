<template>
  <view class="page-container">
    <view v-if="loading" class="loading-wrap">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <template v-else>
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

      <!-- 头像 -->
      <view class="avatar-section" @click="chooseAvatar">
        <image
          class="avatar"
          :src="formData.avatar || '/static/default-avatar.png'"
          mode="aspectFill"
        ></image>
        <text class="avatar-tip">点击更换头像</text>
      </view>

      <!-- 认证信息区域 -->
      <view class="form-section auth-section">
        <view class="section-header">
          <view class="section-title-row">
            <uni-icons type="locked" size="20" color="#E74C3C"></uni-icons>
            <text class="section-title">认证信息</text>
            <text class="auth-badge">需审核</text>
          </view>
          <text class="section-desc">修改后需要重新提交审核</text>
        </view>

        <!-- 真实姓名 -->
        <view class="form-item">
          <text class="form-label required">真实姓名</text>
          <input class="form-input" v-model="authData.realName" placeholder="请输入真实姓名" maxlength="20" />
        </view>

        <!-- 性别 -->
        <view class="form-item">
          <text class="form-label required">性别</text>
          <radio-group class="radio-group-row" @change="e => authData.gender = parseInt(e.detail.value)">
            <label class="radio-label">
              <radio value="1" :checked="authData.gender === 1" color="var(--primary-color)" />
              <text>男</text>
            </label>
            <label class="radio-label">
              <radio value="2" :checked="authData.gender === 2" color="var(--primary-color)" />
              <text>女</text>
            </label>
          </radio-group>
        </view>

        <!-- 本校学历 -->
        <view class="education-section">
          <view class="education-header">
            <view>
              <text class="form-label required">本校学历</text>
              <text class="edu-section-hint">{{ schoolConfig.name || '本校' }}的就读经历</text>
            </view>
            <view v-if="authData.localEducations.length < localDegreeOptions.length" class="add-btn" @click="addLocalEducation">
              <uni-icons type="plusempty" size="16" color="var(--primary-color)"></uni-icons>
              <text class="add-text">添加</text>
            </view>
          </view>

          <view v-for="(edu, index) in authData.localEducations" :key="'local_' + index" class="education-card local-card">
            <view class="edu-header">
              <text class="edu-index">{{ getDegreeLabel(edu.degree) || '本校学历 ' + (index + 1) }}</text>
              <view v-if="authData.localEducations.length > 1" class="delete-btn" @click="removeLocalEducation(index)">
                <uni-icons type="trash" size="18" color="#999"></uni-icons>
              </view>
            </view>

            <view v-if="isUniversityType" class="form-item">
              <text class="form-label required">学历层次</text>
              <picker :value="getLocalDegreeIndex(edu.degree)" :range="localDegreeOptions" range-key="label" @change="onLocalDegreeChange($event, index)">
                <view class="picker-value">
                  {{ getDegreeLabel(edu.degree) || '请选择学历层次' }}
                  <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
                </view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label required">入学年份</text>
              <picker mode="selector" :value="getYearIndex(edu.enrollmentYear)" :range="yearOptions" @change="onLocalEnrollmentYearChange($event, index)">
                <view class="picker-value">
                  {{ edu.enrollmentYear || '请选择入学年份' }}
                  <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
                </view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label optional">毕业年份</text>
              <picker mode="selector" :value="getYearIndex(edu.graduationYear)" :range="yearOptions" @change="onLocalGraduationYearChange($event, index)">
                <view class="picker-value">
                  {{ edu.graduationYear || '请选择毕业年份' }}
                  <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
                </view>
              </picker>
            </view>

            <view v-if="isUniversityType" class="form-item">
              <text class="form-label optional">学院</text>
              <picker v-if="collegeOptions.length > 0" :value="getCollegeIndex(edu.college)" :range="collegeOptions" range-key="name" @change="onLocalCollegeChange($event, index)">
                <view class="picker-value">
                  {{ edu.college || '请选择学院' }}
                  <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
                </view>
              </picker>
              <input v-else class="form-input" v-model="edu.college" placeholder="请输入学院" />
            </view>

            <view v-if="isUniversityType" class="form-item">
              <text class="form-label optional">专业</text>
              <picker v-if="getMajorOptions(edu.college).length > 0" :value="getMajorIndex(edu.college, edu.major)" :range="getMajorOptions(edu.college)" @change="onLocalMajorChange($event, index)">
                <view class="picker-value">
                  {{ edu.major || '请选择专业' }}
                  <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
                </view>
              </picker>
              <input v-else class="form-input" v-model="edu.major" placeholder="请输入专业" />
            </view>

            <view class="form-item">
              <text class="form-label optional">班级</text>
              <input class="form-input" v-model="edu.className" placeholder="请输入班级" />
            </view>

            <view v-if="!isUniversityType" class="form-item">
              <text class="form-label required">班主任</text>
              <input class="form-input" v-model="edu.headTeacher" placeholder="请输入班主任姓名" />
            </view>

            <view v-if="!isUniversityType" class="form-item">
              <text class="form-label optional">任课老师</text>
              <input class="form-input" v-model="edu.teachers" placeholder="请输入任意任课老师" />
            </view>

            <view class="form-item">
              <text class="form-label optional">学号</text>
              <input class="form-input" v-model="edu.studentId" placeholder="请输入学号" />
            </view>
          </view>
        </view>

      </view>

      <!-- 其他学历（无需审核） -->
      <view class="form-section extended-section">
        <view class="section-header">
          <view class="section-title-row">
            <text class="section-title">其他学历</text>
            <text class="extended-badge">无需审核</text>
          </view>
          <text class="section-desc">非本校的学习经历，保存后立即生效</text>
        </view>
        <view class="education-section">
          <view class="education-header">
            <view></view>
            <view v-if="authData.otherEducations.length < 3" class="add-btn" @click="addOtherEducation">
              <uni-icons type="plusempty" size="16" color="var(--primary-color)"></uni-icons>
              <text class="add-text">添加</text>
            </view>
          </view>

          <view v-if="authData.otherEducations.length === 0" class="edu-empty">
            <text class="edu-empty-text">暂无其他学历，可点击右上角添加</text>
          </view>

          <view v-for="(edu, index) in authData.otherEducations" :key="'other_' + index" class="education-card">
            <view class="edu-header">
              <text class="edu-index">其他学历 {{ index + 1 }}</text>
              <view class="delete-btn" @click="removeOtherEducation(index)">
                <uni-icons type="trash" size="18" color="#999"></uni-icons>
              </view>
            </view>

            <view class="form-item">
              <text class="form-label required">学历类型</text>
              <picker :value="getDegreeIndex(edu.degree)" :range="allDegreeOptions" range-key="label" @change="onOtherDegreeChange($event, index)">
                <view class="picker-value">
                  {{ getDegreeLabel(edu.degree) || '请选择学历类型' }}
                  <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
                </view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label required">学校名称</text>
              <input class="form-input" v-model="edu.schoolName" placeholder="请输入学校名称" />
            </view>

            <view class="form-item">
              <text class="form-label required">入学年份</text>
              <picker mode="selector" :value="getYearIndex(edu.enrollmentYear)" :range="yearOptions" @change="onOtherEnrollmentYearChange($event, index)">
                <view class="picker-value">
                  {{ edu.enrollmentYear || '请选择入学年份' }}
                  <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
                </view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label optional">毕业年份</text>
              <picker mode="selector" :value="getYearIndex(edu.graduationYear)" :range="yearOptions" @change="onOtherGraduationYearChange($event, index)">
                <view class="picker-value">
                  {{ edu.graduationYear || '请选择毕业年份' }}
                  <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
                </view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label optional">专业</text>
              <input class="form-input" v-model="edu.major" placeholder="请输入专业" />
            </view>
          </view>
        </view>

        <button v-if="hasOtherChanges" class="save-extended-btn" :loading="savingOther" @click="saveOtherEducations">
          保存其他学历
        </button>
      </view>

      <!-- 扩展资料区域 -->
      <view class="form-section extended-section">
        <view class="section-header">
          <view class="section-title-row">
            <text class="section-title">扩展资料</text>
            <text class="extended-badge">无需审核</text>
          </view>
          <text class="section-desc">以下信息可随时修改，立即生效</text>
        </view>

        <!-- 个人简介 -->
        <view class="form-item">
          <text class="form-label optional">个人简介</text>
          <textarea
            class="form-textarea"
            v-model="formData.bio"
            placeholder="介绍一下自己吧"
            maxlength="500"
          ></textarea>
        </view>
      </view>

      <!-- 工作信息 -->
      <view class="form-section extended-section">
        <view class="section-title">工作信息</view>

        <view class="form-item">
          <text class="form-label optional">所在公司</text>
          <input
            class="form-input"
            v-model="formData.currentCompany"
            placeholder="请输入公司名称"
            maxlength="100"
          />
        </view>

        <view class="form-item">
          <text class="form-label optional">职位</text>
          <input
            class="form-input"
            v-model="formData.currentPosition"
            placeholder="请输入职位"
            maxlength="50"
          />
        </view>

        <view class="form-item">
          <text class="form-label optional">行业</text>
          <picker
            :value="industryIndex"
            :range="industryOptions"
            range-key="label"
            @change="onIndustryChange"
          >
            <view class="picker-value">
              {{ getIndustryLabel() || '请选择行业' }}
              <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
            </view>
          </picker>
        </view>
      </view>

      <!-- 所在地 -->
      <view class="form-section extended-section">
        <view class="section-title">所在地</view>

        <view class="form-item">
          <text class="form-label optional">省份</text>
          <input
            class="form-input"
            v-model="formData.province"
            placeholder="请输入省份"
            maxlength="50"
          />
        </view>

        <view class="form-item">
          <text class="form-label optional">城市</text>
          <input
            class="form-input"
            v-model="formData.city"
            placeholder="请输入城市"
            maxlength="50"
          />
        </view>
      </view>

      <!-- 兴趣爱好 -->
      <view class="form-section extended-section">
        <view class="section-title">兴趣爱好</view>
        <view class="interests-wrap">
          <view
            v-for="(interest, index) in interestOptions"
            :key="interest.value"
            class="interest-tag"
            :class="{ active: formData.interests.includes(interest.value) }"
            @click="toggleInterest(interest.value)"
          >
            {{ interest.label }}
          </view>
        </view>
        <text class="tips">最多选择10个兴趣标签</text>
      </view>

      <!-- 隐私设置 -->
      <view class="form-section extended-section">
        <view class="section-title">隐私设置</view>

        <view class="form-item row">
          <text class="form-label">在校友列表中可见</text>
          <switch :checked="formData.profileVisible" @change="onProfileVisibleChange" />
        </view>

        <view class="form-item row">
          <text class="form-label">联系方式对好友可见</text>
          <switch :checked="formData.contactVisible" @change="onContactVisibleChange" />
        </view>
      </view>

      <!-- 双按钮 -->
      <view class="button-group">
        <button class="save-extended-btn" :loading="savingExtended" @click="saveExtendedInfo">
          保存扩展资料
        </button>
        <button
          v-if="hasAuthChanges"
          class="save-auth-btn"
          :loading="savingAuth"
          @click="saveAuthInfo"
        >
          提交认证修改
        </button>
      </view>
    </template>
  </view>
</template>

<script>
const alumniCo = uniCloud.importObject('alumni-co')

export default {
  data() {
    return {
      loading: true,
      savingExtended: false,
      savingAuth: false,
      savingOther: false,
      originalOtherEducations: null,
      verificationStatus: 0, // 0-待审核 1-已通过 2-已拒绝

      // 认证信息（需审核）
      authData: {
        realName: '',
        gender: 0,
        localEducations: [{
          degree: '',
          isLocal: true,
          enrollmentYear: null,
          graduationYear: null,
          college: '',
          major: '',
          className: '',
          headTeacher: '',
          teachers: '',
          studentId: ''
        }],
        otherEducations: [],
      },

      // 原始认证信息（用于检测变化）
      originalAuthData: null,

      // 扩展资料（无需审核）
      formData: {
        avatar: '',
        bio: '',
        currentCompany: '',
        currentPosition: '',
        industry: '',
        province: '',
        city: '',
        interests: [],
        profileVisible: true,
        contactVisible: true
      },

      allDegreeOptions: [
        { value: 'bachelor', label: '本科' },
        { value: 'master', label: '硕士' },
        { value: 'doctor', label: '博士' },
        { value: 'highschool', label: '高中' },
        { value: 'middleschool', label: '初中' }
      ],
      schoolConfig: {},
      collegeOptions: [],
      yearOptions: [],
      industryOptions: [],
      interestOptions: []
    }
  },
  computed: {
    industryIndex() {
      return this.industryOptions.findIndex(i => i.value === this.formData.industry)
    },

    statusClass() {
      return {
        'status-pending': this.verificationStatus === 0,
        'status-approved': this.verificationStatus === 1,
        'status-rejected': this.verificationStatus === 2
      }
    },

    statusIcon() {
      return this.verificationStatus === 1 ? 'checkmarkempty' :
             this.verificationStatus === 2 ? 'closeempty' : 'info'
    },

    statusIconColor() {
      return this.verificationStatus === 1 ? '#27AE60' :
             this.verificationStatus === 2 ? '#E74C3C' : '#F39C12'
    },

    statusTitle() {
      return this.verificationStatus === 1 ? '认证已通过' :
             this.verificationStatus === 2 ? '认证未通过' : '待审核'
    },

    statusDesc() {
      return this.verificationStatus === 1 ? '您已成为认证校友' :
             this.verificationStatus === 2 ? '请修改后重新提交' : '管理员正在审核您的认证信息'
    },

    hasAuthChanges() {
      if (!this.originalAuthData) return false
      const cur = { ...this.authData, otherEducations: [] }
      const orig = { ...this.originalAuthData, otherEducations: [] }
      return JSON.stringify(cur) !== JSON.stringify(orig)
    },

    hasOtherChanges() {
      if (!this.originalOtherEducations) return false
      return JSON.stringify(this.authData.otherEducations) !== JSON.stringify(this.originalOtherEducations)
    },

    isUniversityType() {
      const localDegrees = this.schoolConfig.localDegrees || []
      if (localDegrees.length === 0) return (this.schoolConfig.type || 'university') === 'university'
      return localDegrees.some(d => ['bachelor', 'master', 'doctor'].includes(d))
    },

    localDegreeOptions() {
      const localDegrees = this.schoolConfig.localDegrees || ['bachelor', 'master', 'doctor']
      return this.allDegreeOptions.filter(d => localDegrees.includes(d.value))
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
      for (let y = currentYear; y >= 1950; y--) years.push(y)
      this.yearOptions = years
    },
    async loadData() {
      this.loading = true

      try {
        // 并行加载数据
        const [profileRes, dictRes, configRes] = await Promise.all([
          alumniCo.getMyProfile(),
          alumniCo.getDictionaries(['industry', 'interest']),
          alumniCo.getSchoolConfig()
        ])

        // 学校配置
        if (configRes.errCode === 0) {
          this.schoolConfig = configRes.data
          if (configRes.data.colleges) this.collegeOptions = configRes.data.colleges
        }

        // 加载用户资料
        if (profileRes.errCode === 0) {
          const data = profileRes.data

          // 认证状态
          this.verificationStatus = data.alumniStatus || 0

          // 认证信息回填
          const localEds = (data.educations || []).filter(e => e.isLocal !== false)
          const otherEds = (data.educations || []).filter(e => e.isLocal === false)

          this.authData = {
            realName: data.realName || '',
            gender: data.gender || 0,
            localEducations: localEds.length > 0 ? localEds : [{
              degree: this.schoolConfig.type !== 'university' ? (this.schoolConfig.type || '') : '',
              isLocal: true,
              enrollmentYear: null,
              graduationYear: null,
              college: '',
              major: '',
              className: '',
              headTeacher: '',
              teachers: '',
              studentId: ''
            }],
            otherEducations: otherEds
          }

          // 保存原始认证信息
          this.originalAuthData = JSON.parse(JSON.stringify(this.authData))
          this.originalOtherEducations = JSON.parse(JSON.stringify(this.authData.otherEducations))

          // 扩展资料
          this.formData = {
            avatar: data.avatar || '',
            bio: data.bio || '',
            currentCompany: data.currentCompany || '',
            currentPosition: data.currentPosition || '',
            industry: data.industry || '',
            province: data.province || '',
            city: data.city || '',
            interests: data.interests || [],
            profileVisible: data.profileVisible !== false,
            contactVisible: data.contactVisible !== false
          }
        }

        // 加载字典数据
        if (dictRes.errCode === 0) {
          this.industryOptions = (dictRes.data.industry || []).map(item => ({
            value: item.value,
            label: item.label
          }))
          this.interestOptions = (dictRes.data.interest || []).map(item => ({
            value: item.value,
            label: item.label
          }))
        }
      } catch (e) {
        console.error('加载数据失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    chooseAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0]
          uni.showLoading({ title: '上传中' })

          try {
            const uploadRes = await uniCloud.uploadFile({
              filePath: tempFilePath,
              cloudPath: `avatars/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
            })
            this.formData.avatar = uploadRes.fileID
            uni.showToast({ title: '上传成功', icon: 'success' })
          } catch (e) {
            console.error('上传头像失败', e)
            uni.showToast({ title: '上传失败', icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    onIndustryChange(e) {
      const index = e.detail?.value ?? e
      this.formData.industry = this.industryOptions[index]?.value || ''
    },
    getIndustryLabel() {
      const option = this.industryOptions.find(i => i.value === this.formData.industry)
      return option ? option.label : ''
    },
    toggleInterest(value) {
      const index = this.formData.interests.indexOf(value)
      if (index > -1) {
        this.formData.interests.splice(index, 1)
      } else {
        if (this.formData.interests.length >= 10) {
          uni.showToast({ title: '最多选择10个兴趣', icon: 'none' })
          return
        }
        this.formData.interests.push(value)
      }
    },
    onProfileVisibleChange(e) {
      this.formData.profileVisible = e.detail?.value ?? e
    },
    onContactVisibleChange(e) {
      this.formData.contactVisible = e.detail?.value ?? e
    },

    // 认证信息辅助方法
    getDegreeIndex(degree) {
      return this.allDegreeOptions.findIndex(d => d.value === degree)
    },
    getLocalDegreeIndex(degree) {
      return this.localDegreeOptions.findIndex(d => d.value === degree)
    },
    getDegreeLabel(degree) {
      const option = this.allDegreeOptions.find(d => d.value === degree)
      return option ? option.label : ''
    },
    getYearIndex(year) {
      return this.yearOptions.indexOf(year)
    },
    getCollegeIndex(college) {
      return this.collegeOptions.findIndex(c => c.name === college)
    },
    getMajorOptions(college) {
      const c = this.collegeOptions.find(c => c.name === college)
      return c ? c.majors : []
    },
    getMajorIndex(college, major) {
      return this.getMajorOptions(college).indexOf(major)
    },

    // 本校学历操作
    addLocalEducation() {
      if (this.authData.localEducations.length >= 3) {
        uni.showToast({ title: '本校学历最多3条', icon: 'none' })
        return
      }
      const localDegrees = this.schoolConfig.localDegrees || []
      this.authData.localEducations.push({
        degree: this.isUniversityType ? (localDegrees.length === 1 ? localDegrees[0] : '') : (this.schoolConfig.type || ''),
        isLocal: true,
        enrollmentYear: null,
        graduationYear: null,
        college: '',
        major: '',
        className: '',
        headTeacher: '',
        teachers: '',
        studentId: ''
      })
    },
    removeLocalEducation(index) {
      this.authData.localEducations.splice(index, 1)
    },
    onLocalDegreeChange(e, index) {
      const val = e.detail?.value ?? e
      this.authData.localEducations[index].degree = this.localDegreeOptions[val].value
    },
    onLocalEnrollmentYearChange(e, index) {
      this.authData.localEducations[index].enrollmentYear = this.yearOptions[e.detail?.value ?? e]
    },
    onLocalGraduationYearChange(e, index) {
      this.authData.localEducations[index].graduationYear = this.yearOptions[e.detail?.value ?? e]
    },
    onLocalCollegeChange(e, index) {
      const val = e.detail?.value ?? e
      this.authData.localEducations[index].college = this.collegeOptions[val]?.name || ''
      this.authData.localEducations[index].major = ''
    },
    onLocalMajorChange(e, index) {
      const val = e.detail?.value ?? e
      const majors = this.getMajorOptions(this.authData.localEducations[index].college)
      this.authData.localEducations[index].major = majors[val] || ''
    },

    // 其他学历操作
    addOtherEducation() {
      if (this.authData.otherEducations.length >= 3) {
        uni.showToast({ title: '其他学历最多3条', icon: 'none' })
        return
      }
      this.authData.otherEducations.push({
        degree: '',
        isLocal: false,
        schoolName: '',
        enrollmentYear: null,
        graduationYear: null,
        major: ''
      })
    },
    removeOtherEducation(index) {
      this.authData.otherEducations.splice(index, 1)
    },
    onOtherDegreeChange(e, index) {
      const val = e.detail?.value ?? e
      this.authData.otherEducations[index].degree = this.allDegreeOptions[val].value
    },
    onOtherEnrollmentYearChange(e, index) {
      this.authData.otherEducations[index].enrollmentYear = this.yearOptions[e.detail?.value ?? e]
    },
    onOtherGraduationYearChange(e, index) {
      this.authData.otherEducations[index].graduationYear = this.yearOptions[e.detail?.value ?? e]
    },

    // 保存扩展资料
    async saveExtendedInfo() {
      this.savingExtended = true

      try {
        const res = await alumniCo.updateMyProfile(this.formData)
        if (res.errCode === 0) {
          uni.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 1500
          })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } else {
          uni.showToast({ title: res.errMsg || '保存失败', icon: 'none' })
        }
      } catch (e) {
        console.error('保存失败', e)
        uni.showToast({ title: '保存失败', icon: 'none' })
      } finally {
        this.savingExtended = false
      }
    },

    // 提交认证修改
    async saveAuthInfo() {
      if (!this.authData.realName) {
        uni.showToast({ title: '请输入真实姓名', icon: 'none' })
        return
      }
      if (!this.authData.gender) {
        uni.showToast({ title: '请选择性别', icon: 'none' })
        return
      }
      for (let i = 0; i < this.authData.localEducations.length; i++) {
        const edu = this.authData.localEducations[i]
        if (this.isUniversityType && !edu.degree) {
          uni.showToast({ title: `请选择本校学历${i + 1}的学历层次`, icon: 'none' })
          return
        }
        if (!edu.enrollmentYear) {
          uni.showToast({ title: `请选择本校学历${i + 1}的入学年份`, icon: 'none' })
          return
        }
        if (!this.isUniversityType && !edu.headTeacher) {
          uni.showToast({ title: `请输入本校学历${i + 1}的班主任`, icon: 'none' })
          return
        }
      }
      const confirmRes = await new Promise(resolve => {
        uni.showModal({
          title: '提示',
          content: '修改认证信息后需要重新审核，确定要提交吗？',
          success: res => resolve(res.confirm)
        })
      })
      if (!confirmRes) return

      this.savingAuth = true
      try {
        const educations = [
          ...this.authData.localEducations.map(e => ({ ...e, isLocal: true })),
          ...this.authData.otherEducations.map(e => ({ ...e, isLocal: false }))
        ]
        const res = await alumniCo.submitVerification({
          realName: this.authData.realName,
          gender: this.authData.gender,
          educations
        })
        if (res.errCode === 0) {
          uni.showToast({ title: '提交成功，等待审核', icon: 'success' })
          this.originalAuthData = JSON.parse(JSON.stringify(this.authData))
          this.originalOtherEducations = JSON.parse(JSON.stringify(this.authData.otherEducations))
          this.verificationStatus = 0
        } else {
          uni.showToast({ title: res.errMsg || '提交失败', icon: 'none' })
        }
      } catch (e) {
        console.error('提交失败', e)
        uni.showToast({ title: '提交失败', icon: 'none' })
      } finally {
        this.savingAuth = false
      }
    },

    async saveOtherEducations() {
      for (let i = 0; i < this.authData.otherEducations.length; i++) {
        const edu = this.authData.otherEducations[i]
        if (!edu.degree) {
          uni.showToast({ title: `请选择其他学历${i + 1}的学历类型`, icon: 'none' })
          return
        }
        if (!edu.schoolName) {
          uni.showToast({ title: `请输入其他学历${i + 1}的学校名称`, icon: 'none' })
          return
        }
        if (!edu.enrollmentYear) {
          uni.showToast({ title: `请选择其他学历${i + 1}的入学年份`, icon: 'none' })
          return
        }
      }
      this.savingOther = true
      try {
        const res = await alumniCo.updateVerifiedProfile({
          type: 'otherEducations',
          otherEducations: this.authData.otherEducations
        })
        if (res.errCode === 0) {
          uni.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 1500
          })
          this.originalOtherEducations = JSON.parse(JSON.stringify(this.authData.otherEducations))
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } else {
          uni.showToast({ title: res.errMsg || '保存失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '保存失败', icon: 'none' })
      } finally {
        this.savingOther = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 180rpx;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

// 认证状态卡片
.status-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 32rpx;
  margin: 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);

  &.status-pending {
    border-left: 8rpx solid #F39C12;
  }

  &.status-approved {
    border-left: 8rpx solid #27AE60;
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
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.status-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
}

.avatar-tip {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: var(--primary-color);
}

.form-section {
  background-color: #fff;
  padding: 24rpx;
  margin-bottom: 20rpx;

  &.auth-section {
    border-left: 4rpx solid #E74C3C;
  }

  &.extended-section {
    border-left: 4rpx solid #27AE60;
  }
}

.section-header {
  margin-bottom: 24rpx;
}

.section-title-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-left: 8rpx;
}

.auth-badge {
  margin-left: 12rpx;
  padding: 4rpx 12rpx;
  font-size: 22rpx;
  color: #E74C3C;
  background-color: rgba(231, 76, 60, 0.1);
  border-radius: 8rpx;
}

.extended-badge {
  margin-left: 12rpx;
  padding: 4rpx 12rpx;
  font-size: 22rpx;
  color: #27AE60;
  background-color: rgba(39, 174, 96, 0.1);
  border-radius: 8rpx;
}

.section-desc {
  font-size: 24rpx;
  color: #999;
  margin-left: 28rpx;
}

.form-item {
  margin-bottom: 24rpx;

  &.row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  &:last-child {
    margin-bottom: 0;
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

  &.optional::after {
    content: '（选填）';
    color: #999;
    font-size: 24rpx;
    margin-left: 8rpx;
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

.form-textarea {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
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

// 单选框组
.radio-group {
  display: flex;
  flex-direction: row;
  gap: 40rpx;
}

.radio-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 28rpx;
  color: #333;

  text {
    margin-left: 12rpx;
  }
}

.interests-wrap {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.interest-tag {
  padding: 12rpx 24rpx;
  margin: 0 12rpx 12rpx 0;
  font-size: 26rpx;
  color: #666;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  border: 2rpx solid transparent;

  &.active {
    color: var(--primary-color);
    background-color: rgba(43, 92, 230, 0.1);
    border-color: var(--primary-color);
  }
}

.tips {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

// 双按钮组
.button-group {
  position: fixed;
  bottom: 40rpx;
  left: 40rpx;
  right: 40rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.save-extended-btn {
  height: 88rpx;
  line-height: 88rpx;
  background-color: #27AE60;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;

  &::after {
    border: none;
  }
}

.save-auth-btn {
  height: 88rpx;
  line-height: 88rpx;
  background-color: #E74C3C;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;

  &::after {
    border: none;
  }
}

.radio-group-row {
  display: flex;
  flex-direction: row;
}

.radio-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 40rpx;
  font-size: 28rpx;
  color: #333;
}

.education-section {
  margin-bottom: 24rpx;
}

.mt-section {
  margin-top: 8rpx;
}

.education-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.edu-section-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}

.add-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8rpx 16rpx;
}

.add-text {
  font-size: 26rpx;
  color: var(--primary-color);
  margin-left: 4rpx;
}

.education-card {
  padding: 24rpx;
  margin-bottom: 16rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;

  &.local-card {
    border-left: 4rpx solid var(--primary-color);
  }
}

.edu-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.edu-index {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.edu-empty {
  padding: 24rpx;
  text-align: center;
}

.edu-empty-text {
  font-size: 26rpx;
  color: #999;
}

.delete-btn {
  padding: 8rpx;
}
</style>
