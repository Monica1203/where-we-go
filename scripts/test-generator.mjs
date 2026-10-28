// 算法自测脚本：node scripts/test-generator.mjs
import { readFileSync } from 'fs'
import { generatePlan, getAlternatives } from '../src/utils/plan-generator.js'

const data = JSON.parse(readFileSync(new URL('../data/beijing-spots.json', import.meta.url)))
const spots = data.spots

const cases = [
  { name: '朝阳·半天·¥500', totalDuration: 300, totalBudget: 500, startDistrict: '朝阳', lat: 39.92, lng: 116.46 },
  { name: '东城·3小时·¥200', totalDuration: 180, totalBudget: 200, startDistrict: '东城', lat: 39.93, lng: 116.42 },
  { name: '海淀·一整天·¥1000', totalDuration: 600, totalBudget: 1000, startDistrict: '海淀', lat: 39.96, lng: 116.30 },
  { name: '西城·2小时·¥150', totalDuration: 120, totalBudget: 150, startDistrict: '西城', lat: 39.92, lng: 116.37 },
  { name: '石景山·半天·¥400', totalDuration: 300, totalBudget: 400, startDistrict: '石景山', lat: 39.91, lng: 116.19 }
]

let pass = 0
for (const c of cases) {
  const plan = generatePlan({
    totalDuration: c.totalDuration,
    totalBudget: c.totalBudget,
    startDistrict: c.startDistrict,
    startLat: c.lat,
    startLng: c.lng,
    transportMode: 'subway',
    timePreference: 'afternoon',
    includeMeal: true,
    wishlist: [],
    allSpots: spots,
    historyIds: []
  })

  const spotNodes = plan.nodes.filter(n => n.type === 'spot')
  const overTime = plan.totalDuration > c.totalDuration
  const overBudget = plan.totalBudget > c.totalBudget
  const hasFood = spotNodes.some(n => n.category === 'food')
  const maxSpots = spotNodes.length >= 2 && spotNodes.length <= 5

  const mealOk = hasFood || plan.mealMissing
  const ok = spotNodes.length >= 1 && !overTime && !overBudget && maxSpots && mealOk
  if (ok) pass++

  console.log(`\n=== ${c.name} === ${ok ? 'PASS' : 'FAIL'}`)
  console.log(`  点位 ${spotNodes.length} 个 | 实际耗时 ${plan.totalDuration}min/${c.totalDuration}min | 实际花费 ¥${plan.totalBudget}/${c.totalBudget} | 含餐饮: ${hasFood}${plan.mealMissing ? '（预算/时间内排不上，已标记）' : ''}`)
  console.log(`  路线: ${plan.routeDesc}`)
  spotNodes.forEach(n => {
    console.log(`    ${n.startTime}-${n.endTime}  ${n.name} (${n.district}, ¥${n.costPerPerson}/人)${n.fromWishlist ? ' ❤️' : ''}`)
  })
  if (overTime) console.log('  !! 超出时长')
  if (overBudget) console.log('  !! 超出预算')

  // 替换建议检查
  const first = spotNodes[0]
  if (first) {
    const alts = getAlternatives(first.spotId, spots, c.totalBudget)
    console.log(`  替换备选(${first.name}): ${alts.length} 个 -> ${alts.map(a => a.name).join('、') || '无'}`)
  }
}

console.log(`\n通过 ${pass}/${cases.length}`)

// 验证：愿望清单加权是否生效
const planWithWish = generatePlan({
  totalDuration: 300,
  totalBudget: 500,
  startDistrict: '朝阳',
  startLat: 39.92,
  startLng: 116.46,
  wishlist: [{ id: 'manual_1', name: '我想去的餐厅', category: 'food', district: '朝阳', latitude: 39.921, longitude: 116.461, duration: 60, costPerPerson: 80, priority: 'must' }],
  allSpots: spots
})
console.log('\n愿望清单加权测试:', planWithWish.nodes.filter(n => n.type === 'spot').map(n => n.name + (n.fromWishlist ? ' ❤️' : '')).join(' | '))
