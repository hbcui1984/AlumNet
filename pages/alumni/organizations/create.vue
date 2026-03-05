<template>
  <view class="create-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="form-container">
        <view class="form-item required">
          <text class="item-label">组织名称</text>
          <input class="item-input" v-model="formData.name" placeholder="请输入组织名称" maxlength="50" />
        </view>

        <view class="form-item required">
          <text class="item-label">组织类型</text>
          <picker :value="typeIndex" :range="typeOptions" range-key="label" @change="onTypeChange">
            <view class="picker-value">
              {{ formData.type ? getTypeLabel(formData.type) : '请选择组织类型' }}
              <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="item-label">组织Logo</text>
          <view class="upload-logo" @click="chooseImage">
            <image v-if="formData.logo" class="logo-preview" :src="formData.logo" mode="aspectFill"></image>
            <view v-else class="logo-placeholder">
              <uni-icons type="image" size="40" color="#ccc"></uni-icons>
              <text>点击上传</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="item-label">组织简介</text>
          <textarea class="item-textarea" v-model="formData.description" placeholder="请简要介绍组织" maxlength="200"></textarea>
        </view>

        <view class="form-item required">
          <text class="item-label">加入方式</text>
          <radio-group @change="e => formData.joinType = e.detail.value">
            <label class="radio-item" v-for="item in joinTypeOptions" :key="item.value">
              <radio :value="item.value" :checked="formData.joinType === item.value" color="#2B5CE6" />
              <text>{{ item.label }}</text>
            </label>
          </radio-group>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-bar">
      <button class="submit-btn" @click="onSubmit">创建组织</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      formData: {
        name: '',
        type: '',
        logo: '',
        description: '',
        joinType: 'open'
      },
      typeOptions: [
        { value: 'region', label: '地域组织' },
        { value: 'industry', label: '行业组织' },
        { value: 'grade', label: '年级组织' },
        { value: 'interest', label: '兴趣组织' }
      ],
      joinTypeOptions: [
        { value: 'open', label: '开放加入' },
        { value: 'audit', label: '审核加入' },
        { value: 'invite', label: '邀请加入' }
      ]
    }
  },
  computed: {
    typeIndex() {
      return this.typeOptions.findIndex(t => t.value === this.formData.type)
    }
  },
  methods: {
    onTypeChange(e) {
      this.formData.type = this.typeOptions[e.detail.value].value
    },
    getTypeLabel(type) {
      const item = this.typeOptions.find(t => t.value === type)
      return item ? item.label : ''
    },
    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.uploadImage(res.tempFilePaths[0])
        }
      })
    },
    async uploadImage(filePath) {
      try {
        uni.showLoading({ title: '上传中' })
        const result = await uniCloud.uploadFile({
          filePath,
          cloudPath: `org-logos/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        })
        this.formData.logo = result.fileID
        uni.hideLoading()
      } catch (e) {
        console.error('上传失败', e)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
    async onSubmit() {
      if (!this.formData.name.trim()) {
        uni.showToast({ title: '请输入组织名称', icon: 'none' })
        return
      }
      if (!this.formData.type) {
        uni.showToast({ title: '请选择组织类型', icon: 'none' })
        return
      }

      try {
        uni.showLoading({ title: '创建中' })
        const orgCo = uniCloud.importObject('alumni-organization-co')
        const res = await orgCo.createOrganization({
          ...this.formData,
          status: 1
        })

        if (res.errCode === 0) {
          uni.showModal({
            title: '提交成功',
            content: '组织已提交，等待管理员审核',
            showCancel: false,
            success: () => {
              uni.navigateBack()
            }
          })
        } else {
          uni.showToast({ title: res.errMsg, icon: 'none' })
        }
      } catch (e) {
        console.error('创建失败', e)
        uni.showToast({ title: '创建失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>

<style scoped>
.create-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.form-scroll {
  flex: 1;
  padding-bottom: 80px;
}

.form-container {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin: 10px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item.required .item-label::before {
  content: '*';
  color: #ff5722;
  margin-right: 4px;
}

.item-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  display: block;
}

.item-input {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
}

.upload-logo {
  width: 100px;
  height: 100px;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.logo-preview {
  width: 100%;
  height: 100%;
}

.logo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 12px;
}

.item-textarea {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  min-height: 100px;
}

.radio-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.radio-item text {
  margin-left: 8px;
  font-size: 14px;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background-color: #fff;
  border-top: 1px solid #eee;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  border-radius: 24px;
  background: linear-gradient(135deg, #2B5CE6, #5B7FED);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
}
</style>
