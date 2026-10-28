# 京约 — 北京情侣约会愿望清单小程序

> uni-app (Vue 3) + 微信云开发 · v1.0
> 当前仅支持北京全城使用

## 一、项目结构

```
jingyue/
├── data/
│   └── beijing-spots.json          # 北京资源库初始数据（52 个点位）
├── cloud/
│   └── functions/
│       ├── initSpots/              # 资源库初始化云函数（部署后执行一次）
│       └── generatePlan/           # 云端方案生成（可选，前端已内置同款算法）
├── scripts/
│   ├── gen_icons.py                # tabBar 图标生成脚本（已生成，无需重复执行）
│   ├── test-generator.mjs          # 算法自测（5 组典型条件 + 愿望清单加权）
│   └── sync-cloud.mjs              # 把前端算法与资源库同步到云函数目录
├── src/
│   ├── pages/
│   │   ├── index/index.vue         # 首页：条件输入 + 精选方案 + 新手引导
│   │   ├── plan/plan.vue           # 方案结果：时间轴、换一换、节点替换、收藏
│   │   ├── wishlist/wishlist.vue   # 愿望清单：分类筛选、手动录入、优先级
│   │   ├── explore/explore.vue     # 北京探索：搜索、分类/区域筛选、一键收藏
│   │   └── settings/settings.vue   # 设置：默认值、城市入口（置灰）、通知
│   ├── store/index.js              # Pinia 全局状态 + 本地持久化
│   ├── utils/plan-generator.js     # 核心算法：筛选/打分/路线拼接/换一换
│   ├── utils/district-coords.js    # 16 区中心坐标（无 GPS 时的兜底出发位置）
│   ├── static/                     # tabBar 图标
│   ├── App.vue / main.js
│   ├── pages.json / manifest.json
└── package.json
```

## 二、跑起来（3 步）

### 1. 安装依赖并编译

```bash
npm install
npm run dev:mp-weixin
```

编译产物在 `dist/dev/mp-weixin`。

### 2. 配置小程序 AppID + 云环境

1. **AppID**：微信公众平台注册小程序，拿到 AppID 后：
   - 填入 `src/manifest.json` → `mp-weixin.appid`
   - 微信开发者工具导入项目时也填同一个 AppID
2. **云开发环境**：微信开发者工具 → 云开发 → 开通 → 复制环境 ID：
   - 填入 `src/App.vue` 中 `wx.cloud.init({ env: '你的环境ID' })`
   - 同时 `project.config.json` 的 `cloudfunctionRoot` 指向 `cloud/functions`

### 3. 部署云函数 + 初始化数据

在微信开发者工具中：

1. 右键 `cloud/functions/initSpots` → **上传并部署：云端安装依赖**
2. 右键 `initSpots` → **云端测试** → 直接调用，返回 `初始化完成：写入 52 条`
3. （可选）同样方式部署 `generatePlan`。云函数目录里的 `generator.js` 和 `initSpots/spots.json` 都是同步产物——**改过 `src/utils/plan-generator.js` 或 `data/beijing-spots.json` 后，先执行 `node scripts/sync-cloud.mjs` 再上传云函数**，避免两端漂移。

数据库会自动创建两个集合：
- `spots`：资源库（由 initSpots 写入）
- `plan_logs`：方案生成日志（generatePlan 自动写入）

> 注意：`plan_logs` 集合需要在云开发控制台手动创建（权限设为「仅创建者可读写」即可），否则日志写入会失败但不影响主流程。

## 三、核心能力与实现位置

| 能力 | 实现位置 | 说明 |
|------|---------|------|
| 三步生成方案 | `pages/index/index.vue` | 时长滑块 / 预算档位 / 出发行政区 |
| 新手无清单模式 | 同上 | 清单为空时直接从 50 个点位里生成 |
| 方案筛选与排序 | `utils/plan-generator.js` | 每步从当前位置重新打分：顺路 > 想去 > 应景；同区优先，最多 1 次跨区 |
| 营业时间校验 | 同上 | 解析 `openTime`（多时段 / 跨零点 / 停止入馆），排不进去的点位直接跳过 |
| 餐饮保底 | 同上 | 勾选含餐饮却没排上时，优先补附近餐厅（15km 内）；仍不行则标记 `mealMissing` 并在方案页提示 |
| 交通时间估算 | 同上 | 地铁 33km/h（含换乘 +15min）、打车 30km/h、骑行 12km/h、步行 4.8km/h；费用按北京地铁里程票价和出租起步价 13 元算 |
| 换一换 | `pages/plan/plan.vue` | 保持条件重算，历史方案 ID 去重 |
| 单点替换 | 同上 | 同区、同分类、评分最高的 5 个备选 |
| 愿望清单手动录入 | `pages/wishlist/wishlist.vue` | 名称/分类/耗时/人均/行政区 + 备注，全部本地持久化 |
| 资源库浏览收藏 | `pages/explore/explore.vue` | 搜索 + 分类 + 区域筛选 |
| 预约提醒 | 资源库字段 `needReservation` / `reservationInfo` | 方案页红色警告条 |
| 城市扩展预留 | `pages/settings/settings.vue` | 「切换城市」置灰，数据层 `district` 字段通用 |

## 四、数据说明

`data/beijing-spots.json` 共 52 个点位：

- **美食 15 家**：四季民福、南门涮肉、Metal Hands、susu、禄台 theBalcony、胡大、烤肉季、1886、CUPONE、黑天鹅、护国寺小吃、Berry Beans、维兰、牛排家、姚记炒肝
- **目的地 22 个**：故宫、颐和园、什刹海、天坛、南锣鼓巷、景山、五道营、798、红砖美术馆、亮马河、奥森、西什库教堂、杨梅竹斜街、三里屯、蓝色港湾、首钢园、东交民巷、北京海洋馆、国博、松美术馆、烟袋斜街、鼓楼
- **体验 15 项**：什刹海滑冰、奥森夜跑、首钢园日落、玉渊潭樱花、香山红叶、亮马河夜游船、胡同骑行、德云社、798 看展、簋街深夜食堂、南山滑雪、双人陶艺、Live House、居庸关花海、颐和园冰车

字段包含：名称 / 分类 / 场景标签 / 行政区 / 坐标 / 人均 / 时长 / 营业时间 / 预约要求 / 情侣评分 / 最佳时段 / 最佳季节 / Tips / 关联点位。

**扩充方式**：编辑 `data/beijing-spots.json` 后，重新执行 `initSpots` 云函数（会自动清空重写）。每个点位务必填准确坐标（GCJ-02），这是路线顺路计算的基础。

## 五、已知边界（v1.0 有意不做）

- 地图页/地图选点：设置页与首页均用行政区选择替代，后续接入腾讯位置服务
- 天气联动：方案页文案暂时写死，`plan.weather` 字段已预留
- 分享长图：按钮已就位，生成逻辑待 v1.1
- 商家合作入口：资源库已预留扩展点，未上 UI
- 社交/评论/直播：不规划

## 六、验证清单

- [x] 52 个点位数据完整（字段齐全，坐标已校准，JSON 合法）
- [x] 前端方案生成算法可独立运行（不依赖云函数），`node scripts/test-generator.mjs` 5/5 通过
- [x] 云函数两份：数据初始化 + 云端生成（算法与前端同源）
- [x] tabBar 图标已生成（81×81 PNG）
- [x] `npm run build:mp-weixin` 全量编译通过
- [ ] 真机验证方案生成耗时 < 2s
- [ ] 6 条精选路线实地走查
