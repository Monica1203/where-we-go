import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import beijingSpots from '../../data/beijing-spots.json'

export const useAppStore = defineStore('app', () => {
  // 用户愿望清单
  const wishlist = ref([])
  // 北京资源库
  const spots = ref([])
  // 当前生成的方案
  const currentPlan = ref(null)
  // 用户设置
  const settings = ref({
    nickname: '',
    partnerName: '',
    defaultDistrict: '朝阳',
    defaultBudget: 500,
    defaultTransport: 'subway'
  })
  // 已生成方案历史（用于去重）
  const planHistory = ref([])

  // 初始化应用
  function initApp() {
    // 加载资源库
    spots.value = beijingSpots.spots || []
    // 从本地存储加载愿望清单
    const savedWishlist = uni.getStorageSync('wishlist')
    if (savedWishlist) {
      wishlist.value = JSON.parse(savedWishlist)
    }
    // 从本地存储加载设置
    const savedSettings = uni.getStorageSync('settings')
    if (savedSettings) {
      settings.value = { ...settings.value, ...JSON.parse(savedSettings) }
    }
    // 加载方案历史
    const savedHistory = uni.getStorageSync('planHistory')
    if (savedHistory) {
      planHistory.value = JSON.parse(savedHistory)
    }
  }

  // 保存愿望清单到本地存储
  function saveWishlist() {
    uni.setStorageSync('wishlist', JSON.stringify(wishlist.value))
  }

  // 添加愿望清单项
  function addToWishlist(item) {
    const exists = wishlist.value.find(w => w.id === item.id)
    if (!exists) {
      wishlist.value.push({
        ...item,
        createdAt: Date.now(),
        sourceType: item.sourceType || 'manual',
        priority: item.priority || 'want'
      })
      saveWishlist()
    }
  }

  // 从资源库添加
  function addFromLibrary(spotId) {
    const spot = spots.value.find(s => s.id === spotId)
    if (spot) {
      addToWishlist({
        id: spot.id,
        name: spot.name,
        category: spot.category,
        district: spot.district,
        latitude: spot.latitude,
        longitude: spot.longitude,
        duration: spot.duration,
        costPerPerson: spot.costPerPerson,
        sourceType: 'from_library',
        libraryRefId: spot.id
      })
    }
  }

  // 移除愿望清单项
  function removeFromWishlist(itemId) {
    wishlist.value = wishlist.value.filter(w => w.id !== itemId)
    saveWishlist()
  }

  // 更新愿望清单项优先级
  function updatePriority(itemId, priority) {
    const item = wishlist.value.find(w => w.id === itemId)
    if (item) {
      item.priority = priority
      saveWishlist()
    }
  }

  // 保存设置
  function saveSettings() {
    uni.setStorageSync('settings', JSON.stringify(settings.value))
  }

  // 保存方案历史
  function savePlanHistory() {
    uni.setStorageSync('planHistory', JSON.stringify(planHistory.value.slice(-20)))
  }

  // 按分类获取资源库
  function getSpotsByCategory(category) {
    if (!category || category === 'all') return spots.value
    return spots.value.filter(s => s.category === category)
  }

  // 按行政区获取资源库
  function getSpotsByDistrict(district) {
    return spots.value.filter(s => s.district === district)
  }

  // 搜索资源库
  function searchSpots(keyword) {
    if (!keyword) return spots.value
    const kw = keyword.toLowerCase()
    return spots.value.filter(s =>
      s.name.toLowerCase().includes(kw) ||
      s.subcategory.some(tag => tag.toLowerCase().includes(kw)) ||
      s.district.includes(kw)
    )
  }

  return {
    wishlist,
    spots,
    currentPlan,
    settings,
    planHistory,
    initApp,
    addToWishlist,
    addFromLibrary,
    removeFromWishlist,
    updatePriority,
    saveSettings,
    savePlanHistory,
    getSpotsByCategory,
    getSpotsByDistrict,
    searchSpots
  }
})
