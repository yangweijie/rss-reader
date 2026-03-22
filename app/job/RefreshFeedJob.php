<?php
declare(strict_types=1);

namespace app\job;

use app\model\Subscription;
use app\service\FeedService;
use think\facade\Log;

class RefreshFeedJob
{
    public function handle(array $data): bool
    {
        $userId = $data['user_id'] ?? null;
        $feedId = $data['feed_id'] ?? null;

        if (!$userId) {
            return false;
        }

        // 刷新指定订阅源或全部订阅源
        if ($feedId) {
            $feed = Subscription::where('id', $feedId)
                ->where('user_id', $userId)
                ->find();
            
            if ($feed) {
                $this->refreshSingleFeed($feed);
            }
        } else {
            // 刷新用户所有订阅源
            $feeds = Subscription::where('user_id', $userId)->select();
            $totalFeeds = count($feeds);
            
            $this->logInfo("开始刷新 {$totalFeeds} 个订阅源");
            
            foreach ($feeds as $index => $feed) {
                try {
                    $this->logInfo("[{$index}/{$totalFeeds}] 正在处理...");
                    $this->refreshSingleFeed($feed);
                } catch (\Exception $e) {
                    // 记录错误但继续处理其他订阅源
                    $this->logError("刷新订阅源失败: {$feed->id} - " . $e->getMessage());
                }
            }
            
            $this->logInfo("全部订阅源刷新完成");
        }

        return true;
    }
    
    /**
     * 刷新单个订阅源
     */
    private function refreshSingleFeed(Subscription $feed): void
    {
        $this->logInfo("获取订阅源 {$feed->id} {$feed->url}");
        
        $result = FeedService::refreshFeed($feed);
        
        $newCount = $result['new'] ?? 0;
        $updatedCount = $result['updated'] ?? 0;
        
        $this->logInfo("订阅源 {$feed->id} 刷新成功：新增 {$newCount} 篇，更新 {$updatedCount} 篇");
    }
    
    /**
     * 输出 INFO 级别日志
     */
    private function logInfo(string $message): void
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] local.INFO: {$message}";
        
        // 同时输出到控制台和日志文件
        echo $logMessage . PHP_EOL;
        Log::info($message);
    }
    
    /**
     * 输出 ERROR 级别日志
     */
    private function logError(string $message): void
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] local.ERROR: {$message}";
        
        // 同时输出到控制台和日志文件
        echo $logMessage . PHP_EOL;
        Log::error($message);
    }
}
