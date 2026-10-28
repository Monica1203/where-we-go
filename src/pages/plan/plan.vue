<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="plan-header">
      <view class="status-bar">
        <text class="back" @click="goBack">‹</text>
        <text class="share" @click="sharePlan">📤 分享</text>
      </view>
      <view class="plan-hero">
        <text class="plan-title">📅 你的今日约会方案</text>
        <view class="plan-stats">
          <text>⏱ 约{{ formatDuration(plan.totalDuration) }}</text>
          <text>💰 约¥{{ plan.totalBudget }}</text>
          <text>📍 {{ plan.routeDesc }}</text>
        </view>
        <text class="plan-weather">☀️ 今日北京 晴 18°C，适合户外漫步</text>
      </view>
    </view>

    <!-- 餐饮未排上提示 -->
    <view class="meal-hint" v-if="plan && plan.mealMissing">
      <text>🍽️ 按当前时间/预算没排上餐厅，可提高预算或点「换一换」再试一次</text>
    </view>

    <!-- 时间轴 -->
    <view class="timeline" v-if="plan && plan.nodes">
      <template v-for="(node, idx) in plan.nodes" :key="idx">
        <!-- 交通节点 -->
        <view class="transit" v-if="node.type === 'transit'">
          <view class="transit-box">
            <text>{{ node.description }}</text>
          </view>
        </view>

        <!-- 点位节点 -->
        <view class="node" v-else>
          <view class="node-dot" :class="getDotClass(node.category)"></view>
          <text class="node-time">{{ node.startTime }} - {{ node.endTime }}</text>
          <view class="node-card" @click="showNodeDetail(node)">
            <view class="node-top">
              <text class="node-name">{{ getCategoryEmoji(node.category) }} {{ node.name }}</text>
              <text class="node-wish-tag" v-if="node.fromWishlist">❤️ 清单</text>
            </view>
            <text class="node-info">
              {{ getCategoryLabel(node.category) }} {{ formatDuration(node.duration) }} · {{ node.costPerPerson > 0 ? '¥' + node.costPerPerson + '/人' : '免费' }} · {{ node.district }}
            </text>
            <!-- Tips -->
            <view class="node-tip" v-if="node.tips && node.tips.length > 0">
              <text>💡 {{ node.tips[0] }}</text>
            </view>
            <!-- 预约提醒 -->
            <view class="node-tip warn" v-if="node.needReservation && node.reservationInfo">
              <text>⚠️ {{ node.reservationInfo }}</text>
            </view>
            <!-- 替换按钮 -->
            <view class="node-actions">
              <text class="replace-btn" @click.stop="replaceNode(node, idx)">🔄 换个类似的</text>
              <text class="add-wish-btn" @click.stop="addToWish(node)">❤️ 加入清单</text>
            </view>
          </view>
        </view>
      </template>
    </view>

    <!-- 空状态 -->
    <view class="empty" v-if="!plan || !plan.nodes || plan.nodes.length === 0">
      <text class="empty-emoji">😅</text>
      <text class="empty-text">暂无方案，返回首页重新生成</text>
      <button class="empty-btn" @click="goBack">返回</button>
    </view>

    <!-- 底部操作 -->
    <view class="plan-actions" v-if="plan && plan.nodes && plan.nodes.length > 0">
      <button class="action-btn refresh" @click="refreshPlan">🔄 换一换</button>
      <button class="action-btn save" @click="savePlan">💾 加入今日计划</button>
      <button class="action-btn share" @click="sharePlan">📤 分享</button>
    </view>

    <!-- 替换弹窗 -->
    <view class="modal-mask" v-if="showReplace" @click="showReplace = false">
      <view class="modal-content replace-modal" @click.stop>
        <text class="modal-title">选择替换点位</text>
        <view class="replace-list">
          <view
            class="replace-item"
            v-for="alt in alternatives"
            :key="alt.id"
            @click="doReplace(alt)"
          >
            <text class="replace-name">{{ getCategoryEmoji(alt.category) }} {{ alt.name }}</text>
            <text class="replace-info">{{ alt.district }} · ¥{{ alt.costPerPerson }}/人 · ⭐{{ alt.coupleRating }}</text>
          </view>
        </view>
        <button class="modal-cancel" @click="showReplace = false">取消</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../../store/index.js'
import { generatePlan, getAlternatives } from '../../utils/plan-generator.js'
import { getDistrictCoords } from '../../utils/district-coords.js'

const store = useAppStore()
const showReplace = ref(false)
const alternatives = ref([])
const replaceNodeIdx = ref(-1)

const plan = computed(() => store.currentPlan)

function goBack() {
  uni.navigateBack()
}

function formatDuration(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}min` : `${h}h`
  }
  return `${minutes}min`
}

function getCategoryEmoji(category) {
  const map = { food: '🍜', destination: '📍', experience: '🎭' }
  return map[category] || '📍'
}

function getCategoryLabel(category) {
  const map = { food: '美食', destination: '景点', experience: '体验' }
  return map[category] || '景点'
}

function getDotClass(category) {
  const map = { food: 'dot-f', destination: 'dot-d', experience: 'dot-e' }
  return map[category] || 'dot-d'
}

function showNodeDetail(node) {
  // 可以跳转到详情页，暂时不做
}

function replaceNode(node, idx) {
  const alts = getAlternatives(node.spotId, store.spots, 1000)
  if (alts.length === 0) {
    uni.showToast({ title: '暂无同区域备选', icon: 'none' })
    return
  }
  alternatives.value = alts
  replaceNodeIdx.value = idx
  showReplace.value = true
}

function doReplace(alt) {
  // 直接替换对应索引的节点
  const nodes = [...store.currentPlan.nodes]
  const old = nodes[replaceNodeIdx.value]
  if (!old) return

  nodes[replaceNodeIdx.value] = {
    ...old,
    spotId: alt.id,
    name: alt.name,
    category: alt.category,
    district: alt.district,
    costPerPerson: alt.costPerPerson,
    cost: alt.costPerPerson * 2,
    tips: alt.tips || [],
    needReservation: alt.needReservation || false,
    reservationInfo: alt.reservationInfo || ''
  }

  // 重新计算总计
  const spotNodes2 = nodes.filter(n => n.type === 'spot')
  const transitNodes = nodes.filter(n => n.type === 'transit')
  store.currentPlan = {
    ...store.currentPlan,
    nodes,
    totalDuration: spotNodes2.reduce((s, n) => s + n.duration, 0) + transitNodes.reduce((s, n) => s + n.duration, 0),
    totalBudget: spotNodes2.reduce((s, n) => s + n.cost, 0) + transitNodes.reduce((s, n) => s + n.cost, 0)
  }

  showReplace.value = false
  uni.showToast({ title: '已替换', icon: 'success' })
}

function addToWish(node) {
  store.addToWishlist({
    id: node.spotId,
    name: node.name,
    category: node.category,
    district: node.district,
    latitude: node.latitude,
    longitude: node.longitude,
    duration: node.duration,
    costPerPerson: node.costPerPerson,
    sourceType: 'from_plan'
  })
  uni.showToast({ title: '已加入清单', icon: 'success' })
}

function refreshPlan() {
  // 重新生成方案
  const currentPlan = store.currentPlan
  if (!currentPlan) return

  const coords = getDistrictCoords(currentPlan.startDistrict)

  const newPlan = generatePlan({
    totalDuration: currentPlan.requestedDuration || currentPlan.totalDuration,
    totalBudget: currentPlan.requestedBudget || currentPlan.totalBudget,
    startDistrict: currentPlan.startDistrict,
    startLat: coords.lat,
    startLng: coords.lng,
    transportMode: currentPlan.transportMode,
    timePreference: 'afternoon',
    includeMeal: true,
    wishlist: store.wishlist,
    allSpots: store.spots,
    historyIds: [...store.planHistory.map(p => p.id), currentPlan.id]
  })

  // 避免与上一份方案完全相同
  const sameSignature = (a, b) => JSON.stringify((a.nodes || []).filter(n => n.type === 'spot').map(n => n.spotId)) ===
    JSON.stringify((b.nodes || []).filter(n => n.type === 'spot').map(n => n.spotId))

  if (sameSignature(newPlan, currentPlan)) {
    for (let i = 0; i < 3 && sameSignature(newPlan, currentPlan); i++) {
      const retry = generatePlan({
        totalDuration: (currentPlan.requestedDuration || currentPlan.totalDuration) + 60,
        totalBudget: currentPlan.requestedBudget || currentPlan.totalBudget,
        startDistrict: currentPlan.startDistrict,
        startLat: coords.lat,
        startLng: coords.lng,
        transportMode: currentPlan.transportMode,
        timePreference: 'afternoon',
        includeMeal: true,
        wishlist: store.wishlist,
        allSpots: store.spots,
        historyIds: [...store.planHistory.map(p => p.id), currentPlan.id, newPlan.id]
      })
      if (!sameSignature(retry, currentPlan)) {
        store.currentPlan = retry
        return
      }
    }
  }

  store.currentPlan = newPlan
  uni.showToast({ title: '已换一批', icon: 'success' })
}

function savePlan() {
  store.planHistory.push({...store.currentPlan})
  store.savePlanHistory()
  uni.showToast({ title: '已保存到今日计划', icon: 'success' })
}

function sharePlan() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 80px;
}

.plan-header {
  background: linear-gradient(135deg, #e8574a 0%, #d94a3d 100%);
  padding: 0 0 20px;
  border-radius: 0 0 20px 20px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px 4px;
  font-size: 13px;
  color: rgba(255,255,255,0.9);
}

.back {
  font-size: 22px;
  cursor: pointer;
}

.plan-hero {
  padding: 12px 20px 0;
  color: #fff;
}

.plan-title {
  font-size: 18px;
  font-weight: 700;
  display: block;
  margin-bottom: 8px;
}

.plan-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  opacity: 0.9;
}

.plan-weather {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 8px;
  display: block;
}

.meal-hint {
  margin: 12px 16px 0;
  padding: 10px 12px;
  background: #fff6e5;
  border: 1px solid #f3d9a4;
  border-radius: 10px;
  font-size: 12px;
  color: #9a6b1f;
  line-height: 1.5;
}

.timeline {
  padding: 20px;
}

.node {
  position: relative;
  padding-left: 32px;
  padding-bottom: 8px;
}

.node::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 28px;
  bottom: -8px;
  width: 2px;
  background: #e8e4e0;
}

.node:last-child::before {
  display: none;
}

.node-dot {
  position: absolute;
  left: 2px;
  top: 6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.dot-f { background: #fff0e6; border: 2px solid #f0a060; }
.dot-d { background: #e6f5ee; border: 2px solid #60b088; }
.dot-e { background: #f0e8ff; border: 2px solid #a080d0; }

.node-time {
  font-size: 12px;
  font-weight: 700;
  color: #e8574a;
  display: block;
  margin-bottom: 4px;
}

.node-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  margin-bottom: 4px;
}

.node-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.node-name {
  font-size: 15px;
  font-weight: 700;
  flex: 1;
}

.node-wish-tag {
  font-size: 10px;
  background: #ffe8e5;
  color: #e8574a;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.node-info {
  font-size: 12px;
  color: #8a8580;
  margin-bottom: 6px;
  display: block;
}

.node-tip {
  background: #fff8f0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 11px;
  color: #b07040;
  line-height: 1.5;
  margin-bottom: 6px;
}

.node-tip.warn {
  background: #fff0f0;
  color: #c05050;
}

.node-actions {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

.replace-btn, .add-wish-btn {
  font-size: 11px;
  color: #e8574a;
  cursor: pointer;
}

.transit {
  padding: 6px 0 6px 32px;
  position: relative;
}

.transit::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e8e4e0;
}

.transit-box {
  background: #f5f0eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #8a8580;
}

.empty {
  text-align: center;
  padding: 60px 20px;
}

.empty-emoji {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: #8a8580;
  display: block;
  margin-bottom: 20px;
}

.empty-btn {
  background: #e8574a;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 24px;
  font-size: 14px;
}

.plan-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 8px;
  padding: 12px 16px 20px;
  background: #fff;
  border-top: 1px solid #f0ece8;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.05);
}

.action-btn {
  flex: 1;
  padding: 12px 8px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.action-btn.refresh { background: #f5f0eb; color: #666; }
.action-btn.save { background: linear-gradient(135deg, #e8574a, #d94a3d); color: #fff; box-shadow: 0 2px 8px rgba(232,87,74,0.25); }
.action-btn.share { background: #f5f0eb; color: #666; }

/* 替换弹窗 */
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
  max-height: 60vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  display: block;
  margin-bottom: 16px;
}

.replace-list {
  max-height: 40vh;
  overflow-y: auto;
}

.replace-item {
  background: #faf8f5;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}

.replace-name {
  font-size: 14px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.replace-info {
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
  margin-top: 12px;
}
</style>
