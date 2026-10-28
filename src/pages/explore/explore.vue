<template>
  <view class="page">
    <view class="status-bar">
      <text class="time">{{ currentTime }}</text>
      <text class="icons">📶 🔋</text>
    </view>

    <view class="explore-header">
      <text class="explore-title">🗺️ 北京探索</text>
      <view class="search-bar">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索餐厅、景点、活动..."
          placeholder-class="search-placeholder"
        />
        <text class="search-clear" v-if="keyword" @click="keyword = ''">✕</text>
      </view>
    </view>

    <!-- 分类筛选 -->
    <scroll-view scroll-x class="category-scroll">
      <view
        class="category-chip"
        :class="{ active: activeCategory === 'all' }"
        @click="activeCategory = 'all'"
      >全部</view>
      <view
        class="category-chip"
        :class="{ active: activeCategory === 'food' }"
        @click="activeCategory = 'food'"
      >🍜 美食</view>
      <view
        class="category-chip"
        :class="{ active: activeCategory === 'destination' }"
        @click="activeCategory = 'destination'"
      >📍 目的地</view>
      <view
        class="category-chip"
        :class="{ active: activeCategory === 'experience' }"
        @click="activeCategory = 'experience'"
      >🎭 体验</view>
    </scroll-view>

    <!-- 区域筛选 -->
    <scroll-view scroll-x class="district-scroll">
      <view
        class="district-chip"
        :class="{ active: activeDistrict === 'all' }"
        @click="activeDistrict = 'all'"
      >全城</view>
      <view
        class="district-chip"
        :class="{ active: activeDistrict === d }"
        v-for="d in districtList"
        :key="d"
        @click="activeDistrict = d"
      >{{ d }}</view>
    </scroll-view>

    <!-- 点位列表 -->
    <view class="spot-list" v-if="filteredSpots.length > 0">
      <view class="spot-card" v-for="spot in filteredSpots" :key="spot.id">
        <view class="spot-top">
          <view class="spot-title-row">
            <text class="spot-emoji">{{ getCategoryEmoji(spot.category) }}</text>
            <text class="spot-name">{{ spot.name }}</text>
          </view>
          <text class="spot-rating">⭐ {{ spot.coupleRating }}</text>
        </view>
        <view class="spot-tags">
          <text class="spot-tag" v-for="tag in spot.subcategory.slice(0, 3)" :key="tag">{{ tag }}</text>
        </view>
        <view class="spot-bottom">
          <text class="spot-info">
            📍{{ spot.district }} · ⏱{{ formatDuration(spot.duration) }} · {{ spot.costPerPerson > 0 ? '💰¥' + spot.costPerPerson + '/人' : '💰免费' }}
          </text>
          <button
            class="spot-add-btn"
            :class="{ added: isInWishlist(spot.id) }"
            @click="toggleWish(spot)"
          >{{ isInWishlist(spot.id) ? '✓ 已收藏' : '+ 加入' }}</button>
        </view>
        <!-- 预约提醒 -->
        <view class="spot-notice" v-if="spot.needReservation && spot.reservationInfo">
          <text>⚠️ {{ spot.reservationInfo }}</text>
        </view>
        <!-- Tips -->
        <view class="spot-tip" v-if="spot.tips && spot.tips.length > 0">
          <text>💡 {{ spot.tips[0] }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty" v-else>
      <text class="empty-emoji">🔍</text>
      <text class="empty-text">没有找到相关点位，试试其他关键词</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../../store/index.js'

const store = useAppStore()
const currentTime = ref('14:30')
const keyword = ref('')
const activeCategory = ref('all')
const activeDistrict = ref('all')

const districtList = ['东城', '西城', '朝阳', '海淀', '丰台', '石景山', '通州', '昌平', '顺义', '密云', '大兴', '门头沟']

const filteredSpots = computed(() => {
  let result = store.spots

  if (activeCategory.value !== 'all') {
    result = result.filter(s => s.category === activeCategory.value)
  }

  if (activeDistrict.value !== 'all') {
    result = result.filter(s => s.district === activeDistrict.value)
  }

  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    result = result.filter(s =>
      s.name.toLowerCase().includes(kw) ||
      s.subcategory.some(tag => tag.toLowerCase().includes(kw)) ||
      s.district.includes(kw) ||
      (s.address && s.address.includes(kw))
    )
  }

  // 按情侣评分降序
  return result.sort((a, b) => (b.coupleRating || 0) - (a.coupleRating || 0))
})

const wishlistIds = computed(() => new Set(store.wishlist.map(w => w.id)))

function isInWishlist(id) {
  return wishlistIds.value.has(id)
}

function toggleWish(spot) {
  if (isInWishlist(spot.id)) {
    store.removeFromWishlist(spot.id)
    uni.showToast({ title: '已取消收藏', icon: 'none' })
  } else {
    store.addFromLibrary(spot.id)
    uni.showToast({ title: '已加入清单', icon: 'success' })
  }
}

function getCategoryEmoji(category) {
  const map = { food: '🍜', destination: '📍', experience: '🎭' }
  return map[category] || '📍'
}

function formatDuration(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}min` : `${h}h`
  }
  return `${minutes}min`
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

.explore-header {
  padding: 16px 20px;
}

.explore-title {
  font-size: 20px;
  font-weight: 800;
  display: block;
  margin-bottom: 12px;
  color: #2d2a26;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #f5f0eb;
  border-radius: 10px;
  padding: 10px 14px;
  gap: 8px;
}

.search-icon {
  font-size: 14px;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #333;
  background: transparent;
  border: none;
}

.search-placeholder {
  color: #bbb;
}

.search-clear {
  font-size: 14px;
  color: #bbb;
  padding: 2px 4px;
}

.category-scroll {
  white-space: nowrap;
  padding: 4px 20px 8px;
}

.category-chip {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  color: #666;
  margin-right: 8px;
  border: 1.5px solid transparent;
}

.category-chip.active {
  background: #fff5f0;
  border-color: #e8574a;
  color: #e8574a;
  font-weight: 600;
}

.district-scroll {
  white-space: nowrap;
  padding: 4px 20px 12px;
}

.district-chip {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f5f0eb;
  font-size: 12px;
  color: #888;
  margin-right: 6px;
}

.district-chip.active {
  background: #e8574a;
  color: #fff;
  font-weight: 600;
}

.spot-list {
  padding: 8px 20px;
}

.spot-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.spot-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.spot-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.spot-emoji {
  font-size: 18px;
}

.spot-name {
  font-size: 15px;
  font-weight: 700;
  color: #2d2a26;
}

.spot-rating {
  font-size: 12px;
  font-weight: 700;
  color: #e0960a;
  background: #fff8f0;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.spot-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.spot-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f5f0eb;
  color: #888;
}

.spot-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.spot-info {
  font-size: 12px;
  color: #8a8580;
  flex: 1;
}

.spot-add-btn {
  border: 1.5px solid #e8574a;
  background: none;
  color: #e8574a;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.spot-add-btn.added {
  background: #fff5f0;
  border-color: #f0b8a8;
  color: #e8574a;
}

.spot-notice {
  margin-top: 10px;
  background: #fff0f0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 11px;
  color: #c05050;
}

.spot-tip {
  margin-top: 8px;
  background: #fff8f0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 11px;
  color: #b07040;
  line-height: 1.5;
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
  font-size: 13px;
  color: #8a8580;
}
</style>
