// 把前端算法与资源库同步到云函数目录（云函数打包时无法引用 src/ 与 data/）
// 用法：node scripts/sync-cloud.mjs
import { readFileSync, writeFileSync, copyFileSync } from 'fs'

// 1. 算法：ESM -> CommonJS
const srcUrl = new URL('../src/utils/plan-generator.js', import.meta.url)
const outUrl = new URL('../cloud/functions/generatePlan/generator.js', import.meta.url)
const src = readFileSync(srcUrl, 'utf8')
const body = src.replace(/^export function /gm, 'function ')
writeFileSync(outUrl, `// 本文件由 scripts/sync-cloud.mjs 自动生成，请勿直接修改
// 源文件：src/utils/plan-generator.js
${body}
module.exports = { generatePlan, getAlternatives }
`)

// 2. 资源库：data -> initSpots
const dataUrl = new URL('../data/beijing-spots.json', import.meta.url)
const initUrl = new URL('../cloud/functions/initSpots/spots.json', import.meta.url)
copyFileSync(dataUrl, initUrl)

console.log('已同步：算法 -> generatePlan/generator.js，资源库 -> initSpots/spots.json')
