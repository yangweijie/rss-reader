// 构建后把 Vite 生成的 index.html 同步为 ThinkPHP 的壳视图。
// 资源以 base "/static/app/" 绝对路径引用,壳视图无需任何模板变量。
import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '../../public/static/app/index.html')
const dest = path.resolve(here, '../../view/index/index.html')

copyFileSync(src, dest)
console.log(`[sync-shell] ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dest)}`)
