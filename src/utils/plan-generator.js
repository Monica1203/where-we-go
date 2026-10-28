/**
 * 约会方案生成器 - 核心算法
 *
 * 输入：时长、预算、出发位置、偏好条件
 * 输出：完整的当日约会路线方案
 *
 * 算法策略：贪心 + 约束满足
 * 1. 地理就近优先（同区 > 相邻区 > 跨区，最多1次跨区）
 * 2. 时间匹配（总耗时 <= 用户输入时长）
 * 3. 预算控制（总花费 <= 用户预算上限）
 * 4. 路线顺路（不走回头路）
 * 5. 时段适配（尊重最佳到访时段）
 * 6. 季节匹配
 */

// 北京行政区相邻关系
const DISTRICT_ADJACENCY = {
  '东城': ['西城', '朝阳', '丰台'],
  '西城': ['东城', '海淀', '丰台'],
  '朝阳': ['东城', '丰台', '通州', '昌平', '顺义'],
  '海淀': ['西城', '石景山', '昌平', '丰台'],
  '丰台': ['东城', '西城', '朝阳', '海淀', '石景山', '大兴', '房山'],
  '石景山': ['海淀', '丰台', '门头沟'],
  '通州': ['朝阳', '大兴', '顺义'],
  '昌平': ['朝阳', '海淀', '顺义', '门头沟'],
  '大兴': ['丰台', '通州', '房山'],
  '顺义': ['朝阳', '通州', '昌平', '密云'],
  '房山': ['丰台', '大兴', '门头沟'],
  '门头沟': ['石景山', '昌平', '房山'],
  '密云': ['顺义', '怀柔'],
  '怀柔': ['密云', '昌平'],
  '延庆': ['昌平', '怀柔'],
  '平谷': ['密云', '顺义']
}

// 交通方式估算（speed 为平均速度，单位 km/分钟）
const TRANSPORT_SPEED = {
  subway: { speed: 0.55, baseTime: 15 }, // 地铁：约33km/h，含进出站+换乘
  taxi: { speed: 0.5, baseTime: 5 },     // 打车：约30km/h，含等车
  walk: { speed: 0.08, baseTime: 0 },    // 步行：约4.8km/h
  bike: { speed: 0.2, baseTime: 3 }      // 骑行：约12km/h
}

// 当前季节
function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

// 计算两点间距离（Haversine公式，单位km）
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 估算交通时间
function estimateTransport(dist, mode = 'subway') {
  const config = TRANSPORT_SPEED[mode] || TRANSPORT_SPEED.subway
  const moveTime = dist / config.speed
  return Math.round(moveTime + config.baseTime)
}

// 估算交通费用（双人）
function estimateTransportCost(dist, mode) {
  if (mode === 'walk' || mode === 'bike') return 0
  if (mode === 'taxi') {
    // 北京出租：起步价13元/3公里，之后约2.3元/公里
    return Math.round(13 + Math.max(0, dist - 3) * 2.3)
  }
  // 北京地铁按里程计价，取单人票价后 ×2
  const fare = dist <= 6 ? 3 : dist <= 12 ? 4 : dist <= 22 ? 5 : dist <= 32 ? 6 : 7
  return fare * 2
}

// 根据当前时刻判断所处时段
function activeTimeSlot(minutes) {
  const h = ((minutes / 60) % 24 + 24) % 24
  if (h < 11) return 'morning'
  if (h < 14) return 'lunch'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'dinner'
  return 'night'
}

// 判断时段是否匹配（软信号，仅用于打分）
function matchTimeSlot(spot, timeSlot) {
  if (!timeSlot || timeSlot === 'all') return true
  const slots = spot.bestTimeSlot || []
  if (slots.length === 0) return true
  if (slots.includes(timeSlot)) return true
  // evening / dinner 视为同一时段
  if (timeSlot === 'dinner' && slots.includes('evening')) return true
  if (timeSlot === 'evening' && slots.includes('dinner')) return true
  return false
}

// 咖啡 / 下午茶这类轻餐饮，不适合为它跨城奔波
const LIGHT_FOOD_TAGS = ['胡同咖啡', '下午茶']
function isLightFood(spot) {
  return (spot.subcategory || []).some(tag => LIGHT_FOOD_TAGS.includes(tag))
}

// 判断季节是否匹配
function matchSeason(spot) {
  const season = getCurrentSeason()
  const seasons = spot.bestSeason || []
  return seasons.length === 0 || seasons.includes(season)
}

// 判断区域是否相邻
function isAdjacent(district1, district2) {
  if (district1 === district2) return true
  const adj = DISTRICT_ADJACENCY[district1] || []
  return adj.includes(district2)
}

/**
 * 生成约会方案
 * @param {Object} options
 * @param {number} options.totalDuration - 总时长（分钟）
 * @param {number} options.totalBudget - 双人预算上限（元）
 * @param {string} options.startDistrict - 出发行政区
 * @param {number} options.startLat - 出发纬度
 * @param {number} options.startLng - 出发经度
 * @param {string} options.transportMode - 出行方式
 * @param {string} options.timePreference - 时段偏好
 * @param {string} options.vibePreference - 氛围偏好
 * @param {boolean} options.includeMeal - 是否包含餐饮
 * @param {Array} options.wishlist - 用户愿望清单
 * @param {Array} options.allSpots - 全部资源库点位
 * @param {Array} options.historyIds - 已生成方案ID列表（去重）
 * @returns {Object} 方案对象
 */
export function generatePlan(options) {
  const {
    totalDuration = 300,
    totalBudget = 500,
    startDistrict = '朝阳',
    startLat = 39.92,
    startLng = 116.46,
    transportMode = 'subway',
    timePreference = 'afternoon',
    vibePreference = '',
    includeMeal = true,
    wishlist = [],
    allSpots = [],
    historyIds = []
  } = options

  // 合并候选池：愿望清单 + 资源库
  const candidates = mergeCandidates(wishlist, allSpots)

  // 第一轮筛选：基础约束
  let filtered = candidates.filter(spot => {
    // 季节匹配（硬约束：应季才推荐）
    if (!matchSeason(spot)) return false
    // 如果不需要餐饮，过滤美食类
    if (!includeMeal && spot.category === 'food') return false
    // 说明：bestTimeSlot 不做硬过滤，只在打分时加权。
    // 因为「下午出发」的路线常跨到晚餐时段，且营业时间校验会兜底。
    return true
  })

  // 第二轮筛选：地理就近
  const byDistrict = groupByDistrict(filtered, startDistrict)

  // 构建方案
  const plan = buildRoute({
    byDistrict,
    startDistrict,
    startLat,
    startLng,
    totalDuration,
    totalBudget,
    transportMode,
    timePreference,
    includeMeal,
    historyIds
  })

  return plan
}

// 合并候选池
function mergeCandidates(wishlist, allSpots) {
  const merged = new Map()

  // 资源库点位
  allSpots.forEach(spot => {
    merged.set(spot.id, { ...spot, fromWishlist: false })
  })

  // 用户愿望清单（手动录入的，不在资源库中的）
  wishlist.forEach(item => {
    if (!merged.has(item.id)) {
      merged.set(item.id, {
        ...item,
        category: item.category || 'destination',
        subcategory: [],
        openTime: '',
        needReservation: false,
        reservationInfo: '',
        coupleRating: 3.5,
        bestTimeSlot: [],
        bestSeason: ['spring', 'summer', 'autumn', 'winter'],
        tips: [],
        relatedSpotIds: [],
        fromWishlist: true,
        priority: item.priority || 'want'
      })
    } else {
      // 在资源库中也有，标记为来自愿望清单（提高权重）
      const existing = merged.get(item.id)
      existing.fromWishlist = true
      existing.priority = item.priority || 'want'
    }
  })

  return Array.from(merged.values())
}

// 按区域分组
function groupByDistrict(spots, startDistrict) {
  const groups = {
    same: [],      // 同区
    adjacent: [],  // 相邻区
    other: []      // 其他区
  }

  spots.forEach(spot => {
    if (spot.district === startDistrict) {
      groups.same.push(spot)
    } else if (isAdjacent(startDistrict, spot.district)) {
      groups.adjacent.push(spot)
    } else {
      groups.other.push(spot)
    }
  })

  return groups
}

// ============ 营业时间解析与校验 ============

/**
 * 解析营业时间字符串为分钟区间数组
 * 支持：
 *  - "11:00-22:00"
 *  - "11:00-14:00, 17:00-23:00"（多时段）
 *  - "11:00-03:00"（跨零点）
 *  - "08:30-17:00（16:00停止入馆）"（取停止入馆时间作为截止）
 *  - "全天开放" / "全天（店铺约10:00-22:00）" → null 表示不限
 *  - "约12月底-2月初，视天气开放"（无时间信息）→ null 表示未知，放行
 */
function parseOpenRanges(openTime) {
  if (!openTime) return null
  if (openTime.includes('全天')) return null

  // "停止入馆/入场/入内" 优先作为截止时间
  const stopMatch = openTime.match(/(\d{1,2}):(\d{2})\s*停止(?:入馆|入场|入内|售票)/)
  const stopAt = stopMatch ? parseInt(stopMatch[1], 10) * 60 + parseInt(stopMatch[2], 10) : null

  const ranges = []
  const re = /(\d{1,2}):(\d{2})\s*[-–—~至]\s*(\d{1,2}):(\d{2})/g
  let m
  while ((m = re.exec(openTime)) !== null) {
    let start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
    let end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10)
    if (end <= start) end += 1440 // 跨零点，如 11:00-03:00
    ranges.push([start, end])
  }

  if (ranges.length === 0) return null
  if (stopAt !== null) {
    return ranges.map(([s, e]) => [s, Math.min(e, stopAt < s ? stopAt + 1440 : stopAt)])
  }
  return ranges
}

/**
 * 判断 [startMin, endMin) 是否完全落在营业时间内
 * 对跨零点营业（如 11:00-03:00）自动处理日期偏移
 */
function isOpenDuring(spot, startMin, endMin) {
  const ranges = parseOpenRanges(spot.openTime)
  if (!ranges) return true
  for (const [s, e] of ranges) {
    for (const offset of [0, 1440, -1440]) {
      const a = startMin + offset
      const b = endMin + offset
      if (a >= s && b <= e) return true
    }
  }
  return false
}

/**
 * 裁掉尾部节点后，按剩余节点重算路线状态
 */
function recalcState(state, { startLat, startLng, startHour, totalDuration, totalBudget, startDistrict }) {
  const spots = state.nodes.filter(n => n.type === 'spot')
  const transits = state.nodes.filter(n => n.type === 'transit')
  const spentTime = spots.reduce((s, n) => s + n.duration, 0) + transits.reduce((s, n) => s + n.duration, 0)
  const spentBudget = spots.reduce((s, n) => s + n.cost, 0) + transits.reduce((s, n) => s + n.cost, 0)

  state.remainingTime = totalDuration - spentTime
  state.remainingBudget = totalBudget - spentBudget
  state.currentTime = startHour * 60 + spentTime

  const last = spots[spots.length - 1]
  state.currentLat = last ? last.latitude : startLat
  state.currentLng = last ? last.longitude : startLng

  state.crossDistrictUsed = spots.some(s => s.district !== startDistrict && !isAdjacent(startDistrict, s.district))
}

// 构建路线
function buildRoute(params) {
  const {
    byDistrict,
    startDistrict,
    startLat,
    startLng,
    totalDuration,
    totalBudget,
    transportMode,
    timePreference,
    includeMeal,
    historyIds
  } = params

  // 计算起始时间
  const startHour = timePreference === 'morning' ? 9 :
    timePreference === 'evening' ? 17 :
    timePreference === 'night' ? 19 : 14

  const state = {
    remainingTime: totalDuration,
    remainingBudget: totalBudget,
    crossDistrictUsed: false,
    currentLat: startLat,
    currentLng: startLng,
    currentTime: startHour * 60,
    nodes: []
  }

  // 候选池（同区 / 相邻区 / 其他区），实际顺序每一步按当前位置动态重排
  const pool = [
    ...byDistrict.same,
    ...byDistrict.adjacent,
    ...byDistrict.other
  ]

  // 从当前位置为候选点位打分排序（顺路优先）
  function rankFromCurrent(candidates) {
    return scoreAndSort(
      candidates,
      state.currentLat,
      state.currentLng,
      startDistrict,
      activeTimeSlot(state.currentTime),
      state.currentTime
    )
  }

  // 尝试把某个点位追加到方案末尾（含交通），成功返回 true
  function tryAppend(spot) {
    // 跨区检查
    const isCrossDistrict = spot.district !== startDistrict && !isAdjacent(startDistrict, spot.district)
    if (isCrossDistrict && state.crossDistrictUsed) return false

    const dist = calcDistance(state.currentLat, state.currentLng, spot.latitude, spot.longitude)

    // 咖啡/下午茶只就近安排（6km 内），不值得为此横跨半个北京
    if (isLightFood(spot) && dist > 6) return false

    const transportTime = estimateTransport(dist, transportMode)
    const transportCost = estimateTransportCost(dist, transportMode)

    // 同名/包含关系的点位视为重复（如「首钢园」与「首钢园看日落」）
    const existingNames = state.nodes.filter(n => n.type === 'spot').map(n => n.name)
    if (existingNames.some(n => n === spot.name || n.includes(spot.name) || spot.name.includes(n))) {
      return false
    }

    const spotDuration = spot.duration || 60
    const needTime = (state.nodes.length > 0 ? transportTime : 0) + spotDuration
    if (needTime > state.remainingTime) return false

    const spotCost = (spot.costPerPerson || 0) * 2
    const needBudget = (state.nodes.length > 0 ? transportCost : 0) + spotCost
    if (needBudget > state.remainingBudget) return false

    // 营业时间校验（含交通后的到店时间）
    const arriveAt = state.currentTime + (state.nodes.length > 0 ? transportTime : 0)
    if (!isOpenDuring(spot, arriveAt, arriveAt + spotDuration)) return false

    // 避免连续两顿餐饮
    const lastSpot = [...state.nodes].reverse().find(n => n.type === 'spot')
    if (spot.category === 'food' && lastSpot && lastSpot.category === 'food') return false

    // 写入交通节点
    if (state.nodes.length > 0) {
      state.nodes.push({
        type: 'transit',
        mode: transportMode,
        duration: transportTime,
        cost: transportCost,
        description: getTransportDescription(transportMode, dist, transportTime, transportCost)
      })
      state.remainingTime -= transportTime
      state.remainingBudget -= transportCost
      state.currentTime += transportTime
    }

    // 写入点位节点
    state.nodes.push({
      type: 'spot',
      spotId: spot.id,
      name: spot.name,
      category: spot.category,
      district: spot.district,
      startTime: formatTime(state.currentTime),
      endTime: formatTime(state.currentTime + spotDuration),
      duration: spotDuration,
      cost: spotCost,
      costPerPerson: spot.costPerPerson || 0,
      latitude: spot.latitude,
      longitude: spot.longitude,
      tips: spot.tips || [],
      needReservation: spot.needReservation || false,
      reservationInfo: spot.reservationInfo || '',
      fromWishlist: spot.fromWishlist || false
    })

    state.remainingTime -= spotDuration
    state.remainingBudget -= spotCost
    state.currentTime += spotDuration
    state.currentLat = spot.latitude
    state.currentLng = spot.longitude
    if (isCrossDistrict) state.crossDistrictUsed = true
    return true
  }

  // 主循环：每一步都从当前位置重新排序，保证路线顺路
  while (state.nodes.filter(n => n.type === 'spot').length < 5) {
    if (state.remainingTime <= 0 || state.remainingBudget <= 0) break
    let appended = false
    for (const spot of rankFromCurrent(pool)) {
      if (tryAppend(spot)) { appended = true; break }
    }
    // 剩下的点位都放不进当前方案了
    if (!appended) break
  }

  // 餐饮保底：用户要求含餐饮但一个都没排上时，尝试补一顿饭
  const hasFood = () => state.nodes.some(n => n.type === 'spot' && n.category === 'food')
  if (includeMeal && !hasFood()) {
    // 只在当前位置 15km 内找餐厅，避免"为吃一顿饭跨半个北京"
    const foodPool = pool.filter(s => {
      if (s.category !== 'food') return false
      return calcDistance(state.currentLat, state.currentLng, s.latitude, s.longitude) <= 15
    })
    const tryFood = () => {
      for (const f of rankFromCurrent(foodPool)) {
        if (tryAppend(f)) return true
      }
      return false
    }

    let appended = tryFood()

    // 还是排不上：从末尾逐个裁掉点位腾时间/预算，再试一次（最多裁 2 个）
    if (!appended) {
      for (let trim = 0; trim < 2 && !appended; trim++) {
        const spotIdxs = state.nodes.map((n, i) => n.type === 'spot' ? i : -1).filter(i => i >= 0)
        if (spotIdxs.length <= 1) break
        const lastIdx = spotIdxs[spotIdxs.length - 1]
        state.nodes = state.nodes.slice(0, lastIdx)
        // 去掉尾部可能残留的交通节点
        while (state.nodes.length && state.nodes[state.nodes.length - 1].type === 'transit') {
          state.nodes.pop()
        }
        // 依据保留的节点重算状态
        recalcState(state, {
          startLat, startLng, startHour,
          totalDuration, totalBudget, startDistrict
        })
        appended = tryFood()
      }
    }
  }

  const nodes = state.nodes

  // 计算方案总计
  const spotNodes = nodes.filter(n => n.type === 'spot')
  const transitNodes = nodes.filter(n => n.type === 'transit')
  const totalSpotTime = spotNodes.reduce((sum, n) => sum + n.duration, 0)
  const totalTransitTime = transitNodes.reduce((sum, n) => sum + n.duration, 0)
  const totalSpotCost = spotNodes.reduce((sum, n) => sum + n.cost, 0)
  const totalTransitCost = transitNodes.reduce((sum, n) => sum + n.cost, 0)

  // 生成方案ID
  const planId = 'plan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)

  // 获取路线涉及的区域
  const districts = [...new Set(spotNodes.map(n => n.district))]
  const routeDesc = districts.length === 1 ? districts[0] : districts.join(' → ')

  return {
    id: planId,
    requestedDuration: totalDuration,
    requestedBudget: totalBudget,
    totalDuration: totalSpotTime + totalTransitTime,
    totalBudget: totalSpotCost + totalTransitCost,
    spotCount: spotNodes.length,
    startDistrict,
    routeDesc,
    transportMode,
    // 用户要求含餐饮但时间/预算内排不上时置为 true，前端给出提示
    mealMissing: includeMeal && !spotNodes.some(n => n.category === 'food'),
    nodes,
    weather: null, // 天气信息后续接入API
    createdAt: Date.now()
  }
}

// 打分排序（越顺路、越想去、越应景越靠前）
function scoreAndSort(spots, currentLat, currentLng, startDistrict, timeSlot, currentMinutes) {
  const isMealTime = currentMinutes === undefined ? true :
    (currentMinutes >= 630 && currentMinutes <= 840) || // 10:30-14:00 午餐
    (currentMinutes >= 1020 && currentMinutes <= 1260)   // 17:00-21:00 晚餐

  return spots
    .map(spot => {
      let score = 0

      // 距离分（越近越高，权重最高）
      const dist = calcDistance(currentLat, currentLng, spot.latitude, spot.longitude)
      score += Math.max(0, 12 - dist * 2.5)

      // 情侣评分
      score += (spot.coupleRating || 3) * 2

      // 愿望清单加权
      if (spot.fromWishlist) {
        const priorityWeight = spot.priority === 'must' ? 15 :
          spot.priority === 'really' ? 10 : 5
        score += priorityWeight
      }

      // 区域加分：同区优先，相邻区次之
      if (spot.district === startDistrict) score += 6
      else if (isAdjacent(startDistrict, spot.district)) score += 2

      // 时段匹配（软加权）
      if (matchTimeSlot(spot, timeSlot)) score += 5
      else score -= 3

      // 非饭点安排餐饮要扣分：正餐扣得更多，咖啡/小吃扣得少
      if (spot.category === 'food' && !isMealTime) {
        score -= isLightFood(spot) ? 4 : 8
      }

      return { ...spot, score }
    })
    .sort((a, b) => b.score - a.score)
}

// 格式化时间
function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// 生成交通描述
function getTransportDescription(mode, dist, time, cost) {
  const modeNames = {
    subway: '🚇 地铁',
    taxi: '🚕 打车',
    walk: '🚶 步行',
    bike: '🚲 骑行'
  }
  const modeName = modeNames[mode] || '🚇 地铁'
  if (mode === 'walk') {
    return `${modeName} · 约${time}min`
  }
  return `${modeName} · 约${time}min · ¥${cost}`
}

/**
 * 生成替换建议（同区域同类别的备选点位）
 */
export function getAlternatives(spotId, allSpots, currentBudget) {
  const spot = allSpots.find(s => s.id === spotId)
  if (!spot) return []

  return allSpots
    .filter(s => {
      if (s.id === spotId) return false
      if (s.category !== spot.category) return false
      if (s.district !== spot.district) return false
      if ((s.costPerPerson || 0) * 2 > currentBudget) return false
      if (!matchSeason(s)) return false
      return true
    })
    .sort((a, b) => (b.coupleRating || 3) - (a.coupleRating || 3))
    .slice(0, 5)
}
