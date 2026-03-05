<template>
  <view class="detail-page">
    <scroll-view v-if="org" class="scroll-view" scroll-y>
      <view class="org-header">
        <image class="org-logo" :src="org.logo || '/static/default-org.png'" mode="aspectFill"></image>
        <view class="org-info">
          <text class="org-name">{{ org.name }}</text>
          <view class="org-tags">
            <view class="tag">{{ getTypeLabel(org.type) }}</view>
            <view class="tag">{{ getJoinTypeLabel(org.joinType) }}</view>
          </view>
          <text class="member-count">{{ org.memberCount }}名成员</text>
        </view>
      </view>

      <view class="org-desc">
        <text class="desc-title">组织简介</text>
        <text class="desc-text">{{ org.description || '暂无简介' }}</text>
      </view>

      <view v-if="!memberInfo" class="action-section">
        <button class="join-btn" @click="joinOrg">加入组织</button>
      </view>

      <view v-else-if="memberInfo.status === 0" class="status-tip">
        <text>申请审核中...</text>
      </view>

      <view v-else-if="memberInfo.status === 1" class="action-section">
        <button class="leave-btn" @click="leaveOrg">退出组织</button>
      </view>
    </scroll-view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orgId: '',
      org: null,
      memberInfo: null,
      loading: true
    }
  },
  onLoad(options) {
    this.orgId = options.id
    this.loadDetail()
  },
  methods: {
    async loadDetail() {
      this.loading = true
      try {
        const orgCo = uniCloud.importObject('alumni-organization-co')
        const res = await orgCo.getOrganizationDetail(this.orgId)

        if (res.errCode === 0) {
          this.org = res.data
          this.memberInfo = res.data.memberInfo
        } else {
          uni.showToast({ title: res.errMsg, icon: 'none' })
        }
      } catch (e) {
        console.error('加载详情失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    getTypeLabel(type) {
      const map = { region: '地域', industry: '行业', grade: '年级', interest: '兴趣' }
      return map[type] || ''
    },
    getJoinTypeLabel(type) {
      const map = { open: '开放加入', audit: '审核加入', invite: '邀请加入' }
      return map[type] || ''
    },
    async joinOrg() {
      try {
        uni.showLoading({ title: '加入中' })
        const orgCo = uniCloud.importObject('alumni-organization-co')
        const res = await orgCo.joinOrganization(this.orgId)

        if (res.errCode === 0) {
          uni.showToast({ title: res.errMsg, icon: 'success' })
          this.loadDetail()
        } else {
          uni.showToast({ title: res.errMsg, icon: 'none' })
        }
      } catch (e) {
        console.error('加入失败', e)
        uni.showToast({ title: '加入失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    leaveOrg() {
      uni.showModal({
        title: '确认退出',
        content: '确定要退出该组织吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const orgCo = uniCloud.importObject('alumni-organization-co')
              const result = await orgCo.leaveOrganization(this.orgId)

              if (result.errCode === 0) {
                uni.showToast({ title: '已退出', icon: 'success' })
                setTimeout(() => uni.navigateBack(), 1500)
              } else {
                uni.showToast({ title: result.errMsg, icon: 'none' })
              }
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' })
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.scroll-view {
  padding: 16px;
}

.org-header {
  display: flex;
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
}

.org-logo {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  margin-right: 16px;
}

.org-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.org-name {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.org-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.tag {
  padding: 4px 12px;
  background-color: #e3f2fd;
  color: #2196f3;
  font-size: 12px;
  border-radius: 4px;
}

.member-count {
  font-size: 14px;
  color: #999;
}

.org-desc {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
}

.desc-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12px;
}

.desc-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.action-section {
  padding: 20px 0;
}

.join-btn {
  width: 100%;
  padding: 14px;
  border-radius: 24px;
  background: linear-gradient(135deg, #2B5CE6, #5B7FED);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
}

.leave-btn {
  width: 100%;
  padding: 14px;
  border-radius: 24px;
  background-color: #fff;
  color: #f44336;
  font-size: 16px;
  border: 1px solid #f44336;
}

.status-tip {
  background-color: #fff3e0;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  color: #ff9800;
  font-size: 14px;
}

.loading-state {
  padding: 100px 0;
}
</style>
