<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## Qi Reader - RSS 阅读器

一个基于 Laravel、Inertia.js 和 React 构建的现代 RSS 阅读器应用。

### 功能特性

- 📰 订阅和管理 RSS 源
- 🏷️ 文章标签分类
- 🔍 全文搜索
- 🌐 多语言翻译支持
- ⭐ 收藏和标记已读
- 🎨 现代化 UI 设计
- 🌓 深色模式支持
- 📱 响应式设计

### 技术栈

- **后端**: Laravel 12.50.0, PHP 8.3.24
- **前端**: React 19.2.4, Inertia.js 2.3.13
- **UI 框架**: Tailwind CSS 3.2.1, Radix UI
- **数据库**: SQLite（可配置 MySQL/PostgreSQL）
- **队列**: Laravel Queue（支持异步任务）

## 本地开发

### 环境要求

- PHP >= 8.3
- Composer
- Node.js >= 18
- npm

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd qireader-laravel
```

2. 安装依赖
```bash
composer install
npm install
```

3. 配置环境
```bash
cp .env.example .env
php artisan key:generate
```

4. 运行迁移
```bash
php artisan migrate
```

5. 启动开发服务器
```bash
npm run dev
php artisan serve
```

访问 `http://localhost:8000` 查看应用。

## 部署到独立服务器

### 前置要求

- 服务器系统：Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- PHP >= 8.3
- Composer
- Node.js >= 18
- npm
- Web 服务器：Nginx 或 Apache
- 数据库：SQLite / MySQL / PostgreSQL
- Git

### 部署步骤

#### 1. 服务器准备

更新系统并安装必要软件：

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx git curl unzip software-properties-common

# 安装 PHP 8.3
sudo add-apt-repository ppa:ondrej/php
sudo apt update
sudo apt install -y php8.3 php8.3-fpm php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-sqlite3 php8.3-pdo php8.3-bcmath php8.3-gd php8.3-intl

# 安装 Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Supervisor（用于队列进程）
sudo apt install -y supervisor
```

#### 2. 克隆代码到服务器

```bash
# 创建项目目录
sudo mkdir -p /var/www
cd /var/www

# 克隆代码
git clone <your-repository-url> qireader-laravel
cd qireader-laravel
```

#### 3. 配置应用环境

```bash
# 复制环境配置
cp .env.example .env

# 生成应用密钥
php artisan key:generate

# 编辑 .env 文件，配置以下内容：
# APP_ENV=production
# APP_DEBUG=false
# APP_URL=https://your-domain.com
# 数据库配置（如果使用 MySQL/PostgreSQL）
```

#### 4. 安装依赖

```bash
# 安装 PHP 依赖
composer install --no-dev --optimize-autoloader

# 安装 Node.js 依赖
npm install
npm run build
```

#### 5. 设置目录权限

```bash
# 设置存储目录权限
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

# 设置缓存和日志目录
sudo chmod -R 775 storage/logs
sudo chmod -R 775 storage/framework
```

#### 6. 配置 Nginx

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/qireader
```

添加以下配置：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    root /var/www/qireader-laravel/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/qireader /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. 配置 HTTPS（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

#### 8. 配置队列进程（可选）

如果使用队列功能（如 RSS 刷新、图标获取），需要配置 Supervisor：

```bash
sudo nano /etc/supervisor/conf.d/qireader-worker.conf
```

添加以下配置：

```ini
[program:qireader-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/qireader-laravel/artisan queue:work --sleep=3 --tries=3
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/qireader-laravel/storage/logs/worker.log
stopwaitsecs=3600
```

启动队列进程：

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start qireader-worker:*
```

#### 9. 配置定时任务（可选）

添加 Cron 任务用于定期刷新 RSS：

```bash
sudo crontab -e
```

添加以下内容：

```cron
* * * * * cd /var/www/qireader-laravel && php artisan schedule:run >> /dev/null 2>&1
```

#### 10. 优化应用

```bash
# 缓存配置
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 优化 Composer 自动加载
composer dump-autoload --optimize
```

### 部署后续更新

当需要更新代码时：

```bash
cd /var/www/qireader-laravel

# 拉取最新代码
git pull

# 更新依赖
composer install --no-dev --optimize-autoloader
npm install
npm run build

# 运行迁移
php artisan migrate --force

# 清除缓存
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# 重启队列进程
sudo supervisorctl restart qireader-worker:*
```

### 监控和日志

- 应用日志：`/var/www/qireader-laravel/storage/logs/laravel.log`
- 队列日志：`/var/www/qireader-laravel/storage/logs/worker.log`
- Nginx 日志：`/var/log/nginx/`
- PHP-FPM 日志：`/var/log/php8.3-fpm/`

查看日志：

```bash
# 应用日志
tail -f /var/www/qireader-laravel/storage/logs/laravel.log

# 队列日志
tail -f /var/www/qireader-laravel/storage/logs/worker.log

# Nginx 错误日志
tail -f /var/log/nginx/error.log
```

### 常见问题

**1. 权限问题**

```bash
sudo chown -R www-data:www-data /var/www/qireader-laravel
sudo chmod -R 775 /var/www/qireader-laravel/storage
```

**2. 队列不工作**

```bash
sudo supervisorctl status qireader-worker:*
sudo supervisorctl restart qireader-worker:*
```

**3. 文件上传失败**

检查 `php.ini` 中的上传限制：

```ini
upload_max_filesize = 20M
post_max_size = 20M
```

重启 PHP-FPM：

```bash
sudo systemctl restart php8.3-fpm
```

**4. 静态资源 404**

确保 `public` 目录权限正确：

```bash
sudo chmod -R 755 /var/www/qireader-laravel/public
sudo chown -R www-data:www-data /var/www/qireader-laravel/public
```

### 安全建议

1. 定期更新系统和依赖包
2. 使用强密码和密钥
3. 配置防火墙规则
4. 定期备份数据库
5. 监控服务器资源使用
6. 启用 SSL/TLS
7. 限制文件上传大小和类型
8. 配置速率限制

### 备份策略

创建备份脚本 `/var/www/backup.sh`：

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/qireader"
mkdir -p $BACKUP_DIR

# 备份数据库
sqlite3 /var/www/qireader-laravel/database/database.sqlite ".backup $BACKUP_DIR/db_$DATE.sqlite"

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/qireader-laravel/storage/app/public

# 保留最近 7 天的备份
find $BACKUP_DIR -type f -mtime +7 -delete
```

添加到 Cron 任务：

```bash
# 每天凌晨 2 点备份
0 2 * * * /var/www/backup.sh
```

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
