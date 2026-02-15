<template>
  <view class="page-container">
    <scroll-view class="main-content" scroll-y>
      <!-- Logo上传 -->
      <view class="section">
        <text class="section-title">组织Logo</text>
        <view class="upload-area" @click="chooseLogo">
          <image
            v-if="form.logo"
            class="upload-preview"
            :src="form.logo"
            mode="aspectFill"
          ></image>
          <view v-else class="upload-placeholder">
            <uni-icons type="plusempty" size="32" color="#ccc"></uni-icons>
            <text>上传Logo</text>
          </view>
        </view>
      </view>

      <!-- 封面上传 -->
      <view class="section">
        <text class="section-title">封面图片</text>
        <view class="upload-area cover-area" @click="chooseCover">
          <image
            v-if="form.cover"
            class="upload-preview-cover"
            :src="form.cover"
            mode="aspectFill"
          ></image>
          <view v-else class="upload-placeholder">
            <uni-icons type="plusempty" size="32" color="#ccc"></uni-icons>
            <text>上传封面</text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="section">
        <text class="section-title">基本信息</text>

        <view class="form-item">
          <text class="form-label">组织名称</text>
          <input class="form-input" v-model="form.name" placeholder="请输入组织名称" maxlength="50" />
        </view>

        <view class="form-item">
          <text class="form-label">组织类型</text>
          <picker
            :range="typeOptions"
            range-key="label"
            :value="typeIndex"
            @change="onTypeChange"
            :disabled="isEdit"
          >
            <view class="picker-value">
              <text :class="{ placeholder: typeIndex < 0 }">{{ typeIndex >= 0 ? typeOptions[typeIndex].label : '请选择组织类型' }}</text>
              <uni-icons type="arrowdown" size="14" color="#999"></uni-icons>
            </view>
          </picker>
        </view>

        <!-- 类型专属字段 -->
        <view v-if="form.type === 'regional'" class="form-item">
          <text class="form-label">所在地区</text>
          <input class="form-input" v-model="form.regionText" placeholder="如：北京市 海淀区" />
        </view>

        <view v-if="form.type === 'industry'" class="form-item">
          <text class="form-label">所属行业</text>
          <input class="form-input" v-model="form.industry" placeholder="如：互联网、金融、教育" />
        </view>

        <view v-if="form.type === 'college'" class="form-item">
          <text class="form-label">所属院系</text>
          <input class="form-input" v-model="form.college" placeholder="如：计算机学院" />
        </view>

        <view v-if="form.type === 'interest'" class="form-item">
          <text class="form-label">兴趣主题</text>
          <input class="form-input" v-model="form.interest" placeholder="如：摄影、跑步、读书" />
        </view>

        <view class="form-item">
          <text class="form-label">组织简介</text>
          <textarea
            class="form-textarea"
            v-model="form.description"
            placeholder="介绍一下你的组织"
            maxlength="1000"
          ></textarea>
        </view>

        <!-- 公告（仅编辑模式） -->
        <view v-if="isEdit" class="form-item">
          <text class="form-label">组织公告</text>
          <textarea
            class="form-textarea"
            v-model="form.announcement"
            placeholder="发布组织公告"
            maxlength="500"
          ></textarea>
        </view>
      </view>
    </scroll-view>

    <!-- 底部提交按钮 -->
    <view class="footer">
      <button class="submit-btn" :loading="submitting" @click="submit">
        {{ isEdit ? '保存修改' : '创建组织' }}
      </button>
    </view>
  </view>
</template>

<script>
const orgCo = uniCloud.importObject('alumni-organization-co')

const TYPE_OPTIONS = [
  { label: '地方分会', value: 'regional' },
  { label: '行业分会', value: 'industry' },
  { label: '院系分会', value: 'college' },
  { label: '兴趣分会', value: 'interest' }
]

export default {
  data() {
    return {
      isEdit: false,
      orgId: '',
      submitting: false,
      typeOptions: TYPE_OPTIONS,
      form: {
        name: '',
        type: '',
        logo: '',
        cover: '',
        description: '',
        announcement: '',
        regionText: '',
        industry: '',
        college: '',
        interest: ''
      }
    }
  },
  computed: {
    typeIndex() {
      return TYPE_OPTIONS.findIndex(t => t.value === this.form.type)
    }
  },
  onLoad(options) {
    if (options.id) {
      this.isEdit = true
      this.orgId = options.id
      uni.setNavigationBarTitle({ title: '编辑组织' })
      this.loadOrgData()
    }
  },
  methods: {
    onTypeChange(e) {
      const index = e.detail?.value ?? e
      this.form.type = TYPE_OPTIONS[index].value
    },
    async loadOrgData() {
      try {
        const res = await orgCo.getDetail(this.orgId)
        if (res.errCode === 0) {
          const d = res.data
          this.form.name = d.name || ''
          this.form.type = d.type || ''
          this.form.logo = d.logo || ''
          this.form.cover = d.cover || ''
          this.form.description = d.description || ''
          this.form.announcement = d.announcement || ''
          this.form.industry = d.industry || ''
          this.form.college = d.college || ''
          this.form.interest = d.interest || ''
          if (d.region) {
            this.form.regionText = [d.region.province, d.region.city, d.region.district].filter(Boolean).join(' ')
          }
        }
      } catch (e) {
        console.error('加载组织数据失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    chooseLogo() {
      this.chooseAndUpload('logo')
    },
    chooseCover() {
      this.chooseAndUpload('cover')
    },
    chooseAndUpload(field) {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: async (res) => {
          const tempPath = res.tempFilePaths[0]
          uni.showLoading({ title: '上传中' })
          try {
            const uploadRes = await uniCloud.uploadFile({
              filePath: tempPath,
              cloudPath: `org-${field}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
            })
            this.form[field] = uploadRes.fileID
          } catch (e) {
            console.error('上传失败', e)
            uni.showToast({ title: '上传失败', icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    parseRegion(text) {
      if (!text) return null
      const parts = text.trim().split(/\s+/)
      return {
        province: parts[0] || '',
        city: parts[1] || '',
        district: parts[2] || ''
      }
    },
    async submit() {
      if (!this.form.name.trim()) {
        return uni.showToast({ title: '请输入组织名称', icon: 'none' })
      }
      if (!this.form.type) {
        return uni.showToast({ title: '请选择组织类型', icon: 'none' })
      }

      this.submitting = true

      const data = {
        name: this.form.name,
        type: this.form.type,
        logo: this.form.logo,
        cover: this.form.cover,
        description: this.form.description
      }

      // 类型专属字段
      if (this.form.type === 'regional') {
        data.region = this.parseRegion(this.form.regionText)
      }
      if (this.form.type === 'industry') {
        data.industry = this.form.industry
      }
      if (this.form.type === 'college') {
        data.college = this.form.college
      }
      if (this.form.type === 'interest') {
        data.interest = this.form.interest
      }

      try {
        let res
        if (this.isEdit) {
          data.announcement = this.form.announcement
          res = await orgCo.update(this.orgId, data)
        } else {
          res = await orgCo.create(data)
        }

        if (res.errCode === 0) {
          uni.showToast({ title: this.isEdit ? '保存成功' : '创建成功', icon: 'success' })
          setTimeout(() => {
            if (this.isEdit) {
              uni.navigateBack()
            } else {
              // 创建成功后跳转到详情页
              uni.redirectTo({
                url: `/pages/alumni/organizations/detail?id=${res.data.id}`
              })
            }
          }, 1500)
        } else {
          uni.showToast({ title: res.errMsg || '操作失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: e.errMsg || '操作失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
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

.main-content {
  flex: 1;
}

.section {
  margin: 20rpx;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.upload-area {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx dashed #ddd;
}

.cover-area {
  width: 100%;
  height: 240rpx;
}

.upload-preview {
  width: 160rpx;
  height: 160rpx;
}

.upload-preview-cover {
  width: 100%;
  height: 240rpx;
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;

  text {
    font-size: 24rpx;
    color: #ccc;
    margin-top: 8rpx;
  }
}

.form-item {
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  display: block;
}

.form-input {
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.picker-value {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}

.placeholder {
  color: #999;
}

.footer {
  padding: 20rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.submit-btn {
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;

  &::after {
    border: none;
  }
}
</style>
