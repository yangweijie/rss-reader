# QiReader Laravel 前端开发指南

## 概述

本项目前端基于 **Laravel + Inertia.js + React 19** 技术栈，参考 qireader-react 项目重新实现，支持订阅源分类功能。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Laravel | 12.x | 后端框架 |
| Inertia.js | 2.x | 前后端桥接 |
| React | 19.x | 前端框架 |
| Tailwind CSS | 3.x | 样式系统 |
| Framer Motion | 12.x | 动画库 |
| Radix UI | - | 无障碍组件 |
| Lucide React | - | 图标库 |

## 项目结构

```
resources/js/
├── components/
│   ├── ui/              # 基础 UI 组件
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Dialog.jsx
│   │   ├── DropdownMenu.jsx
│   │   └── ContextMenu.jsx
│   ├── Feed/            # 订阅源组件
│   │   ├── FeedItem.jsx  # 单个订阅源/文件夹
│   │   └── FeedList.jsx  # 订阅源列表（树状结构）
│   ├── Article/         # 文章组件
│   │   ├── ArticleList.jsx
│   │   └── ArticleContent.jsx
│   └── Layout/          # 布局组件
│       ├── Sidebar.jsx
│       └── DashboardLayout.jsx
├── Pages/               # Inertia 页面
│   └── Articles/
│       └── Index.jsx    # 主页面（三栏布局）
└── lib/
    └── utils.js         # 工具函数
```

## 核心功能

### 1. 订阅源树状结构

订阅源支持分类文件夹，数据模型：

```typescript
interface FeedItem {
  id: string;            // 'category-{id}' 或 'subscription-{id}'
  name: string;          // 显示名称
  isFolder: boolean;     // 是否为文件夹
  icon?: string;         // 图标 URL
  unreadCount: number;   // 未读数量
  children?: FeedItem[]; // 子项目（仅文件夹）
  categoryId?: number;   // 分类 ID
  subscriptionId?: number; // 订阅源 ID
}
```

### 2. 三栏布局

```
┌─────────────┬──────────────────┬─────────────────────────┐
│   Sidebar   │   ArticleList    │    ArticleContent       │
│   (240px)   │    (420px)       │    (剩余宽度)            │
│             │                  │                         │
│ - 全部文章   │ - 筛选按钮        │ - 文章标题              │
│ - 稍后阅读   │ - 文章列表        │ - 文章元信息            │
│ - 标签      │ - 批量操作        │ - 文章内容              │
│ - 订阅源树   │                  │                         │
└─────────────┴──────────────────┴─────────────────────────┘
```

### 3. 右键菜单功能

- 刷新订阅源
- 重命名
- 移动到...
- 删除

### 4. API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /categories | 获取分类树 |
| POST | /categories | 创建分类 |
| PUT | /categories/{id} | 更新分类 |
| DELETE | /categories/{id} | 删除分类 |
| POST | /subscriptions/{id}/move | 移动订阅源 |

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 运行测试
php artisan test --filter=CategoryApiTest
```

## 主题颜色

| 用途 | 颜色值 |
|------|--------|
| 主色调 | #861DD4 |
| 背景色 | #F5F5F5 |
| 边框色 | #E8E8E8 |
| 主文字 | #191919 |
| 次文字 | #595959 |
| 弱文字 | #919191 |

## 组件使用示例

### FeedList 组件

```jsx
import FeedList from '@/components/Feed/FeedList';

<FeedList
  items={feedItems}
  expandedFolders={expandedFolders}
  onToggleFolder={(id) => handleToggle(id)}
  onSelect={(item) => handleSelect(item)}
  selectedId={selectedId}
/>
```

### ArticleList 组件

```jsx
import ArticleList from '@/components/Article/ArticleList';

<ArticleList
  articles={articles}
  selectedIds={selectedIds}
  selectedArticleId={selectedArticle?.id}
  onSelectOne={handleSelectOne}
  onArticleClick={handleArticleClick}
  onFavorite={handleFavorite}
/>
```

## 注意事项

1. **Inertia.js 共享数据**: subscriptions、categories、tags 通过 HandleInertiaRequests 中间件全局共享
2. **分类树构建**: Sidebar 组件中的 buildFeedTree 使用 useMemo 优化性能
3. **动画效果**: 使用 Framer Motion 实现，已在 FeedItem 组件中配置
4. **响应式设计**: 移动端支持侧边栏折叠

## 后续优化

- [ ] 实现拖拽排序
- [ ] 添加键盘快捷键
- [ ] 优化移动端体验
- [ ] 添加暗色模式切换
