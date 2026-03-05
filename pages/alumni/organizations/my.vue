<template>
  <view class="my-org-page">
    <view class="tabs">
      <view v-for="tab in tabs" :key="tab.value" class="tab-item" :class="{ active: currentTab === tab.value }" @click="onTabChange(tab.value)">
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view class="scroll-view" scroll-y @scrolltolower="loadMore">
      <view v-if="orgList.length > 0" class="org-list">
        <view v-for="org in orgList" :key="org._id" class="org-item" @click="goToDetail(org._id)">
          <image class="org-logo" :src="org.logo || '/static/default-org.png'" mode="aspectFill"></image>
          <view class="org-content">
            <view class="org-header">
              <text class="org-name">{{ org.name }}</text>
              <view v-if="currentTab === 'created'" class="status-badge" :class="'status-' + org.auditStatus">
                {{ getAuditStatusText(org.auditStatus) }}
              </view>
            </view>
            <view class="org-meta">
              <text class="member-count">{{ org.memberCount }}人</text>
              <text v-if="currentTab === 'joined' && org.memberRole" class="role-tag">{{ getRoleLabel(org.memberRole) }}</text>
            </view>
            <view v-if="currentTab === 'created' && canOperate(org)" class="action-btns">
              <text v-if="org.status !== 2" class="btn-dissolve" @click.stop="dissolveOrg(org)">解散</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-state">
        <image class="empty-icon" src="/static/uni-load-state/disconnection.png" mode="aspectFit"></image>
        <text class="empty-text">{{ currentTab === 'joined' ? '暂未加入组织' : '暂未创建组织' }}</text>
      </view>

      <view v-if="loading" class="loading-state">
        <uni-load-more status="loading"></uni-load-more>
      </view>
      <view v-else-if="!hasMore && orgList.length > 0" class="loading-state">
        <uni-load-more status="noMore"></uni-load-more>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      currentTab: 'joined',
      tabs: [
        { label: '我加入的', value: 'joined' },
        { label: '我创建的', value: 'created' }
      ],
      orgList: [],
      pageNum: 1,
      pageSize: 10,
      hasMore: true,
      loading: false
    }
  },
  onLoad() {
    this.loadOrgList()
  },
  methods: {
    async loadOrgList() {
      if (this.loading || !this.hasMore) return

      this.loading = true
      try {
        const orgCo = uniCloud.importObject('alumni-organization-co')
        const res = await orgCo.getMyOrganizations({
          type: this.currentTab,
          pageNum: this.pageNum,
          pageSize: this.pageSize
        })

        if (res.errCode === 0) {
          if (this.pageNum === 1) {
            this.orgList = res.data.list
          } else {
            this.orgList = [...this.orgList, ...res.data.list]
          }
          this.hasMore = res.data.hasMore
        } else {
          uni.showToast({ title: res.errMsg, icon: 'none' })
        }
      } catch (e) {
        console.error('加载失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.pageNum++
        this.loadOrgList()
      }
    },
    onTabChange(value) {
      this.currentTab = value
      this.pageNum = 1
      this.orgList = []
      this.hasMore = true
      this.loadOrgList()
    },
    getAuditStatusText(status) {
      const map = { 0: '待审核', 1: '已通过', 2: '已拒绝' }
      return map[status] || ''
    },
    getRoleLabel(role) {
      const map = { creator: '创建者', admin: '管理员', member: '成员' }
      return map[role] || ''
    },
    canOperate(org) {
      return org.auditStatus === 1 && org.status !== 2
    },
    dissolveOrg(org) {
      uni.showModal({
        title: '确认解散',
        content: '确定要解散该组织吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const orgCo = uniCloud.importObject('alumni-organization-co')
              const result = await orgCo.dissolveOrganization(org._id)
              if (result.errCode === 0) {
                uni.showToast({ title: '已解散', icon: 'success' })
                this.pageNum = 1
                this.orgList = []
                this.loadOrgList()
              } else {
                uni.showToast({ title: result.errMsg, icon: 'none' })
              }
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    goToDetail(id) {
      uni.navigateTo({ url: `/pages/organization/detail?id=${id}` })
    }
  }
}
</script>

<style scoped>
.my-org-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.tabs {
  display: flex;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  font-size: 15px;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: #2B5CE6;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background-color: #2B5CE6;
  border-radius: 2px;
}

.scroll-view {
  flex: 1;
  padding: 10px;
}

.org-list {
  display: flex;
  flex-direction: column;
}

.org-item {
  display: flex;
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.org-logo {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  margin-right: 12px;
}

.org-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.org-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.org-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-right: 8px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-0 {
  background-color: #fff3e0;
  color: #ff9800;
}

.status-1 {
  background-color: #e8f5e9;
  color: #4caf50;
}

.status-2 {
  background-color: #ffebee;
  color: #f44336;
}

.org-meta {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.member-count {
  margin-right: 12px;
}

.role-tag {
  padding: 2px 8px;
  background-color: #e3f2fd;
  color: #2196f3;
  border-radius: 4px;
}

.action-btns {
  display: flex;
}

.btn-dissolve {
  font-size: 13px;
  color: #f44336;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 100px;
}

.empty-icon {
  width: 120px;
  height: 120px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #999;
}

.loading-state {
  padding: 20px;
}
</style>
