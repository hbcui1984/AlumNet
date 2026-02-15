<template>
  <view class="publish-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="form-container">
        <!-- 基本信息 -->
        <view class="form-section">
          <view class="section-title">
            <text>基本信息</text>
          </view>

          <view class="form-item required">
            <text class="item-label">活动标题</text>
            <input 
              class="item-input" 
              v-model="formData.title" 
              placeholder="请输入活动标题（最多100字）"
              maxlength="100"
            />
          </view>

          <view class="form-item">
            <text class="item-label">活动封面</text>
            <view class="upload-cover" @click="chooseImage">
              <image v-if="formData.cover" class="cover-preview" :src="formData.cover" mode="aspectFill"></image>
              <view v-else class="cover-placeholder">
                <uni-icons type="image" size="40" color="#ccc"></uni-icons>
                <text>点击上传封面</text>
              </view>
            </view>
          </view>

          <view class="form-item">
            <text class="item-label">活动简介</text>
            <textarea 
              class="item-textarea" 
              v-model="formData.description" 
              placeholder="请简要描述活动内容"
              maxlength="500"
            ></textarea>
          </view>
        </view>

        <!-- 时间地点 -->
        <view class="form-section">
          <view class="section-title">
            <text>时间地点</text>
          </view>

          <view class="form-item required">
            <text class="item-label">活动类型</text>
            <view class="radio-group">
              <label class="radio-item" v-for="type in activityTypes" :key="type.value">
                <radio 
                  :value="type.value" 
                  :checked="formData.type === type.value"
                  @click="formData.type = type.value"
                />
                <text>{{ type.label }}</text>
              </label>
            </view>
          </view>

          <view class="form-item required">
            <text class="item-label">开始时间</text>
            <picker 
              mode="date" 
              :value="startDate" 
              @change="onStartDateChange"
            >
              <view class="picker-value">
                <text>{{ startDate || '请选择日期' }}</text>
              </view>
            </picker>
            <picker 
              mode="time" 
              :value="startTime" 
              @change="onStartTimeChange"
            >
              <view class="picker-value">
                <text>{{ startTime || '请选择时间' }}</text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="item-label">结束时间</text>
            <picker 
              mode="date" 
              :value="endDate" 
              @change="onEndDateChange"
            >
              <view class="picker-value">
                <text>{{ endDate || '请选择日期' }}</text>
              </view>
            </picker>
            <picker 
              mode="time" 
              :value="endTime" 
              @change="onEndTimeChange"
            >
              <view class="picker-value">
                <text>{{ endTime || '请选择时间' }}</text>
              </view>
            </picker>
          </view>

          <view v-if="formData.type !== 'online'" class="form-item required">
            <text class="item-label">活动地点</text>
            <input 
              class="item-input" 
              v-model="formData.locationName" 
              placeholder="请输入活动地点"
            />
          </view>

          <view v-if="formData.type !== 'online'" class="form-item">
            <text class="item-label">详细地址</text>
            <input 
              class="item-input" 
              v-model="formData.locationAddress" 
              placeholder="请输入详细地址"
            />
          </view>

          <view v-if="formData.type !== 'offline'" class="form-item">
            <text class="item-label">线上链接</text>
            <input 
              class="item-input" 
              v-model="formData.onlineLink" 
              placeholder="请输入线上活动链接"
            />
          </view>
        </view>

        <!-- 报名设置 -->
        <view class="form-section">
          <view class="section-title">
            <text>报名设置</text>
          </view>

          <view class="form-item">
            <text class="item-label">人数限制</text>
            <input 
              class="item-input" 
              v-model="formData.maxParticipants" 
              type="number"
              placeholder="0表示不限制"
            />
          </view>

          <view class="form-item">
            <text class="item-label">活动费用（元）</text>
            <input 
              class="item-input" 
              v-model="formData.fee" 
              type="digit"
              placeholder="0表示免费"
            />
          </view>

          <view class="form-item">
            <text class="item-label">报名截止</text>
            <picker 
              mode="date" 
              :value="deadlineDate" 
              @change="onDeadlineDateChange"
            >
              <view class="picker-value">
                <text>{{ deadlineDate || '默认活动开始时间' }}</text>
              </view>
            </picker>
            <picker 
              mode="time" 
              :value="deadlineTime" 
              @change="onDeadlineTimeChange"
            >
              <view class="picker-value">
                <text>{{ deadlineTime || '请选择时间' }}</text>
              </view>
            </picker>
          </view>
        </view>

        <!-- 活动标签 -->
        <view class="form-section">
          <view class="section-title">
            <text>活动标签</text>
          </view>
          <view class="form-item">
            <view class="tags-input">
              <view v-for="(tag, index) in formData.tags" :key="index" class="tag-item">
                <text>{{ tag }}</text>
                <view class="tag-remove" @click="removeTag(index)">
                  <uni-icons type="close" size="12" color="#999"></uni-icons>
                </view>
              </view>
              <input 
                class="tag-input" 
                v-model="tagInput" 
                placeholder="输入标签后回车"
                @confirm="addTag"
              />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <button class="submit-btn" @click="onSubmit">发布活动</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      formData: {
        title: '',
        cover: '',
        description: '',
        type: 'offline',
        locationName: '',
        locationAddress: '',
        onlineLink: '',
        maxParticipants: 0,
        fee: 0,
        tags: []
      },
      activityTypes: [
        { label: '线下活动', value: 'offline' },
        { label: '线上活动', value: 'online' },
        { label: '线上线下', value: 'hybrid' }
      ],
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      deadlineDate: '',
      deadlineTime: '',
      tagInput: ''
    }
  },
  methods: {
    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0]
          this.uploadImage(tempFilePath)
        }
      })
    },
    async uploadImage(filePath) {
      try {
        uni.showLoading({ title: '上传中' })
        const result = await uniCloud.uploadFile({
          filePath: filePath,
          cloudPath: `activity-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        })
        this.formData.cover = result.fileID
        uni.hideLoading()
      } catch (e) {
        console.error('上传失败', e)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
    onStartDateChange(e) {
      this.startDate = e.detail?.value ?? e
    },
    onStartTimeChange(e) {
      this.startTime = e.detail?.value ?? e
    },
    onEndDateChange(e) {
      this.endDate = e.detail?.value ?? e
    },
    onEndTimeChange(e) {
      this.endTime = e.detail?.value ?? e
    },
    onDeadlineDateChange(e) {
      this.deadlineDate = e.detail?.value ?? e
    },
    onDeadlineTimeChange(e) {
      this.deadlineTime = e.detail?.value ?? e
    },
    addTag() {
      if (this.tagInput.trim() && !this.formData.tags.includes(this.tagInput.trim())) {
        this.formData.tags.push(this.tagInput.trim())
        this.tagInput = ''
      }
    },
    removeTag(index) {
      this.formData.tags.splice(index, 1)
    },
    validateForm() {
      if (!this.formData.title.trim()) {
        uni.showToast({ title: '请输入活动标题', icon: 'none' })
        return false
      }
      if (!this.startDate || !this.startTime) {
        uni.showToast({ title: '请选择活动开始时间', icon: 'none' })
        return false
      }
      if (this.formData.type !== 'online' && !this.formData.locationName.trim()) {
        uni.showToast({ title: '请输入活动地点', icon: 'none' })
        return false
      }
      return true
    },
    async onSubmit() {
      if (!this.validateForm()) {
        return
      }

      try {
        uni.showLoading({ title: '发布中' })

        // 组装时间戳
        const startTimestamp = new Date(`${this.startDate} ${this.startTime}`).getTime()
        let endTimestamp = null
        if (this.endDate && this.endTime) {
          endTimestamp = new Date(`${this.endDate} ${this.endTime}`).getTime()
        }
        let deadlineTimestamp = null
        if (this.deadlineDate && this.deadlineTime) {
          deadlineTimestamp = new Date(`${this.deadlineDate} ${this.deadlineTime}`).getTime()
        }

        const activityData = {
          title: this.formData.title.trim(),
          cover: this.formData.cover,
          description: this.formData.description.trim(),
          type: this.formData.type,
          startTime: startTimestamp,
          endTime: endTimestamp,
          signupDeadline: deadlineTimestamp,
          maxParticipants: parseInt(this.formData.maxParticipants) || 0,
          fee: parseFloat(this.formData.fee) || 0,
          tags: this.formData.tags,
          status: 1 // 直接发布为报名中
        }

        // 地点信息
        if (this.formData.type !== 'online') {
          activityData.location = {
            name: this.formData.locationName.trim(),
            address: this.formData.locationAddress.trim()
          }
        }

        // 线上链接
        if (this.formData.type !== 'offline' && this.formData.onlineLink) {
          activityData.onlineLink = this.formData.onlineLink.trim()
        }

        const activityCo = uniCloud.importObject('alumni-activity-co')
        const res = await activityCo.publishActivity(activityData)

        if (res.errCode === 0) {
          uni.showToast({ title: '发布成功', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } else {
          uni.showToast({ title: res.errMsg, icon: 'none' })
        }
      } catch (e) {
        console.error('发布失败', e)
        uni.showToast({ title: '发布失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>

<style scoped>
.publish-page {
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
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.form-section {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #2B5CE6;
}

.form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.form-item:last-child {
  margin-bottom: 0;
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
}

.item-input {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
}

.item-textarea {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  min-height: 100px;
}

.upload-cover {
  width: 100%;
  height: 200px;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.cover-preview {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}

.radio-group {
  display: flex;
  flex-direction: row;
}

.radio-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 20px;
}

.radio-item text {
  margin-left: 6px;
  font-size: 14px;
  color: #333;
}

.picker-value {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 8px;
}

.picker-value text {
  font-size: 15px;
  color: #333;
}

.tags-input {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  min-height: 44px;
}

.tag-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px 10px;
  margin: 4px;
  border-radius: 4px;
  background-color: #e3f2fd;
  color: #2196f3;
  font-size: 13px;
}

.tag-remove {
  margin-left: 6px;
}

.tag-input {
  flex: 1;
  min-width: 100px;
  padding: 4px 8px;
  font-size: 14px;
  border: none;
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
