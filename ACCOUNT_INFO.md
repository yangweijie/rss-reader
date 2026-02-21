# Qi Reader 测试账户信息

## 账户详情

- **邮箱**: 917647288@qq.com
- **密码**: ya123456
- **用户名**: 测试用户
- **用户ID**: qnqmxluq4kg6885
- **创建时间**: 2026-02-08 15:31:35.734Z

## API 服务器信息

- **API 地址**: http://localhost:3003
- **健康检查**: http://localhost:3003/api/health
- **PocketBase 地址**: http://127.0.0.1:8090

## Token 信息

- **Token**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJfcGJfdXNlcnNfYXV0aF8iLCJleHAiOjE3NzExNjk0OTksImlkIjoicW5xbXhsdXE0a2c2ODg1IiwicmVmcmVzaGFibGUiOnRydWUsInR5cGUiOiJhdXRoIn0._DxMJjIoKBdiltvqEbdAovxUVKyP3CMtwu1oNofzPBo
- **过期时间**: 1771169499 (Unix timestamp)

## API 接口测试

### 1. 健康检查
```bash
curl http://localhost:3003/api/health
```

### 2. 登录
```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"917647288@qq.com","password":"ya123456"}'
```

### 3. 获取当前用户
```bash
curl http://localhost:3003/api/user/current \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. 获取分类列表
```bash
curl http://localhost:3003/api/categories \
  -H "Authorization: Bearer <TOKEN>"
```

### 5. 获取订阅源列表
```bash
curl http://localhost:3003/api/subscriptions \
  -H "Authorization: Bearer <TOKEN>"
```

### 6. 添加订阅源
```bash
curl -X POST http://localhost:3003/api/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"url":"https://example.com/feed.xml","title":"示例订阅源"}'
```

## PocketBase 集合结构

### 1. users (用户表)
- id: 主键
- email: 邮箱
- password: 密码
- name: 用户名
- avatar: 头像
- created/updated: 时间戳

### 2. categories (分类表)
- id: 主键
- label: 分类名称
- parentId: 父分类ID
- order: 排序
- userId: 用户ID (关联)
- created/updated: 时间戳

### 3. subscriptions (订阅源表)
- id: 主键
- url: RSS链接
- title: 标题
- categoryId: 分类ID (关联)
- userId: 用户ID (关联)
- icon: 图标
- unreadCount: 未读数
- created/updated: 时间戳

### 4. articles (文章表)
- id: 主键
- feedId: 订阅源ID (关联)
- userId: 用户ID (关联)
- title: 标题
- content: 内容
- excerpt: 摘要
- link: 链接
- publishedAt: 发布时间
- read: 已读状态
- favorite: 收藏状态
- author: 作者
- created/updated: 时间戳

## 数据库访问规则

所有集合都配置了基于用户ID的访问控制：
- 用户只能访问自己的数据
- 创建和更新操作只能对用户自己的数据进行
- 删除操作只能删除用户自己的数据

## 开发服务器状态

- **前端开发服务器**: http://localhost:3000 (Vite)
- **API 服务器**: http://localhost:3003 (Node.js + Express)
- **PocketBase**: http://127.0.0.1:8090

## 注意事项

1. API 服务器运行在 3003 端口（因为 3000 被 Vite 占用）
2. Token 有效期为 7 天
3. 所有 API 请求都需要在 Header 中携带 Authorization token
4. 用户数据完全隔离，每个用户只能访问自己的数据