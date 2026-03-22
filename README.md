# QiReader - RSS 阅读器

基于 ThinkPHP 8.0 + 现代前端技术栈的 RSS 阅读器，支持订阅源管理、文章阅读、标签分类、导入导出等功能。

## 功能特性

### 订阅源管理
- 添加/删除 RSS 订阅源
- 订阅源按分类分组展示
- 支持分类展开/收起
- 只显示未读筛选
- 导入/导出 OPML 文件

### 文章阅读
- 文章列表展示（标题、摘要、缩略图）
- 文章详情页（支持 HTML 内容渲染）
- 搜索文章（标题、内容关键字高亮）
- 标记已读/未读
- 收藏文章（稍后阅读）
- 标记全部已读

### 分类与标签
- 自定义分类管理
- 文章标签管理
- 按分类/标签筛选文章

### 其他特性
- JWT 身份认证
- 响应式设计（支持移动端）
- 图片 referrerPolicy 保护
- 队列任务（订阅源刷新）

## 技术栈

### 后端
- **框架**: ThinkPHP 8.0
- **数据库**: SQLite/MySQL
- **认证**: JWT (hulang/think-jwt)
- **队列**: kode/queue
- **RSS 解析**: laminas/laminas-feed

### 前端
- **样式**: Tailwind CSS + DaisyUI
- **构建**: Bun
- **图标**: SVG 图标

### 主要依赖库

#### 1. hulang/think-jwt
JWT 验证库，用于用户认证。

```php
use think\facade\Jwt;

// 生成 Token
$token = Jwt::getToken(['user_id' => $userId]);

// 验证 Token
$result = Jwt::Check($token);
```

#### 2. linron/think-dto
DTO（数据传输对象）库，支持注解验证。

```php
class ArticleDto extends BaseDto
{
    #[Valid('require', '文章ID不能为空')]
    public int $article_id;
}
```

#### 3. kode/queue
队列系统，用于异步刷新订阅源。

#### 4. big-dream/think-jump
统一响应格式处理。

## 安装部署

### 环境要求
- PHP >= 8.0
- SQLite/MySQL
- Bun (前端构建)

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd rss2
```

2. 安装 PHP 依赖
```bash
composer install
```

3. 安装前端依赖
```bash
bun install
```

4. 编译前端资源
```bash
bun run build
# 或开发模式
bun run dev
```

5. 配置环境
```bash
cp .example.env .env
# 编辑 .env 配置数据库等信息
```

6. 初始化数据库
```bash
php think migrate:run
```

7. 启动队列消费者（用于异步刷新订阅源）

**方式一：使用数据库队列（推荐，无需额外依赖）**

确保 `config/queue.php` 中默认驱动为 `database`：
```php
'default' => 'database',
```

然后启动队列消费者：
```bash
php extend/QueueConsumer.php
```

**方式二：使用 Redis 队列（需要 Redis 服务）**

安装 Redis 并修改 `.env`：
```env
QUEUE_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

启动队列消费者：
```bash
php extend/QueueConsumer.php
```

**方式三：同步模式（开发调试，不启用队列）**

修改 `.env`：
```env
QUEUE_DRIVER=sync
```

同步模式下任务会立即执行，无需启动队列消费者。

8. 启动 Web 服务
```bash
php think run
```

访问 `http://localhost:8000`

> **提示**：生产环境建议使用 Supervisor 或 Systemd 管理队列消费者进程，确保队列服务持续运行。

## API 接口

### 认证相关
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 退出

### 文章相关
- `GET /api/articles/all` - 全部文章
- `GET /api/articles/stars` - 收藏文章
- `GET /api/articles/by-tag` - 标签下文章
- `GET /api/articles/by-feed` - 订阅源文章
- `GET /api/articles/by-category` - 分类下文章
- `POST /api/articles/star` - 收藏文章
- `POST /api/articles/unstar` - 取消收藏
- `POST /api/articles/read` - 标记已读
- `POST /api/articles/unread` - 标记未读
- `POST /api/articles/read-above` - 标记以上已读

### 订阅源相关
- `GET /api/feeds` - 订阅源列表
- `POST /api/feed/discover` - 发现订阅源
- `POST /api/feed/add` - 添加订阅源
- `POST /api/feed/edit` - 编辑订阅源
- `POST /api/feed/del` - 删除订阅源
- `POST /api/feed/refresh` - 刷新订阅源
- `GET /api/feed/export` - 导出 OPML
- `POST /api/feed/import` - 导入 OPML

### 分类相关
- `GET /api/categories` - 分类列表
- `POST /api/categories/add` - 添加分类
- `POST /api/categories/edit` - 编辑分类
- `POST /api/categories/del` - 删除分类

### 标签相关
- `GET /api/tags` - 标签列表
- `POST /api/tag/add` - 添加标签
- `POST /api/tag/edit` - 编辑标签
- `POST /api/tag/del` - 删除标签

## 项目结构

```
├── app/
│   ├── controller/      # 控制器
│   │   ├── api/         # API 控制器
│   │   └── Index.php    # 页面控制器
│   ├── model/           # 数据模型
│   ├── service/         # 业务逻辑
│   ├── middleware/      # 中间件
│   └── domain/          # DTO 类
├── config/              # 配置文件
├── database/            # 数据库文件
├── public/              # 入口文件
│   └── static/          # 静态资源
├── route/               # 路由定义
├── view/                # 视图模板
│   └── index/           # 前端页面
└── extend/              # 扩展类
```

## 数据库表结构

### 核心表
- `users` - 用户表
- `subscriptions` - 订阅源表
- `articles` - 文章表
- `categories` - 分类表
- `tags` - 标签表
- `article_tags` - 文章标签关联表

## 前端特性

### 文章详情样式
- 响应式排版
- 代码块高亮
- 图片自适应
- 引用块样式
- 链接样式优化

### 快捷键
- `↑/↓` - 上一篇/下一篇文章
- `m` - 标记已读/未读
- `s` - 收藏/取消收藏

## 导入/导出

支持 OPML 格式的订阅源导入导出，兼容：
- Feedly
- Inoreader
- Reeder
- 其他 RSS 阅读器

## 队列系统

本项目使用队列异步处理订阅源刷新任务，避免阻塞前端请求。

### 队列配置

队列配置文件位于 `config/queue.php`，支持以下驱动：
- **sync**：同步模式，任务立即执行（开发环境使用）
- **database**：数据库队列，使用 SQLite/MySQL 存储任务（推荐）
- **redis**：Redis 队列，高性能但需安装 Redis

### 队列工作原理

1. 用户点击「刷新」按钮时，系统创建队列任务
2. 队列消费者从队列中取出任务并执行
3. `RefreshFeedJob` 负责抓取 RSS 内容并更新文章

### 生产环境部署

使用 Supervisor 管理队列进程：

```ini
; /etc/supervisor/conf.d/rss2-queue.conf
[program:rss2-queue]
command=php /path/to/rss2/extend/QueueConsumer.php
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/log/rss2-queue.log
```

启动 Supervisor：
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start rss2-queue
```

## 开发计划

- [x] 基础 RSS 订阅和阅读
- [x] 分类管理
- [x] 标签系统
- [x] 搜索功能（标题+内容）
- [x] 导入/导出 OPML
- [x] 夜间模式
- [x] 键盘快捷键
- [x] 文章分享
- [ ] 文章分享（更多平台）
- [ ] 全文搜索（Elasticsearch）
- [ ] 文章归档
- [ ] 阅读统计

## License

MIT License