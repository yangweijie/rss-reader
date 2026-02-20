<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Facebook\WebDriver\Remote\RemoteWebDriver;
use Facebook\WebDriver\Remote\DesiredCapabilities;
use Facebook\WebDriver\Chrome\ChromeOptions;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('rss:fetch-dusk {url}', function ($url) {
    $this->info("正在获取 RSS: {$url}");

    try {
        // 配置 Chrome 选项
        $chromeOptions = new ChromeOptions();
        $chromeOptions->addArguments([
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--disable-software-rasterizer',
            '--disable-extensions',
            'user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
            '--disable-blink-features=AutomationControlled',
        ]);

        // 创建 DesiredCapabilities
        $capabilities = DesiredCapabilities::chrome();
        $capabilities->setCapability(ChromeOptions::CAPABILITY, $chromeOptions);

        // 创建 WebDriver
        $driver = RemoteWebDriver::create(
            'http://localhost:9515',
            $capabilities
        );

        $this->info("WebDriver 创建成功");

        // 先访问主页建立会话
        $this->info("访问主页: https://php.libhunt.com");
        $driver->get('https://php.libhunt.com');
        sleep(2);
        $this->info("主页访问完成");

        // 访问 RSS 页面
        $this->info("访问 RSS: {$url}");
        $driver->get($url);
        $this->info("RSS 页面访问完成");

        // 等待 Cloudflare 验证完成
        $this->info("等待 Cloudflare 验证...");
        $waited = 0;
        $maxWait = 60; // 增加到 60 秒
        $rssContent = null;

        while ($waited < $maxWait) {
            $pageSource = $driver->getPageSource();
            $pageLength = strlen($pageSource);

            // 调试：输出前 200 字符
            if ($waited == 0) {
                $this->info("页面内容前 200 字符: " . substr($pageSource, 0, 200));
                $this->info("页面长度: {$pageLength} bytes");
            }

            // 检查是否通过验证
            if (strpos($pageSource, '<?xml version') !== false || 
                strpos($pageSource, '<rss version') !== false) {
                $this->info("✓ 验证成功！等待了 {$waited} 秒");
                $this->info("✓ RSS 内容长度: {$pageLength} bytes");
                $rssContent = $pageSource;
                break;
            }

            // 检查是否是正常的 HTML 页面（非 Cloudflare 验证页）
            if (strpos($pageSource, 'Just a moment') === false && 
                strpos($pageSource, '请稍候') === false &&
                $pageLength > 1000) {
                $title = $driver->getTitle();
                $this->info("✗ 页面已加载但不是 RSS");
                $this->info("✗ 页面标题: {$title}");
                $this->info("✗ 页面长度: {$pageLength} bytes");
                $this->info("✗ 页面前 1000 字符: " . substr($pageSource, 0, 1000));
                // 无论如何都尝试处理
                $rssContent = $pageSource;
                break;
            }

            sleep(3); // 每 3 秒检查一次
            $waited += 3;
            $this->info("⏳ 等待中... {$waited}/{$maxWait} 秒");
        }

        $driver->quit();
        $this->info("WebDriver 已关闭");

        if ($rssContent) {
            // 调试：输出前 500 字符
            $this->info("原始内容前 500 字符: " . substr($rssContent, 0, 500));
            
            // 清理 HTML 包装
            $rssContent = preg_replace('/^<html><head>.*?<\/head><body><pre[^>]*>/s', '', $rssContent);
            $rssContent = preg_replace('/<\/pre><\/body><<\/html>$/', '', $rssContent);
            $rssContent = trim($rssContent);

            // 转换 HTML 实体
            $rssContent = html_entity_decode($rssContent, ENT_QUOTES | ENT_HTML5, 'UTF-8');

            $this->info("清理后长度: " . strlen($rssContent) . " bytes");
            $this->info("清理后前 500 字符: " . substr($rssContent, 0, 500));

            if (strpos($rssContent, '<?xml') !== false || strpos($rssContent, '<rss') !== false) {
                $this->info("✓ 成功获取 RSS 内容！");
                $this->info("✓ 最终长度: " . strlen($rssContent) . " bytes");
                echo $rssContent;
                return 0;
            } else {
                $this->error("✗ 获取的内容不是有效的 RSS");
                return 1;
            }
        } else {
            $this->error("✗ 无法获取 RSS 内容");
            $this->error("✗ 等待超时 ({$maxWait} 秒)");
            return 1;
        }

    } catch (\Exception $e) {
        $this->error("✗ 错误: " . $e->getMessage());
        $this->error("✗ 堆栈: " . $e->getTraceAsString());
        return 1;
    }
})->describe('使用 Laravel Dusk 获取受 Cloudflare 保护的 RSS 内容');