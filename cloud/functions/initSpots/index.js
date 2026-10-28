/**
 * 京约 - 资源库初始化
 * 使用方法：在微信开发者工具中右键该云函数 → 上传并部署 → 云端测试执行一次即可
 * 重复执行会先清空 spots 集合再写入，避免脏数据
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const data = require('./spots.json')

exports.main = async () => {
  const collection = db.collection('spots')
  const spots = data.spots || []

  // 1. 清空旧数据（分批删除）
  let removed = 0
  try {
    while (true) {
      const batch = await collection.limit(100).get()
      if (batch.data.length === 0) break
      await Promise.all(batch.data.map(doc => collection.doc(doc._id).remove()))
      removed += batch.data.length
      if (batch.data.length < 100) break
    }
  } catch (e) {
    console.warn('collection may not exist yet:', e.message)
  }

  // 2. 写入新数据
  let inserted = 0
  const failed = []
  for (const spot of spots) {
    try {
      await collection.add({
        data: {
          ...spot,
          isActive: true,
          updatedAt: Date.now()
        }
      })
      inserted++
    } catch (e) {
      failed.push({ id: spot.id, error: e.message })
    }
  }

  return {
    code: 0,
    message: `初始化完成：删除 ${removed} 条，写入 ${inserted} 条`,
    total: spots.length,
    inserted,
    failed
  }
}
