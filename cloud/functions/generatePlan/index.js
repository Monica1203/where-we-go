/**
 * 京约 - 云端方案生成
 *
 * 算法本体与前端完全一致（generator.js 由 scripts/sync-cloud-generator.mjs 从
 * src/utils/plan-generator.js 自动同步，改算法时先改前端再跑一次同步脚本）。
 *
 * 云函数主要用于：
 * 1. 多端一致（后续 H5 / App 扩展）
 * 2. 服务端记录方案生成行为，供分析使用
 * 3. 资源库更新后可服务端直出，无需发版
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { generatePlan } = require('./generator')

exports.main = async (event) => {
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
    historyIds = []
  } = event

  // 拉取资源库（库表：spots）
  let allSpots = []
  try {
    const res = await db.collection('spots').where({ isActive: true }).limit(1000).get()
    allSpots = res.data
  } catch (e) {
    // 若库未初始化，回退到事件携带的数据
    allSpots = event.allSpots || []
  }

  // 云端没有 GPS 时用出发行政区中心点兜底
  const plan = generatePlan({
    totalDuration,
    totalBudget,
    startDistrict,
    startLat,
    startLng,
    transportMode,
    timePreference,
    vibePreference,
    includeMeal,
    wishlist,
    allSpots,
    historyIds
  })

  // 记录生成行为（失败不影响返回）
  try {
    await db.collection('plan_logs').add({
      data: {
        openid: cloud.getWXContext().OPENID,
        startDistrict,
        totalDuration,
        totalBudget,
        transportMode,
        timePreference,
        plan,
        createdAt: Date.now()
      }
    })
  } catch (e) {
    console.warn('plan_logs write failed:', e.message)
  }

  return { code: 0, data: plan }
}
