<script setup>
import { onLaunch } from '@dcloudio/uni-app'
import { useAppStore } from './store/index.js'

onLaunch(() => {
  console.log('京约 App Launch')
  // 初始化云开发环境
  if (!wx.cloud) {
    console.error('请使用 2.2.3 或以上的基础库以使用云能力')
  } else {
    wx.cloud.init({
      env: 'jingyue-prod', // 替换为实际的云开发环境ID
      traceUser: true
    })
  }

  // 初始化应用数据
  const store = useAppStore()
  store.initApp()
})
</script>

<style>
page {
  background-color: #faf8f5;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}
</style>
