<template>
  <view class="page">
    <view class="status-bar">
      <text class="time">{{ currentTime }}</text>
      <text class="icons">📶 🔋</text>
    </view>

    <view class="wish-header">
      <text class="wish-title">我的愿望清单</text>
      <button class="add-btn" @click="showAddModal = true">+ 添加</button>
    </view>

    <!-- 分类 Tab -->
    <view class="wish-tabs">
      <view
        class="wish-tab"
        :class="{ on: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >全部 {{ store.wishlist.length }}</view>
      <view
        class="wish-tab"
        :class="{ on: activeTab === 'food' }"
        @click="activeTab = 'food'"
      >🍜 美食 {{ countByCategory('food') }}</view>
      <view
        class="wish-tab"
        :class="{ on: activeTab === 'experience' }"
        @click="activeTab = 'experience'"
      >🎭 体验 {{ countByCategory('experience') }}</view>
      <view
        class="wish-tab"
        :class="{ on: activeTab === 'destination' }"
        @click="activeTab = 'destination'"
      >📍 目的地 {{ countByCategory('destination') }}</view>
    </view>

    <!-- 清单列表 -->
    <view class="wish-list" v-if="filteredWishlist.length > 0">
      <view class="wish-item" v-for="item in filteredWishlist" :key="item.id">
        <view class="wish-icon" :class="getIconClass(item.category)">
          <text>{{ getCategoryEmoji(item.category) }}</text>
        </view>
        <view class="wish-body">
          <text class="wish-name">{{ item.name }}</text>
          <text class="wish-meta">
            ⏱{{ formatDuration(item.duration) }} · {{ item.costPerPerson > 0 ? '💰¥' + item.costPerPerson + '/人' : '💰免费' }} · 📍{{ item.district }}
          </text>
        </view>
        <view class="priority-tag" :class="getPriorityClass(item.priority)" @click="togglePriority(item)">
          <text>{{ getPriorityLabel(item.priority) }}</text>
        </view>
        <text class="delete-btn" @click.stop="removeItem(item)">🗑</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty" v-else>
      <text class="empty-emoji">💝</text>
      <text class="empty-title">清单还是空的</text>
      <text class="empty-desc">手动添加想去的店、想做的事，或者从北京资源库一键收藏</text>
      <view class="empty-actions">
        <button class="empty-btn primary" @click="showAddModal = true">手动添加</button>
        <button class="empty-btn" @click="goExplore">去探索北京</button>
      </view>
    </view>

    <!-- 添加弹窗 -->
    <view class="modal-mask" v-if="showAddModal" @click="showAddModal = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">添加品类</text>
        <view class="add-types">
          <view class="add-type" @click="goAddFromLibrary">
            <text class="add-type-emoji">🗺️</text>
            <text class="add-type-name">从北京库选择</text>
            <text class="add-type-desc">52 个精选点位一键收藏</text>
          </view>
          <view class="add-type" @click="openManualForm">
            <text class="add-type-emoji">✏️</text>
            <text class="add-type-name">手动录入</text>
            <text class="add-type-desc">自己常去的心水小店</text>
          </view>
        </view>
        <button class="modal-cancel" @click="showAddModal = false">取消</button>
      </view>
    </view>

    <!-- 手动录入弹窗 -->
    <view class="modal-mask" v-if="showManualForm" @click="showManualForm = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">手动录入</text>

        <view class="form-item">
          <text class="form-label">名称 *</text>
          <input class="form-input" v-model="form.name" placeholder="店名 / 地点 / 活动名" placeholder-class="ph" />
        </view>

        <view class="form-item">
          <text class="form-label">分类 *</text>
          <view class="form-chips">
            <view class="form-chip" :class="{ on: form.category === 'food' }" @click="form.category = 'food'">🍜 美食</view>
            <view class="form-chip" :class="{ on: form.category === 'experience' }" @click="form.category = 'experience'">🎭 体验</view>
            <view class="form-chip" :class="{ on: form.category === 'destination' }" @click="form.category = 'destination'">📍 目的地</view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">预计耗时</text>
          <slider :value="form.duration" :min="30" :max="300" :step="30" activeColor="#e8574a" block-size="20" @change="e => form.duration = e.detail.value" />
          <text class="form-hint">{{ formatDuration(form.duration) }}（含用餐/游玩/交通缓冲）</text>
        </view>

        <view class="form-item">
          <text class="form-label">人均花费（元）</text>
          <input class="form-input" v-model="form.costInput" type="number" placeholder="0 表示免费" placeholder-class="ph" />
        </view>

        <view class="form-item">
          <text class="form-label">所在行政区 *</text>
          <view class="form-chips">
            <view
              class="form-chip"
              v-for="d in formDistricts"
              :key="d"
              :class="{ on: form.district === d }"
              @click="form.district = d"
            >{{ d }}</view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">备注（选填）</text>
          <input class="form-input" v-model="form.note" placeholder="如：靠窗位置氛围好" placeholder-class="ph" />
        </view>

        <button class="modal-btn" @click="submitManual">保存到清单</button>
        <button class="modal-cancel" @click="showManualForm = false">取消</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../../store/index.js'
import { getDistrictCoords } from '../../utils/district-coords.js'

const store = useAppStore()
const currentTime = ref('14:30')
const activeTab = ref('all')
const showAddModal = ref(false)
const showManualForm = ref(false)

const formDistricts = ['东城', '西城', '朝阳', '海淀', '丰台', '石景山', '通州', '昌平', '顺义', '大兴']
const form = ref({
  name: '',
  category: 'food',
  duration: 90,
  costInput: '',
  district: '朝阳',
  note: ''
})

const filteredWishlist = computed(() => {
  if (activeTab.value === 'all') return store.wishlist
  return store.wishlist.filter(w => w.category === activeTab.value)
})

function countByCategory(cat) {
  return store.wishlist.filter(w => w.category === cat).length
}

function getCategoryEmoji(category) {
  const map = { food: '🍜', destination: '📍', experience: '🎭' }
  return map[category] || '📍'
}

function getIconClass(category) {
  const map = { food: 'wi-f', destination: 'wi-d', experience: 'wi-e' }
  return map[category] || 'wi-d'
}

function getPriorityLabel(p) {
  return p === 'must' ? '必去' : p === 'really' ? '很想去' : '想去'
}

function getPriorityClass(p) {
  return p === 'must' ? 'p-must' : p === 'really' ? 'p-really' : 'p-want'
}

function togglePriority(item) {
  const order = ['want', 'really', 'must']
  const next = order[(order.indexOf(item.priority || 'want') + 1) % 3]
  store.updatePriority(item.id, next)
}

function formatDuration(minutes) {
  if (!minutes) return '60min'
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}min` : `${h}h`
  }
  return `${minutes}min`
}

function removeItem(item) {
  uni.showModal({
    title: '删除',
    content: `确定删除「${item.name}」吗？`,
    success: (res) => {
      if (res.confirm) {
        store.removeFromWishlist(item.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

function goExplore() {
  uni.switchTab({ url: '/pages/explore/explore' })
}

function goAddFromLibrary() {
  showAddModal.value = false
  uni.switchTab({ url: '/pages/explore/explore' })
}

function openManualForm() {
  showAddModal.value = false
  form.value = {
    name: '',
    category: activeTab.value === 'all' ? 'food' : activeTab.value,
    duration: 90,
    costInput: '',
    district: store.settings.defaultDistrict || '朝阳',
    note: ''
  }
  showManualForm.value = true
}

function submitManual() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请填写名称', icon: 'none' })
    return
  }
  if (!form.value.category) {
    uni.showToast({ title: '请选择分类', icon: 'none' })
    return
  }

  const district = form.value.district
  // 用行政区中心坐标近似（手动录入无精确坐标时用于路线排序）
  const coords = getDistrictCoords(district)

  store.addToWishlist({
    id: 'manual_' + Date.now(),
    name: form.value.name.trim(),
    category: form.value.category,
    district,
    latitude: coords.lat,
    longitude: coords.lng,
    duration: form.value.duration,
    costPerPerson: parseInt(form.value.costInput, 10) || 0,
    note: form.value.note,
    sourceType: 'manual'
  })

  showManualForm.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px 4px;
  font-size: 12px;
  color: #666;
}

.wish-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.wish-title {
  font-size: 20px;
  font-weight: 800;
  color: #2d2a26;
}

.add-btn {
  background: #e8574a;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
}

.wish-tabs {
  display: flex;
  padding: 0 20px;
  border-bottom: 1px solid #f0ece8;
  overflow-x: auto;
  white-space: nowrap;
}

.wish-tab {
  padding: 10px 12px;
  font-size: 13px;
  color: #8a8580;
  border-bottom: 2px solid transparent;
  display: inline-block;
}

.wish-tab.on {
  color: #e8574a;
  border-color: #e8574a;
  font-weight: 700;
}

.wish-list {
  padding: 12px 20px 100px;
}

.wish-item {
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  gap: 12px;
}

.wish-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.wi-f { background: #fff0e6; }
.wi-d { background: #e6f5ee; }
.wi-e { background: #f0e8ff; }

.wish-body {
  flex: 1;
  min-width: 0;
}

.wish-name {
  font-size: 15px;
  font-weight: 700;
  display: block;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wish-meta {
  font-size: 11px;
  color: #8a8580;
  display: block;
}

.priority-tag {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  flex-shrink: 0;
}

.p-must { background: #ffe8e5; color: #e8574a; }
.p-really { background: #fff3e0; color: #e0960a; }
.p-want { background: #f0ece8; color: #888; }

.delete-btn {
  font-size: 16px;
  flex-shrink: 0;
  padding: 4px;
}

.empty {
  text-align: center;
  padding: 80px 40px;
}

.empty-emoji {
  font-size: 56px;
  display: block;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 700;
  display: block;
  margin-bottom: 8px;
  color: #2d2a26;
}

.empty-desc {
  font-size: 13px;
  color: #8a8580;
  line-height: 1.6;
  display: block;
  margin-bottom: 24px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.empty-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid #e8574a;
  background: #fff;
  color: #e8574a;
  font-size: 13px;
  font-weight: 600;
}

.empty-btn.primary {
  background: #e8574a;
  color: #fff;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.modal-content {
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px 40px;
  width: 100%;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  display: block;
  margin-bottom: 16px;
}

.add-types {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.add-type {
  background: #faf8f5;
  border-radius: 12px;
  padding: 16px;
}

.add-type-emoji {
  font-size: 24px;
  display: block;
  margin-bottom: 8px;
}

.add-type-name {
  font-size: 15px;
  font-weight: 700;
  display: block;
  margin-bottom: 4px;
}

.add-type-desc {
  font-size: 12px;
  color: #8a8580;
}

.modal-cancel {
  width: 100%;
  padding: 12px;
  background: #f5f0eb;
  color: #666;
  border: none;
  border-radius: 10px;
  font-size: 14px;
}

/* 手动录入表单 */
.form-item {
  margin-bottom: 18px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  display: block;
  margin-bottom: 8px;
}

.form-input {
  background: #faf8f5;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  color: #2d2a26;
  width: 100%;
  box-sizing: border-box;
}

.ph {
  color: #bbb;
}

.form-hint {
  font-size: 11px;
  color: #aaa;
  display: block;
  margin-top: 4px;
}

.form-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.form-chip {
  padding: 8px 14px;
  border-radius: 10px;
  background: #f5f0eb;
  font-size: 13px;
  color: #666;
  border: 2px solid transparent;
}

.form-chip.on {
  background: #fff5f0;
  border-color: #e8574a;
  color: #e8574a;
  font-weight: 600;
}

.modal-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #e8574a, #d94a3d);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
  box-shadow: 0 3px 10px rgba(232,87,74,0.25);
}
</style>
