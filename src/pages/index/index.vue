<template>
  <view class="page">
    <!-- 顶部区域 -->
    <view class="hero">
      <view class="status-bar">
        <text class="time">{{ currentTime }}</text>
        <text class="icons">📶 🔋</text>
      </view>
      <view class="hero-content">
        <view class="hero-top">
          <text class="logo">京约</text>
          <view class="city-tag">
            <text>📍 北京</text>
          </view>
        </view>
        <view class="weather-bar">
          <text>☀️ 今日北京 · 晴 18°C · 适合户外漫步 🍂</text>
        </view>

        <!-- 方案生成卡片 -->
        <view class="gen-card">
          <text class="gen-title">🎲 生成今日约会方案</text>
          <view class="gen-conditions">
            <view class="gen-cond">
              <text class="cond-label">时长</text>
              <text class="cond-value">{{ durationLabel }}</text>
            </view>
            <view class="gen-cond">
              <text class="cond-label">预算</text>
              <text class="cond-value">¥{{ budget }}</text>
            </view>
            <view class="gen-cond">
              <text class="cond-label">出发</text>
              <text class="cond-value">{{ district }}</text>
            </view>
          </view>
          <button class="gen-btn" @click="goToConditions">✨ 一键生成方案</button>
        </view>
      </view>
    </view>

    <!-- 新手引导 -->
    <view class="newbie-card" v-if="!hasWishlist">
      <text class="newbie-title">👋 第一次来？不用清单也能出方案</text>
      <text class="newbie-desc">直接从北京本地资源库生成现成约会路线，3步搞定，不纠结</text>
    </view>

    <!-- 编辑精选 -->
    <view class="section">
      <text class="section-title">✨ 编辑精选方案</text>
      <scroll-view scroll-x class="cards-scroll">
        <view class="mini-card" v-for="(item, idx) in curatedPlans" :key="idx" @click="selectCurated(item)">
          <text class="card-emoji">{{ item.emoji }}</text>
          <text class="card-name">{{ item.name }}</text>
          <text class="card-meta">{{ item.duration }} · ¥{{ item.budget }}</text>
          <text class="card-tag">{{ item.tag }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 条件选择弹窗 -->
    <view class="modal-mask" v-if="showConditions" @click="showConditions = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">定制约会方案</text>

        <!-- 时长 -->
        <view class="cond-step">
          <text class="step-label"><text class="step-num">1</text> 今天有多少时间？</text>
          <view class="duration-display">
            <text class="duration-value">{{ durationLabel }}</text>
          </view>
          <slider
            :value="durationIndex"
            :min="0"
            :max="4"
            :step="1"
            activeColor="#e8574a"
            backgroundColor="#f0ece8"
            block-size="24"
            @change="onDurationChange"
          />
          <view class="duration-labels">
            <text>2h</text>
            <text>3h</text>
            <text>半天</text>
            <text>大半天</text>
            <text>一天</text>
          </view>
        </view>

        <!-- 预算 -->
        <view class="cond-step">
          <text class="step-label"><text class="step-num">2</text> 双人预算上限</text>
          <view class="budget-chips">
            <view
              class="budget-chip"
              :class="{ active: budget === 200 }"
              @click="budget = 200"
            >
              <text>¥200 经济</text>
            </view>
            <view
              class="budget-chip"
              :class="{ active: budget === 500 }"
              @click="budget = 500"
            >
              <text>¥500 舒适</text>
            </view>
            <view
              class="budget-chip"
              :class="{ active: budget === 1000 }"
              @click="budget = 1000"
            >
              <text>¥1000 品质</text>
            </view>
            <view
              class="budget-chip"
              :class="{ active: budget === 2000 }"
              @click="budget = 2000"
            >
              <text>¥2000+</text>
            </view>
          </view>
        </view>

        <!-- 出发地 -->
        <view class="cond-step">
          <text class="step-label"><text class="step-num">3</text> 你们现在在哪？</text>
          <view class="district-grid">
            <view
              class="district-btn"
              :class="{ active: district === d }"
              v-for="d in districts"
              :key="d"
              @click="district = d"
            >
              <text>{{ d }}</text>
              <text class="district-sub" v-if="d === defaultDistrict">当前</text>
            </view>
          </view>
        </view>

        <button class="modal-btn" @click="confirmConditions">✨ 生成约会方案</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../../store/index.js'
import { generatePlan } from '../../utils/plan-generator.js'
import { getDistrictCoords } from '../../utils/district-coords.js'

const store = useAppStore()

const currentTime = ref('14:30')
const showConditions = ref(false)
const durationIndex = ref(2)
const budget = ref(500)
const district = ref('朝阳')

const defaultDistrict = computed(() => store.settings.defaultDistrict || '朝阳')
const hasWishlist = computed(() => store.wishlist.length > 0)

const durations = [
  { label: '2小时', value: 120 },
  { label: '3小时', value: 180 },
  { label: '半天', value: 300 },
  { label: '大半天', value: 420 },
  { label: '一整天', value: 600 }
]

const durationLabel = computed(() => durations[durationIndex.value].label)
const durationValue = computed(() => durations[durationIndex.value].value)

const districts = ['朝阳', '海淀', '东城', '西城', '丰台', '石景山', '通州', '昌平']

const curatedPlans = [
  { emoji: '🏮', name: '胡同里的一天', duration: '5h', budget: 300, tag: '文艺慢节奏', district: '东城', durationMin: 300, budgetMax: 300 },
  { emoji: '🌃', name: '亮马河浪漫夜', duration: '3h', budget: 500, tag: '夜间约会', district: '朝阳', durationMin: 180, budgetMax: 500 },
  { emoji: '🎨', name: '798艺术半日', duration: '4h', budget: 250, tag: '周末看展', district: '朝阳', durationMin: 240, budgetMax: 250 },
  { emoji: '⛸️', name: '什刹海冬日', duration: '4h', budget: 350, tag: '冬季专属', district: '西城', durationMin: 240, budgetMax: 350 },
  { emoji: '🌅', name: '首钢园日落', duration: '3h', budget: 150, tag: '拍照出片', district: '石景山', durationMin: 180, budgetMax: 150 },
  { emoji: '🍜', name: '簋街深夜食堂', duration: '3h', budget: 300, tag: '深夜美食', district: '东城', durationMin: 180, budgetMax: 300 }
]

function onDurationChange(e) {
  durationIndex.value = e.detail.value
}

function goToConditions() {
  showConditions.value = true
}

function selectCurated(item) {
  // 贴合精选卡片的时长档位（取最接近的一档）
  let best = 0
  let bestDiff = Infinity
  durations.forEach((d, i) => {
    const diff = Math.abs(d.value - item.durationMin)
    if (diff < bestDiff) { bestDiff = diff; best = i }
  })
  durationIndex.value = best
  budget.value = item.budgetMax
  district.value = item.district
  doGenerate()
}

function confirmConditions() {
  showConditions.value = false
  doGenerate()
}

function doGenerate() {
  const coords = getDistrictCoords(district.value)

  const plan = generatePlan({
    totalDuration: durationValue.value,
    totalBudget: budget.value,
    startDistrict: district.value,
    startLat: coords.lat,
    startLng: coords.lng,
    transportMode: 'subway',
    timePreference: 'afternoon',
    vibePreference: '',
    includeMeal: true,
    wishlist: store.wishlist,
    allSpots: store.spots,
    historyIds: store.planHistory.map(p => p.id)
  })

  store.currentPlan = plan

  uni.navigateTo({
    url: '/pages/plan/plan'
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

.hero {
  background: linear-gradient(135deg, #e8574a 0%, #d94a3d 100%);
  padding: 0 0 24px;
  border-radius: 0 0 24px 24px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px 4px;
  font-size: 12px;
  color: rgba(255,255,255,0.8);
}

.hero-content {
  padding: 16px 20px 0;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.logo {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 3px;
}

.city-tag {
  background: rgba(255,255,255,0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: #fff;
}

.weather-bar {
  font-size: 13px;
  color: rgba(255,255,255,0.9);
  margin-bottom: 20px;
}

.gen-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.gen-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
  display: block;
  color: #2d2a26;
}

.gen-conditions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.gen-cond {
  flex: 1;
  background: #faf8f5;
  border-radius: 12px;
  padding: 12px 8px;
  text-align: center;
}

.cond-label {
  font-size: 11px;
  color: #8a8580;
  display: block;
  margin-bottom: 4px;
}

.cond-value {
  font-size: 15px;
  font-weight: 700;
  color: #e8574a;
  display: block;
}

.gen-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #e8574a, #d94a3d);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  box-shadow: 0 4px 12px rgba(232,87,74,0.3);
}

.newbie-card {
  margin: 16px 20px;
  background: linear-gradient(135deg, #fff5f0, #fff0eb);
  border: 1px dashed #e8574a;
  border-radius: 14px;
  padding: 16px;
}

.newbie-title {
  font-size: 14px;
  font-weight: 700;
  color: #e8574a;
  display: block;
  margin-bottom: 6px;
}

.newbie-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.section {
  padding: 0 0 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  padding: 20px 20px 12px;
  display: block;
  color: #2d2a26;
}

.cards-scroll {
  white-space: nowrap;
  padding: 0 20px;
}

.mini-card {
  display: inline-block;
  min-width: 160px;
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-right: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  vertical-align: top;
}

.card-emoji {
  font-size: 28px;
  display: block;
  margin-bottom: 8px;
}

.card-name {
  font-size: 14px;
  font-weight: 700;
  display: block;
  margin-bottom: 6px;
  color: #2d2a26;
}

.card-meta {
  font-size: 11px;
  color: #8a8580;
  display: block;
}

.card-tag {
  display: inline-block;
  background: #f5f0eb;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: #666;
  margin-top: 8px;
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
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  display: block;
  margin-bottom: 24px;
  color: #2d2a26;
}

.cond-step {
  margin-bottom: 24px;
}

.step-label {
  font-size: 13px;
  font-weight: 600;
  color: #8a8580;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: #e8574a;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
}

.duration-display {
  text-align: center;
  margin-bottom: 8px;
}

.duration-value {
  font-size: 28px;
  font-weight: 800;
  color: #e8574a;
}

.duration-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
}

.budget-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.budget-chip {
  padding: 10px 16px;
  border-radius: 10px;
  background: #f5f0eb;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  border: 2px solid transparent;
}

.budget-chip.active {
  background: #fff5f0;
  border-color: #e8574a;
  color: #e8574a;
}

.district-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.district-btn {
  padding: 10px 4px;
  border-radius: 10px;
  background: #f5f0eb;
  font-size: 13px;
  text-align: center;
  border: 2px solid transparent;
  color: #555;
}

.district-btn.active {
  background: #fff5f0;
  border-color: #e8574a;
  color: #e8574a;
  font-weight: 600;
}

.district-sub {
  font-size: 10px;
  color: #aaa;
  display: block;
  margin-top: 2px;
}

.district-btn.active .district-sub {
  color: #e8a090;
}

.modal-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #e8574a, #d94a3d);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  box-shadow: 0 4px 16px rgba(232,87,74,0.3);
  margin-top: 8px;
}
</style>
