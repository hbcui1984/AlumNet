<template>
  <view class="org-list-page">
    <scroll-view class="scroll-view" scroll-y @scrolltolower="loadMore">
      <view v-if="orgList.length > 0" class="org-list">
        <view v-for="org in orgList" :key="org._id" class="org-item" @click="goToDetail(org._id)">
          <image class="org-logo" :src="org.logo || '/static/default-org.png'" mode="aspectFill"></image>
          <view class="org-content">
            <view class="org-header">
              <text class="org-name">{{ org.name }}</text>
              <view class="org-type">{{ getTypeLabel(org.type) }}</view>
            </view>
            <text class="org-desc">{{ org.description || '暂无简介' }}</text>
            <view class="org-meta">
              <text class="member-count">{{ org.memberCount }}人</text>
              <text class="join-type">{{ getJoinTypeLabel(org.joinType) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-state">
        <image class="empty-icon" src="/static/uni-load-state/disconnection.png" mode="aspectFit"></image>
        <text class="empty-text">暂无组织</text>
      </view>

      <view v-if="loading" class="loading-state">
        <uni-load-more status="loading"></uni-load-more>
      </view>
      <view v-else-if="!hasMore && orgList.length > 0" class="loading-state">
        <uni-load-more status="noMore"></uni-load-more>
      </view>
    </scroll-view>

    <view class="fab" @click="goToCreate">
      <uni-icons type="plus" size="24" color="#fff"></uni-icons>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
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
  onPullDownRefresh() {
    this.pageNum = 1
    this.orgList = []
    this.hasMore = true
    this.loadOrgList().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    async loadOrgList() {
      if (this.loading || !this.hasMore) return

      this.loading = true
      try {
        const orgCo = uniCloud.importObject('alumni-organization-co')
        const res = await orgCo.getOrganizationList({
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
        console.error('加载组织列表失败', e)
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
    getTypeLabel(type) {
      const map = {
        region: '地域',
        industry: '行业',
        grade: '年级',
        interest: '兴趣'
      }
      return map[type] || ''
    },
    getJoinTypeLabel(type) {
      const map = {
        open: '开放加入',
        audit: '审核加入',
        invite: '邀请加入'
      }
      return map[type] || ''
    },
    goToDetail(id) {
      uni.navigateTo({ url: `/pages/organization/detail?id=${id}` })
    },
    goToCreate() {
      uni.navigateTo({ url: '/pages/organization/create' })
    }
  }
}
</script>

<style scoped>
.org-list-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
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
  flex-direction: row;
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
}

.org-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
}

.org-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-right: 8px;
}

.org-type {
  padding: 2px 8px;
  background-color: #e3f2fd;
  color: #2196f3;
  font-size: 12px;
  border-radius: 4px;
}

.org-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.member-count {
  margin-right: 16px;
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

.fab {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, #2B5CE6, #5B7FED);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(43, 92, 230, 0.4);
}
</style>
