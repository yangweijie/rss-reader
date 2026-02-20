<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Dusk\Browser;
use Laravel\Dusk\ChromeDriver;
use Facebook\WebDriver\Chrome\ChromeOptions;
use Facebook\WebDriver\Remote\RemoteWebDriver;
use Facebook\WebDriver\Remote\DesiredCapabilities;

class FetchRssWithDusk extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rss:fetch-dusk {url : RSS 订阅源 URL}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = '使用 Laravel Dusk 获取受 Cloudflare 保护的 RSS 内容';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $url = $this->argument('url');

        $this->info("正在获取 RSS: {$url}");

        try {
            $rssContent = $this->fetchRss($url);

            if ($rssContent) {
                // 清理 HTML 包装
                $rssContent = preg_replace('/^<html><head>.*?<\/head><body><pre[^>]*>/s', '', $rssContent);
                $rssContent = preg_replace('/<\/pre><\/body><\/html>$/', '', $rssContent);
                $rssContent = trim($rssContent);

                // 验证是否是有效的 XML
                if (strpos($rssContent, '<?xml') !== false || strpos($rssContent, '<rss') !== false) {
                    $this->info("成功获取 RSS 内容！");
                    $this->info("长度: " . strlen($rssContent) . " bytes");
                    
                    // 输出 RSS 内容
                    echo $rssContent;
                    return 0;
                } else {
                    $this->error("获取的内容不是有效的 RSS");
                    return 1;
                }
            } else {
                $this->error("无法获取 RSS 内容");
                return 1;
            }
        } catch (\Exception $e) {
            $this->error("错误: " . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }

    /**
     * 使用 Dusk 获取 RSS 内容
     */
    private function fetchRss($url)
    {
        $rssContent = null;

        // 启动 Chrome Driver
        $driver = $this->createChromeDriver();

        try {
            $browser = new Browser($driver);

            // 先访问主页建立会话
            $domain = parse_url($url, PHP_URL_SCHEME) . '://' . parse_url($url, PHP_URL_HOST);
            $this->info("访问主页: {$domain}");
            $browser->visit($domain);

            // 等待页面加载
            $browser->pause(2000);

            // 访问 RSS URL
            $this->info("访问 RSS: {$url}");
            $browser->visit($url);

            // 等待 Cloudflare 验证完成（最多 20 秒）
            $this->info("等待 Cloudflare 验证...");
            $maxWait = 20;
            $waited = 0;

            while ($waited < $maxWait) {
                $pageSource = $browser->driver->getPageSource();

                // 检查是否获取到 RSS 内容
                if (strpos($pageSource, '&lt;?xml version') !== false || 
                    strpos($pageSource, '&lt;rss version') !== false ||
                    strpos($pageSource, '<?xml version') !== false || 
                    strpos($pageSource, '<rss version') !== false) {
                    $this->info("验证成功！等待了 {$waited} 秒");
                    $rssContent = $pageSource;
                    break;
                }

                if (strpos($pageSource, 'Just a moment') === false && 
                    strpos($pageSource, '请稍候') === false) {
                    $this->info("页面已加载但不是 RSS");
                    break;
                }

                $browser->pause(2000);
                $waited += 2;
            }

            if ($rssContent === null) {
                $this->error("验证超时或失败");
            }

            $browser->quit();

        } catch (\Exception $e) {
            $this->error("Dusk 浏览器错误: " . $e->getMessage());
            if (isset($browser)) {
                $browser->quit();
            }
        }

        return $rssContent;
    }

    /**
     * 创建 Chrome Driver
     */
    private function createChromeDriver()
    {
        $options = new ChromeOptions();
        $options->addArguments([
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

        $options->setExperimentalOption('excludeSwitches', ['enable-automation']);
        $options->setExperimentalOption('useAutomationExtension', false);

        $capabilities = DesiredCapabilities::chrome();
        $capabilities->setCapability(ChromeOptions::CAPABILITY, $options);

        $driver = RemoteWebDriver::create(
            'http://localhost:9515',
            $capabilities
        );

        // 隐藏 webdriver 特征
        $driver->executeScript('Object.defineProperty(navigator, "webdriver", {get: () => undefined})');

        return $driver;
    }
}