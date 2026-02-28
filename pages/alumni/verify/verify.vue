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

      <!-- 性别 -->
      <view class="form-item">
        <text class="form-label required">性别</text>
        <radio-group class="radio-group-row" @change="e => formData.gender = parseInt(e.detail.value)">
          <label class="radio-label">
            <radio value="1" :checked="formData.gender === 1" color="var(--primary-color)" />
            <text>男</text>
          </label>
          <label class="radio-label">
            <radio value="2" :checked="formData.gender === 2" color="var(--primary-color)" />
            <text>女</text>
          </label>
        </radio-group>
      </view>

      <!-- 本校学历（必填） -->
      <view class="education-section">
        <view class="education-header">
          <view>
            <text class="form-label required">本校学历</text>
            <text class="edu-section-hint">{{ schoolConfig.name || '本校' }}的就读经历</text>
          </view>
          <view v-if="formData.localEducations.length < localDegreeOptions.length" class="add-btn" @click="addLocalEducation">
            <uni-icons type="plusempty" size="16" color="var(--primary-color)"></uni-icons>
            <text class="add-text">添加</text>
          </view>
        </view>

        <view
          v-for="(edu, index) in formData.localEducations"
          :key="'local_' + index"
          class="education-card local-card"
        >
          <view class="edu-header">
            <text class="edu-index">{{ getDegreeLabel(edu.degree) || '本校学历 ' + (index + 1) }}</text>
            <view v-if="formData.localEducations.length > 1" class="delete-btn" @click="removeLocalEducation(index)">
              <uni-icons type="trash" size="18" color="#999"></uni-icons>
            </view>
          </view>

          <!-- 大学类型：需要选择学历层次 -->
          <view v-if="isUniversityType" class="form-item">
            <text class="form-label required">学历层次</text>
            <picker
              :value="getLocalDegreeIndex(edu.degree)"
              :range="localDegreeOptions"
              range-key="label"
              @change="onLocalDegreeChange($event, index)"
            >
              <view class="picker-value">
                {{ getDegreeLabel(edu.degree) || '请选择学历层次' }}
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
              @change="onLocalEnrollmentYearChange($event, index)"
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
              @change="onLocalGraduationYearChange($event, index)"
            >
              <view class="picker-value">
                {{ edu.graduationYear || '请选择毕业年份（可选）' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <!-- 学院（大学类型） -->
          <view v-if="isUniversityType" class="form-item">
            <text class="form-label">学院</text>
            <picker
              v-if="collegeOptions.length > 0"
              :value="getCollegeIndex(edu.college)"
              :range="collegeOptions"
              range-key="name"
              @change="onLocalCollegeChange($event, index)"
            >
              <view class="picker-value">
                {{ edu.college || '请选择学院' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
            <input v-else class="form-input" v-model="edu.college" placeholder="请输入学院" />
          </view>

          <!-- 专业（大学类型） -->
          <view v-if="isUniversityType" class="form-item">
            <text class="form-label">专业</text>
            <picker
              v-if="getMajorOptions(edu.college).length > 0"
              :value="getMajorIndex(edu.college, edu.major)"
              :range="getMajorOptions(edu.college)"
              @change="onLocalMajorChange($event, index)"
            >
              <view class="picker-value">
                {{ edu.major || '请选择专业' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
            <input v-else class="form-input" v-model="edu.major" placeholder="请输入专业" />
          </view>

          <!-- 班级 -->
          <view class="form-item">
            <text class="form-label">班级</text>
            <input class="form-input" v-model="edu.className" placeholder="请输入班级（可选）" />
          </view>

          <!-- 班主任（高中/初中校友会） -->
          <view v-if="!isUniversityType" class="form-item">
            <text class="form-label required">班主任</text>
            <input class="form-input" v-model="edu.headTeacher" placeholder="请输入班主任姓名" />
          </view>

          <!-- 任课老师（高中/初中校友会） -->
          <view v-if="!isUniversityType" class="form-item">
            <text class="form-label">任课老师</text>
            <input class="form-input" v-model="edu.teachers" placeholder="请输入任意任课老师（可选）" />
          </view>

          <!-- 学号 -->
          <view class="form-item">
            <text class="form-label">学号</text>
            <input class="form-input" v-model="edu.studentId" placeholder="请输入学号（可选）" />
          </view>
        </view>
      </view>

      <!-- 其他学历（选填） -->
      <view class="education-section mt-section">
        <view class="education-header">
          <view>
            <text class="form-label">其他学历</text>
            <text class="edu-section-hint">非本校的学习经历（选填）</text>
          </view>
          <view v-if="formData.otherEducations.length < 3" class="add-btn" @click="addOtherEducation">
            <uni-icons type="plusempty" size="16" color="var(--primary-color)"></uni-icons>
            <text class="add-text">添加</text>
          </view>
        </view>

        <view v-if="formData.otherEducations.length === 0" class="edu-empty">
          <text class="edu-empty-text">暂无其他学历，可点击右上角添加</text>
        </view>

        <view
          v-for="(edu, index) in formData.otherEducations"
          :key="'other_' + index"
          class="education-card"
        >
          <view class="edu-header">
            <text class="edu-index">其他学历 {{ index + 1 }}</text>
            <view class="delete-btn" @click="removeOtherEducation(index)">
              <uni-icons type="trash" size="18" color="#999"></uni-icons>
            </view>
          </view>

          <!-- 学历类型 -->
          <view class="form-item">
            <text class="form-label required">学历类型</text>
            <picker
              :value="getDegreeIndex(edu.degree)"
              :range="allDegreeOptions"
              range-key="label"
              @change="onOtherDegreeChange($event, index)"
            >
              <view class="picker-value">
                {{ getDegreeLabel(edu.degree) || '请选择学历类型' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <!-- 学校名称（必填） -->
          <view class="form-item">
            <text class="form-label required">学校名称</text>
            <input class="form-input" v-model="edu.schoolName" placeholder="请输入学校名称" />
          </view>

          <!-- 入学年份 -->
          <view class="form-item">
            <text class="form-label required">入学年份</text>
            <picker
              mode="selector"
              :value="getYearIndex(edu.enrollmentYear)"
              :range="yearOptions"
              @change="onOtherEnrollmentYearChange($event, index)"
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
              @change="onOtherGraduationYearChange($event, index)"
            >
              <view class="picker-value">
                {{ edu.graduationYear || '请选择毕业年份（可选）' }}
                <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <!-- 学院/专业 -->
          <view class="form-item">
            <text class="form-label">学院</text>
            <input class="form-input" v-model="edu.college" placeholder="请输入学院（可选）" />
          </view>
          <view class="form-item">
            <text class="form-label">专业</text>
            <input class="form-input" v-model="edu.major" placeholder="请输入专业（可选）" />
          </view>
        </view>
      </view>

      <!-- 就业状态 -->
      <view class="form-item">
        <text class="form-label required">就业状态</text>
        <view class="radio-group-row">
          <view
            v-for="opt in employmentOptions"
            :key="opt.value"
            class="radio-option"
            :class="{ active: formData.employmentStatus === opt.value }"
            @click="formData.employmentStatus = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <!-- 工作单位（仅在职显示） -->
      <view v-if="formData.employmentStatus === 'employed'" class="form-item">
        <text class="form-label required">工作单位</text>
        <input
          class="form-input"
          v-model="formData.company"
          placeholder="请输入工作单位"
        />
      </view>

      <!-- 职位（仅在职显示） -->
      <view v-if="formData.employmentStatus === 'employed'" class="form-item">
        <text class="form-label required">职位</text>
        <input
          class="form-input"
          v-model="formData.position"
          placeholder="请输入职位"
        />
      </view>

      <!-- 职业描述（自由职业显示） -->
      <view v-if="formData.employmentStatus === 'freelance'" class="form-item">
        <text class="form-label">职业描述</text>
        <input
          class="form-input"
          v-model="formData.occupationDesc"
          placeholder="请简单描述您的职业（可选）"
        />
      </view>

      <!-- 对母校寄语 -->
      <view class="form-item">
        <text class="form-label">对母校寄语</text>
        <textarea
          class="form-textarea"
          v-model="formData.message"
          placeholder="请输入对母校的寄语（可选）"
          maxlength="200"
        />
      </view>

      <!-- 现居城市 -->
      <view class="form-item">
        <text class="form-label required">现居城市</text>
        <input
          class="form-input"
          v-model="formData.city"
          placeholder="请输入现居城市"
        />
      </view>

      <!-- 校友卡图片 -->
      <view class="photo-section">
        <view class="section-header">
          <text class="section-title required-title">校友卡图片（本人近期照片）</text>
        </view>
        <uni-file-picker
          v-model="formData.cardPhoto"
          file-mediatype="image"
          mode="grid"
          :limit="1"
          @select="onCardPhotoSelect"
          @delete="onCardPhotoDelete"
        ></uni-file-picker>
        <text class="upload-tips">用于制作校友卡，请上传清晰的正面照片</text>
      </view>

      <!-- 学历证书 -->
      <view class="photo-section">
        <view class="section-header">
          <text class="section-title">学历证书</text>
        </view>
        <uni-file-picker
          v-model="formData.diplomaPhoto"
          file-mediatype="image"
          mode="grid"
          :limit="3"
          @select="onDiplomaSelect"
          @delete="onDiplomaDelete"
        ></uni-file-picker>
        <text class="upload-tips">可上传毕业证、学位证等（可选）</text>
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
      <view class="verified-actions">
        <button class="card-btn" @click="navigateToCard">查看校友卡</button>
        <button class="edit-btn" @click="navigateToProfile">编辑个人资料</button>
      </view>
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
        gender: 0,
        employmentStatus: 'employed',
        company: '',
        position: '',
        occupationDesc: '',
        message: '',
        city: '',
        cardPhoto: [],
        diplomaPhoto: [],
        localEducations: [
          {
            degree: '',
            isLocal: true,
            enrollmentYear: null,
            graduationYear: null,
            college: '',
            major: '',
            className: '',
            headTeacher: '',
            middleSchool: '',
            teachers: '',
            studentId: ''
          }
        ],
        otherEducations: [],
        proofFiles: []
      },
      allDegreeOptions: [
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
    },
    // 学校类型：university, highschool, middleschool
    schoolType() {
      return this.schoolConfig.type || 'university'
    },
    // 是否为大学类型（本校学历包含大学学历）
    isUniversityType() {
      const localDegrees = this.schoolConfig.localDegrees || []
      if (localDegrees.length === 0) return this.schoolType === 'university'
      return localDegrees.some(d => ['bachelor', 'master', 'doctor'].includes(d))
    },
    // 是否为高中类型
    isHighSchoolType() {
      const localDegrees = this.schoolConfig.localDegrees || []
      if (localDegrees.length === 0) return this.schoolType === 'highschool'
      return localDegrees.includes('highschool') && !localDegrees.some(d => ['bachelor', 'master', 'doctor'].includes(d))
    },
    // 是否为初中类型
    isMiddleSchoolType() {
      const localDegrees = this.schoolConfig.localDegrees || []
      if (localDegrees.length === 0) return this.schoolType === 'middleschool'
      return localDegrees.includes('middleschool') && !localDegrees.some(d => ['bachelor', 'master', 'doctor'].includes(d))
    },
    // 本校可选的学历层次（大学类型才需要选）
    localDegreeOptions() {
      const localDegrees = this.schoolConfig.localDegrees || ['bachelor', 'master', 'doctor']
      return this.allDegreeOptions.filter(d => localDegrees.includes(d.value))
    },
    employmentOptions() {
      return [
        { value: 'employed', label: '在职' },
        { value: 'freelance', label: '自由职业' },
        { value: 'retired', label: '退休' },
        { value: 'student', label: '在读学生' }
      ]
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

        // 学校配置（先加载，因为后面预填表单需要用到 schoolType）
        if (configRes.errCode === 0) {
          this.schoolConfig = configRes.data
          const features = configRes.data.features || {}
          this.enableRecommendVerify = features.enableRecommendVerify || false
          this.requireProof = features.requireProof || false
          this.requiredRecommendCount = features.recommendCount || 3
          if (configRes.data.colleges) {
            this.collegeOptions = configRes.data.colleges
          }
          // 非大学类型：初始本校学历自动设置 degree
          if (configRes.data.type && configRes.data.type !== 'university') {
            this.formData.localEducations[0].degree = configRes.data.type
          }
          // 大学类型但只有一个学历选项时，也自动选中
          if (configRes.data.type === 'university') {
            const localDegrees = configRes.data.localDegrees || []
            if (localDegrees.length === 1) {
              this.formData.localEducations.forEach(edu => {
                if (!edu.degree) edu.degree = localDegrees[0]
              })
            }
          }
        }

        // 用户资料
        if (profileRes.errCode === 0) {
          this.userProfile = profileRes.data
          if (profileRes.data.realName) {
            this.formData.realName = profileRes.data.realName
          }
          if (profileRes.data.gender) {
            this.formData.gender = profileRes.data.gender
          }
          if (profileRes.data.employmentStatus) {
            this.formData.employmentStatus = profileRes.data.employmentStatus
          }
          if (profileRes.data.currentCompany) {
            this.formData.company = profileRes.data.currentCompany
          }
          if (profileRes.data.currentPosition) {
            this.formData.position = profileRes.data.currentPosition
          }
          if (profileRes.data.occupationDesc) {
            this.formData.occupationDesc = profileRes.data.occupationDesc
          }
          if (profileRes.data.city) {
            this.formData.city = profileRes.data.city
          }
          if (profileRes.data.educations && profileRes.data.educations.length > 0) {
            const localEds = profileRes.data.educations.filter(e => e.isLocal !== false)
            const otherEds = profileRes.data.educations.filter(e => e.isLocal === false)
            if (localEds.length > 0) {
              this.formData.localEducations = localEds
            }
            if (otherEds.length > 0) {
              this.formData.otherEducations = otherEds
            }
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
      const collegeObj = this.collegeOptions.find(c => c.name === college)
      return collegeObj ? collegeObj.majors : []
    },
    getMajorIndex(college, major) {
      const majors = this.getMajorOptions(college)
      return majors.indexOf(major)
    },
    // 本校学历操作
    addLocalEducation() {
      if (this.formData.localEducations.length >= 3) {
        uni.showToast({ title: '本校学历最多3条', icon: 'none' })
        return
      }
      const localDegrees = this.schoolConfig.localDegrees || []
      const defaultDegree = this.isUniversityType
        ? (localDegrees.length === 1 ? localDegrees[0] : '')
        : this.schoolType
      this.formData.localEducations.push({
        degree: defaultDegree,
        isLocal: true,
        enrollmentYear: null,
        graduationYear: null,
        college: '',
        major: '',
        className: '',
        headTeacher: '',
        middleSchool: '',
        teachers: '',
        studentId: ''
      })
    },
    removeLocalEducation(index) {
      this.formData.localEducations.splice(index, 1)
    },
    onLocalDegreeChange(e, index) {
      const val = e.detail?.value ?? e
      this.formData.localEducations[index].degree = this.localDegreeOptions[val].value
    },
    onLocalEnrollmentYearChange(e, index) {
      const val = e.detail?.value ?? e
      this.formData.localEducations[index].enrollmentYear = this.yearOptions[val]
    },
    onLocalGraduationYearChange(e, index) {
      const val = e.detail?.value ?? e
      this.formData.localEducations[index].graduationYear = this.yearOptions[val]
    },
    onLocalCollegeChange(e, index) {
      const val = e.detail?.value ?? e
      this.formData.localEducations[index].college = this.collegeOptions[val].name
      this.formData.localEducations[index].major = ''
    },
    onLocalMajorChange(e, index) {
      const val = e.detail?.value ?? e
      const edu = this.formData.localEducations[index]
      const majors = this.getMajorOptions(edu.college)
      edu.major = majors[val]
    },
    // 其他学历操作
    addOtherEducation() {
      if (this.formData.otherEducations.length >= 3) {
        uni.showToast({ title: '其他学历最多3条', icon: 'none' })
        return
      }
      this.formData.otherEducations.push({
        degree: '',
        isLocal: false,
        schoolName: '',
        enrollmentYear: null,
        graduationYear: null,
        college: '',
        major: ''
      })
    },
    removeOtherEducation(index) {
      this.formData.otherEducations.splice(index, 1)
    },
    onOtherDegreeChange(e, index) {
      const val = e.detail?.value ?? e
      this.formData.otherEducations[index].degree = this.allDegreeOptions[val].value
    },
    onOtherEnrollmentYearChange(e, index) {
      const val = e.detail?.value ?? e
      this.formData.otherEducations[index].enrollmentYear = this.yearOptions[val]
    },
    onOtherGraduationYearChange(e, index) {
      const val = e.detail?.value ?? e
      this.formData.otherEducations[index].graduationYear = this.yearOptions[val]
    },
    onProofSelect(e) {
      console.log('选择证明材料', e)
    },
    onProofDelete(e) {
      console.log('删除证明材料', e)
    },
    onCardPhotoSelect(e) {
      console.log('选择校友卡照片', e)
      console.log('tempFiles:', e.tempFiles)
      console.log('tempFilePaths:', e.tempFilePaths)
      if (e.tempFiles && e.tempFiles.length > 0) {
        console.log('第一个文件对象:', e.tempFiles[0])
      }
    },
    onCardPhotoDelete(e) {
      console.log('删除校友卡照片', e)
    },
    onDiplomaSelect(e) {
      console.log('选择学历证书', e)
    },
    onDiplomaDelete(e) {
      console.log('删除学历证书', e)
    },
    validateForm() {
      if (!this.formData.realName || this.formData.realName.length < 2) {
        uni.showToast({ title: '请输入真实姓名', icon: 'none' })
        return false
      }

      if (!this.formData.gender) {
        uni.showToast({ title: '请选择性别', icon: 'none' })
        return false
      }

      // 验证本校学历
      for (const edu of this.formData.localEducations) {
        if (this.isUniversityType && !edu.degree) {
          uni.showToast({ title: '请选择学历层次', icon: 'none' })
          return false
        }
        if (!edu.enrollmentYear) {
          uni.showToast({ title: '请选择入学年份', icon: 'none' })
          return false
        }
        if (!this.isUniversityType && !edu.headTeacher) {
          uni.showToast({ title: '请输入班主任姓名', icon: 'none' })
          return false
        }
      }

      // 验证其他学历
      for (const edu of this.formData.otherEducations) {
        if (!edu.degree) {
          uni.showToast({ title: '请选择其他学历的学历类型', icon: 'none' })
          return false
        }
        if (!edu.schoolName) {
          uni.showToast({ title: '请输入其他学历的学校名称', icon: 'none' })
          return false
        }
        if (!edu.enrollmentYear) {
          uni.showToast({ title: '请选择其他学历的入学年份', icon: 'none' })
          return false
        }
      }

      if (this.formData.employmentStatus === 'employed') {
        if (!this.formData.company) {
          uni.showToast({ title: '请输入工作单位', icon: 'none' })
          return false
        }
        if (!this.formData.position) {
          uni.showToast({ title: '请输入职位', icon: 'none' })
          return false
        }
      }

      if (!this.formData.city) {
        uni.showToast({ title: '请输入现居城市', icon: 'none' })
        return false
      }

      if (!this.formData.cardPhoto || this.formData.cardPhoto.length === 0) {
        uni.showToast({ title: '请上传校友卡照片', icon: 'none' })
        return false
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
        // 上传校友卡照片
        let cardPhotoUrl = ''
        if (this.formData.cardPhoto.length > 0) {
          const file = this.formData.cardPhoto[0]
          const filePath = file.path || file.url
          console.log('准备上传文件，路径:', filePath, '完整对象:', file)

          // 如果已经是云存储URL或HTTPS URL，直接使用
          if (filePath && (filePath.startsWith('cloud://') || filePath.startsWith('https://') || filePath.startsWith('http://'))) {
            cardPhotoUrl = filePath
          } else if (filePath) {
            // 本地文件才需要上传
            const uploadRes = await uniCloud.uploadFile({
              filePath: filePath,
              cloudPath: `alumni-card-photo/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
            })
            cardPhotoUrl = uploadRes.fileID
          }
        }

        // 上传学历证书
        let diplomaUrls = []
        if (this.formData.diplomaPhoto.length > 0) {
          for (const file of this.formData.diplomaPhoto) {
            const filePath = file.path || file.url
            // 如果已经是云存储URL或HTTPS URL，直接使用
            if (filePath && (filePath.startsWith('cloud://') || filePath.startsWith('https://') || filePath.startsWith('http://'))) {
              diplomaUrls.push(filePath)
            } else if (filePath) {
              // 本地文件才需要上传
              const uploadRes = await uniCloud.uploadFile({
                filePath: filePath,
                cloudPath: `diploma-photo/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
              })
              diplomaUrls.push(uploadRes.fileID)
            }
          }
        }

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

        // 合并本校学历和其他学历，本校学历标记 isLocal=true
        const localEds = this.formData.localEducations.map(e => ({ ...e, isLocal: true }))
        // 非大学类型自动设置 degree
        if (!this.isUniversityType) {
          localEds.forEach(e => { e.degree = this.schoolType })
        }
        const otherEds = this.formData.otherEducations.map(e => ({ ...e, isLocal: false }))
        const educations = [...localEds, ...otherEds]

        const res = await alumniCo.submitVerification({
          realName: this.formData.realName,
          gender: this.formData.gender,
          employmentStatus: this.formData.employmentStatus,
          company: this.formData.company,
          position: this.formData.position,
          occupationDesc: this.formData.occupationDesc,
          message: this.formData.message,
          city: this.formData.city,
          cardPhotoUrl,
          diplomaUrls,
          educations,
          proofUrls,
          schoolType: this.schoolType
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
    navigateToCard() {
      uni.navigateTo({
        url: '/pages/alumni/card/card'
      })
    },
    navigateToProfile() {
      uni.navigateTo({
        url: '/pages/alumni/verify/verify'
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

.radio-group-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16rpx;
}

.radio-option {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  border: 1rpx solid #ddd;
  font-size: 28rpx;
  color: #666;
  background: #f5f5f5;

  &.active {
    border-color: var(--primary-color);
    color: var(--primary-color);
    background: var(--primary-light, #eef2ff);
  }
}

.radio-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 0;
  margin-right: 40rpx;
  font-size: 28rpx;
  color: #333;
}

.radio-label text {
  margin-left: 12rpx;
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

.form-textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.photo-section {
  margin-top: 30rpx;
}

.required-title::before {
  content: '*';
  color: #E74C3C;
  margin-right: 4rpx;
}

.upload-tips {
  font-size: 24rpx;
  color: #999;
  margin-top: 12rpx;
  display: block;
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
  margin-bottom: 40rpx;
  height: 88rpx;
  line-height: 88rpx;
  background-color: var(--primary-color, #2B5CE6);
  background-image: linear-gradient(135deg, var(--primary-color, #2B5CE6), var(--primary-light, #5B7FED));
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;

  &::after {
    border: none;
  }
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

.verified-actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.card-btn {
  height: 80rpx;
  line-height: 80rpx;
  background-color: var(--primary-color, #2B5CE6);
  color: #fff;
  font-size: 30rpx;
  border-radius: 40rpx;
  border: none;
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

.local-card {
  border-left: 4rpx solid var(--primary-color, #2B5CE6);
}

.edu-section-hint {
  font-size: 24rpx;
  color: #999;
  margin-left: 12rpx;
}

.mt-section {
  margin-top: 30rpx;
}

.edu-empty {
  padding: 30rpx 0;
  text-align: center;
}

.edu-empty-text {
  font-size: 26rpx;
  color: #bbb;
}
</style>
