<template>
  <view class="page">
    <view class="status-bar">
      <text class="time">{{ currentTime }}</text>
      <text class="icons">📶 🔋</text>
    </view>

    <view class="settings-header">
      <text class="settings-title">⚙️ 设置</text>
    </view>

    <!-- 个人信息 -->
    <view class="settings-group">
      <text class="group-title">个人信息</text>
      <view class="settings-item">
        <text class="item-label">我的昵称</text>
        <text class="item-value">{{ settings.nickname || '未设置' }} ›</text>
      </view>
      <view class="settings-item">
        <text class="item-label">伴侣昵称</text>
        <text class="item-value">{{ settings.partnerName || '未设置' }} ›</text>
      </view>
    </view>

    <!-- 默认值 -->
    <view class="settings-group">
      <text class="group-title">默认值</text>
      <view class="settings-item" @click="pickDistrict">
        <text class="item-label">默认出发地</text>
        <text class="item-value">{{ settings.defaultDistrict }} ›</text>
      </view>
      <view class="settings-item" @click="pickBudget">
        <text class="item-label">默认预算</text>
        <text class="item-value">¥{{ settings.defaultBudget }} ›</text>
      </view>
      <view class="settings-item" @click="pickTransport">
        <text class="item-label">出行方式</text>
        <text class="item-value">{{ transportLabel }} ›</text>
      </view>
    </view>

    <!-- 城市 -->
    <view class="settings-group">
      <text class="group-title">城市</text>
      <view class="settings-item">
        <text class="item-label">当前城市</text>
        <text class="item-value">🏙️ 北京</text>
      </view>
      <view class="settings-item disabled">
        <text class="item-label">切换城市</text>
        <text class="item-value off">更多城市即将上线</text>
      </view>
    </view>

    <!-- 通知 -->
    <view class="settings-group">
      <text class="group-title">通知</text>
      <view class="settings-item">
        <text class="item-label">预约提醒</text>
        <switch :checked="true" color="#e8574a" style="transform: scale(0.8)" />
      </view>
      <view class="settings-item">
        <text class="item-label">出行前提醒</text>
        <switch :checked="true" color="#e8574a" style="transform: scale(0.8)" />
      </view>
    </view>

    <!-- 其他 -->
    <view class="settings-group">
      <text class="group-title">其他</text>
      <view class="settings-item">
        <text class="item-label">反馈与建议</text>
        <text class="item-value">›</text>
      </view>
      <view class="settings-item">
        <text class="item-label">关于京约</text>
        <text class="item-value">v1.0 ›</text>
      </view>
    </view>

    <view class="hidden-entry">
      <text>· 城市选择隐藏入口 ·</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../../store/index.js'

const store = useAppStore()
const currentTime = ref('14:30')
const settings = computed(() => store.settings)

const transportLabels = {
  subway: '地铁优先',
  taxi: '打车',
  walk: '步行',
  bike: '骑行'
}
const transportLabel = computed(() => transportLabels[settings.value.defaultTransport] || '地铁优先')

function pickDistrict() {
  const districts = ['东城', '西城', '朝阳', '海淀', '丰台', '石景山', '通州', '昌平']
  uni.showActionSheet({
    itemList: districts,
    success: (res) => {
      store.settings.defaultDistrict = districts[res.tapIndex]
      store.saveSettings()
    }
  })
}

function pickBudget() {
  const budgets = ['¥200 经济型', '¥500 舒适型', '¥1000 品质型', '¥2000+ 轻奢型']
  const values = [200, 500, 1000, 2000]
  uni.showActionSheet({
    itemList: budgets,
    success: (res) => {
      store.settings.defaultBudget = values[res.tapIndex]
      store.saveSettings()
    }
  })
}

function pickTransport() {
  const list = ['地铁优先', '打车', '步行', '骑行']
  const values = ['subway', 'taxi', 'walk', 'bike']
  uni.showActionSheet({
    itemList: list,
    success: (res) => {
      store.settings.defaultTransport = values[res.tapIndex]
      store.saveSettings()
    }
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 100px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px 4px;
  font-size: 12px;
  color: #666;
}

.settings-header {
  padding: 16px 20px;
}

.settings-title {
  font-size: 20px;
  font-weight: 800;
  color: #2d2a26;
}

.settings-group {
  padding: 0 20px;
  margin-bottom: 20px;
}

.group-title {
  font-size: 12px;
  color: #aaa;
  display: block;
  margin-bottom: 8px;
  padding-left: 4px;
}

.settings-item {
  background: #fff;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f5f0eb;
}

.settings-item:first-of-type {
  border-radius: 12px 12px 0 0;
}

.settings-item:last-child {
  border-radius: 0 0 12px 12px;
  border-bottom: none;
}

.settings-item.disabled {
  opacity: 0.5;
}

.item-label {
  font-size: 14px;
  font-weight: 500;
  color: #2d2a26;
}

.item-value {
  font-size: 13px;
  color: #8a8580;
}

.item-value.off {
  color: #ccc;
  font-size: 12px;
}

.hidden-entry {
  text-align: center;
  font-size: 11px;
  color: #ddd;
  padding: 12px;
}
</style>
