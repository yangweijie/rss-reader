<?php

namespace App\Jobs;

use App\Models\Subscription;
use Favicon\Favicon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FetchSubscriptionIcon implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $subscriptionId;

    /**
     * Create a new job instance.
     */
    public function __construct($subscriptionId)
    {
        $this->subscriptionId = $subscriptionId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $subscription = Subscription::find($this->subscriptionId);

        if (!$subscription) {
            Log::warning("订阅源 {$this->subscriptionId} 不存在，跳过图标获取");
            return;
        }

        // 如果已经有图标，跳过
        if (!empty($subscription->icon)) {
            Log::info("订阅源 {$subscription->title} (ID: {$subscription->id}) 已有图标，跳过获取");
            return;
        }

        $iconUrl = $this->fetchWebsiteIcon($subscription->url);

        if ($iconUrl) {
            $subscription->icon = $iconUrl;
            $subscription->save();
            Log::info("订阅源 {$subscription->title} (ID: {$subscription->id}) 图标更新成功: {$iconUrl}");
        } else {
            Log::info("订阅源 {$subscription->title} (ID: {$subscription->id}) 未找到图标");
        }
    }

    /**
     * 获取网站图标
     */
    private function fetchWebsiteIcon($url)
    {
        try {
            // 解析 URL 获取域名
            $parsedUrl = parse_url($url);
            $domain = $parsedUrl['host'] ?? '';
            
            if (empty($domain)) {
                return null;
            }

            $scheme = $parsedUrl['scheme'] ?? 'https';
            $baseUrl = $scheme . '://' . $domain;
            Log::info("开始获取网站图标: {$domain}");

            // 尝试多个 URL 策略
            $urlsToTry = [
                $baseUrl,  // 原域名
            ];

            // 如果是子域名，也尝试顶级域名
            if (substr_count($domain, '.') > 1) {
                $parts = explode('.', $domain);
                $topLevelDomain = implode('.', array_slice($parts, -2));
                $topLevelUrl = $scheme . '://' . $topLevelDomain;
                if ($topLevelUrl !== $baseUrl) {
                    $urlsToTry[] = $topLevelUrl;
                    Log::info("也尝试顶级域名: {$topLevelDomain}");
                }
            }

            // 跟随重定向获取最终 URL
            foreach ($urlsToTry as $testUrl) {
                $finalUrl = $this->getRedirectedUrl($testUrl);
                if ($finalUrl && $finalUrl !== $testUrl) {
                    Log::info("检测到重定向: {$testUrl} -> {$finalUrl}");
                    $urlsToTry[] = $finalUrl;
                }
            }

            // 去重并尝试每个 URL
            $urlsToTry = array_unique($urlsToTry);
            
            foreach ($urlsToTry as $tryUrl) {
                $iconUrl = $this->fetchIconFromUrl($tryUrl);
                
                if ($iconUrl) {
                    Log::info("成功获取图标: {$iconUrl}");
                    return $iconUrl;
                }
            }

            Log::info("未找到网站图标: {$domain}");
            return null;
        } catch (\Exception $e) {
            Log::error('获取网站图标失败: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 获取重定向后的最终 URL
     */
    private function getRedirectedUrl($url, $timeout = 5)
    {
        try {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            
            if ($httpCode == 301 || $httpCode == 302 || $httpCode == 303 || $httpCode == 307 || $httpCode == 308) {
                $redirectUrl = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
                curl_close($ch);
                
                if ($redirectUrl) {
                    // 如果是相对路径，转换为绝对路径
                    if (!parse_url($redirectUrl, PHP_URL_SCHEME)) {
                        $parsedUrl = parse_url($url);
                        $redirectUrl = $parsedUrl['scheme'] . '://' . $parsedUrl['host'] . '/' . ltrim($redirectUrl, '/');
                    }
                    return $redirectUrl;
                }
            }
            
            curl_close($ch);
            return null;
        } catch (\Exception $e) {
            Log::debug("获取重定向 URL 失败: " . $e->getMessage());
            return null;
        }
    }

    /**
     * 从指定 URL 获取图标
     */
    private function fetchIconFromUrl($url)
    {
        try {
            // 规范化 URL：移除末尾斜杠
            $normalizedUrl = rtrim($url, '/');
            
            Log::info("尝试从 URL 获取图标: {$normalizedUrl}");
            
            // 使用 Favicon 库获取图标
            $favicon = new Favicon();
            $iconUrl = $favicon->get($normalizedUrl);
            
            if ($iconUrl && $iconUrl !== $normalizedUrl) {
                Log::info("找到图标 URL: {$iconUrl}");
                return $iconUrl;
            }

            return null;
        } catch (\Exception $e) {
            Log::info("从 {$url} 获取图标失败: " . $e->getMessage());
            return null;
        }
    }
}