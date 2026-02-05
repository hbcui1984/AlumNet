<template>
  <view class="page-container">
    <view v-if="loading" class="loading-wrap">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <template v-else>
      <!-- 头像 -->
      <view class="avatar-section" @click="chooseAvatar">
        <image
          class="avatar"
          :src="formData.avatar || '/static/default-avatar.png'"
          mode="aspectFill"
        ></image>
        <text class="avatar-tip">点击更换头像</text>
      </view>

      <!-- 基本信息 -->
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">真实姓名</text>
          <input
            class="form-input"
            v-model="formData.realName"
            placeholder="请输入真实姓名"
            maxlength="20"
          />
        </view>

        <view class="form-item">
          <text class="form-label">个人简介</text>
          <textarea
            class="form-textarea"
            v-model="formData.bio"
            placeholder="介绍一下自己吧"
            maxlength="500"
          ></textarea>
        </view>
      </view>

      <!-- 工作信息 -->
      <view class="form-section">
        <view class="section-title">工作信息</view>

        <view class="form-item">
          <text class="form-label">所在公司</text>
          <input
            class="form-input"
            v-model="formData.currentCompany"
            placeholder="请输入公司名称"
            maxlength="100"
          />
        </view>

        <view class="form-item">
          <text class="form-label">职位</text>
          <input
            class="form-input"
            v-model="formData.currentPosition"
            placeholder="请输入职位"
            maxlength="50"
          />
        </view>

        <view class="form-item">
          <text class="form-label">行业</text>
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
      <view class="form-section">
        <view class="section-title">所在地</view>

        <view class="form-item">
          <text class="form-label">省份</text>
          <input
            class="form-input"
            v-model="formData.province"
            placeholder="请输入省份"
            maxlength="50"
          />
        </view>

        <view class="form-item">
          <text class="form-label">城市</text>
          <input
            class="form-input"
            v-model="formData.city"
            placeholder="请输入城市"
            maxlength="50"
          />
        </view>
      </view>

      <!-- 兴趣标签 -->
      <view class="form-section">
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
      <view class="form-section">
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

      <!-- 保存按钮 -->
      <button class="save-btn" :loading="saving" @click="saveProfile">保存</button>
    </template>
  </view>
</template>

<script>
const alumniCo = uniCloud.importObject('alumni-co')

export default {
  data() {
    return {
      loading: true,
      saving: false,
      formData: {
        avatar: '',
        realName: '',
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
      industryOptions: [],
      interestOptions: []
    }
  },
  computed: {
    industryIndex() {
      return this.industryOptions.findIndex(i => i.value === this.formData.industry)
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true

      try {
        // 并行加载数据
        const [profileRes, dictRes] = await Promise.all([
          alumniCo.getMyProfile(),
          alumniCo.getDictionaries(['industry', 'interest'])
        ])

        // 加载用户资料
        if (profileRes.errCode === 0) {
          const data = profileRes.data
          this.formData = {
            avatar: data.avatar || '',
            realName: data.realName || '',
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
      const index = e.detail.value
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
      this.formData.profileVisible = e.detail.value
    },
    onContactVisibleChange(e) {
      this.formData.contactVisible = e.detail.value
    },
    async saveProfile() {
      if (!this.formData.realName) {
        uni.showToast({ title: '请输入真实姓名', icon: 'none' })
        return
      }

      this.saving = true

      try {
        const res = await alumniCo.updateMyProfile(this.formData)
        if (res.errCode === 0) {
          uni.showToast({ title: '保存成功', icon: 'success' })
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
        this.saving = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
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
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
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

.save-btn {
  position: fixed;
  bottom: 40rpx;
  left: 40rpx;
  right: 40rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;
}
</style>
