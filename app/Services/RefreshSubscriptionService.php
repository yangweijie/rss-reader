<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\Article;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RefreshSubscriptionService
{
    private RssParser $parser;
    private ?User $user;

    public function __construct(?User $user = null)
    {
        $this->parser = new RssParser();
        $this->user = $user;
    }

    public function setUser(User $user): self
    {
        $this->user = $user;
        return $this;
    }

    public function refresh(Subscription $subscription): RefreshResult
    {
        $result = new RefreshResult($subscription);
        $maxRetries = 3;
        $retryDelay = 10;

        try {
            Log::info("获取订阅源 {$subscription->id} {$subscription->url} 中");
            
            // 获取并清理原始数据（不需要事务）
            $rawData = RssParser::fetchAndCleanRawData($subscription->url);

            if ($rawData === null) {
                $result->addError("无法获取 RSS 内容");
                $this->updateSubscriptionError($subscription, "无法获取 RSS 内容");
                return $result;
            }

            // 解析 RSS（不需要事务）
            if (!$this->parser->parseFromRawData($rawData)) {
                $error = $this->parser->getError();

                // 检测是否是反爬虫保护
                if ($this->isAntiBotProtection($error)) {
                    $fallbackData = $this->fetchWithFallback($subscription->url);

                    if ($fallbackData !== null) {
                        if (!$this->parser->parseFromRawData($fallbackData)) {
                            $result->addError("Fallback 解析失败: " . $this->parser->getError());
                            $this->updateSubscriptionError($subscription, $this->parser->getError());
                            return $result;
                        }
                    } else {
                        $result->addError("无法绕过反爬虫保护");
                        $this->updateSubscriptionError($subscription, "无法绕过反爬虫保护");
                        return $result;
                    }
                } else {
                    $result->addError($error);
                    $this->updateSubscriptionError($subscription, $error);
                    return $result;
                }
            }

            // 解析文章数据（不需要事务）
            $items = $this->parser->getItems();
            $itemCount = count($items);

            Log::info("解析到 {$itemCount} 篇文章");

            // 如果文章少于 2 篇，直接处理不需要事务
            if ($itemCount < 2) {
                $newCount = 0;
                $updatedCount = 0;

                foreach ($items as $item) {
                    $articleResult = $this->syncArticle($subscription, $item);
                    if ($articleResult === "created") {
                        $newCount++;
                    } elseif ($articleResult === "updated") {
                        $updatedCount++;
                    }
                }

                // 更新订阅源信息
                $this->updateSubscriptionInfo($subscription);

                $result->setSuccess($newCount, $updatedCount);
                return $result;
            }

            // 如果文章 >= 2 篇，使用事务批量处理
            for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                try {
                    DB::beginTransaction();

                    $newCount = 0;
                    $updatedCount = 0;

                    foreach ($items as $item) {
                        $articleResult = $this->syncArticle($subscription, $item);
                        if ($articleResult === "created") {
                            $newCount++;
                        } elseif ($articleResult === "updated") {
                            $updatedCount++;
                        }
                    }

                    // 更新订阅源信息
                    $this->updateSubscriptionInfo($subscription);

                    $result->setSuccess($newCount, $updatedCount);
                    DB::commit();

                    Log::info("订阅源 {$subscription->id} 刷新成功：新增 {$newCount} 篇，更新 {$updatedCount} 篇");
                    return $result;

                } catch (\Exception $e) {
                    DB::rollBack();

                    // 检测数据库锁定错误
                    $isDatabaseLocked = stripos($e->getMessage(), 'database is locked') !== false 
                                     || stripos($e->getMessage(), 'SQLSTATE[HY000]') !== false;

                    if ($isDatabaseLocked && $attempt < $maxRetries) {
                        Log::warning("数据库锁定 [{$subscription->id}]，第 {$attempt} 次重试，等待 {$retryDelay} 秒");
                        sleep($retryDelay);
                        continue;
                    }

                    throw $e;
                }
            }

        } catch (\Exception $e) {
            $result->addError($e->getMessage());
            $this->updateSubscriptionError($subscription, $e->getMessage());
            Log::error(
                "刷新订阅源失败 [{$subscription->id}]: " . $e->getMessage(),
                [
                    "subscription_id" => $subscription->id,
                    "url" => $subscription->url,
                    "trace" => $e->getTraceAsString(),
                ],
            );
        }

        return $result;
    }

    private function updateSubscriptionInfo(Subscription $subscription): void
    {
        $feedTitle = $this->parser->getTitle();
        $unreadCount = Article::where("feed_id", $subscription->id)
            ->where("read", false)
            ->count();

        $subscription->update([
            "title" => $feedTitle ?: $subscription->title,
            "unread_count" => $unreadCount,
            "error_message" => null,
            "last_error_at" => null,
        ]);
    }

    private function syncArticle(Subscription $subscription, $item): string
    {
        $link = $item->get_link();
        $title = $item->get_title();
        $content = $item->get_content();
        $excerpt = $item->get_description();
        $author = $item->get_author();
        $publishedAt = $item->get_date("U");

        // 处理发布时间
        if (!$publishedAt) {
            $publishedAt = Carbon::now()->timestamp;
        } else {
            $publishedAt = Carbon::createFromTimestamp($publishedAt)->timestamp;
        }

        // 清理内容
        if (empty($content) && !empty($excerpt)) {
            $content = $excerpt;
        }

        $excerpt = strip_tags($excerpt ?: $content);
        $excerpt = mb_substr($excerpt, 0, 200, "UTF-8");

        // 检查文章是否存在
        $existingArticle = Article::where("feed_id", $subscription->id)
            ->where("link", $link)
            ->first();

        if ($existingArticle) {
            // 检查发布时间是否变化
            $existingPublishedAt = $existingArticle->published_at->timestamp;
            $newPublishedAt = $publishedAt;

            // 如果发布时间相同，跳过更新
            if ($existingPublishedAt == $newPublishedAt) {
                return "skipped";
            }

            // 只有发布时间变化时才更新
            $existingArticle->update([
                "title" => $title ?: "无标题",
                "content" => $content,
                "excerpt" => $excerpt ?: "点击标题阅读全文",
                "author" => $author ? $author->name : null,
                "published_at" => Carbon::createFromTimestamp($newPublishedAt),
            ]);
            return "updated";
        } else {
            // 创建新文章
            Article::create([
                "user_id" => $subscription->user_id,
                "feed_id" => $subscription->id,
                "title" => $title ?: "无标题",
                "content" => $content,
                "excerpt" => $excerpt ?: "点击标题阅读全文",
                "link" => $link,
                "author" => $author ? $author->name : null,
                "published_at" => Carbon::createFromTimestamp($publishedAt),
                "read" => false,
                "favorite" => false,
            ]);
            return "created";
        }
    }

    private function isAntiBotProtection(string $error): bool
    {
        return strpos($error, "403") !== false ||
            strpos($error, "Just a moment") !== false ||
            strpos($error, "请稍候") !== false;
    }

    private function fetchWithFallback(string $url): ?string
    {
        // 优先使用 Dusk 方案
        $duskData = $this->fetchWithDusk($url);
        if ($duskData !== null) {
            return $duskData;
        }

        // 回退到 Selenium 方案
        return $this->fetchWithSelenium($url);
    }

    private function fetchWithDusk(string $url): ?string
    {
        try {
            Log::info("Dusk: 开始获取 URL: {$url}");

            $phpPath = PHP_BINARY ?: "php";
            $command =
                $phpPath .
                " " .
                base_path("artisan") .
                " rss:fetch-dusk " .
                escapeshellarg($url);

            $output = shell_exec($command . " 2>&1");

            if (!empty($output)) {
                $output = html_entity_decode(
                    $output,
                    ENT_QUOTES | ENT_HTML5,
                    "UTF-8",
                );
                $output = preg_replace(
                    "/^<html><head>.*?<\/head><body><pre[^>]*>/s",
                    "",
                    $output,
                );
                $output = preg_replace(
                    '/<\/pre><\/body><\/html>$/',
                    "",
                    $output,
                );
                $output = trim($output);

                if (
                    strpos($output, "<?xml") !== false ||
                    strpos($output, "<rss") !== false
                ) {
                    Log::info("Dusk: 成功获取 RSS: {$url}");
                    return $output;
                }
            }

            return null;
        } catch (\Exception $e) {
            Log::error("Dusk 获取 RSS 异常: " . $e->getMessage());
            return null;
        }
    }

    private function fetchWithSelenium(string $url): ?string
    {
        try {
            Log::info("Selenium: 开始获取 URL: {$url}");

            $oldDir = getcwd();
            chdir(base_path());

            $command =
                escapeshellcmd("python3") .
                " " .
                escapeshellarg("scripts/fetch_rss_with_selenium.py") .
                " " .
                escapeshellarg($url);
            $output = shell_exec($command . " 2>&1");

            chdir($oldDir);

            if (!empty($output)) {
                $output = html_entity_decode(
                    $output,
                    ENT_QUOTES | ENT_HTML5,
                    "UTF-8",
                );
                $output = preg_replace(
                    "/^<html><head>.*?<\/head><body><pre[^>]*>/s",
                    "",
                    $output,
                );
                $output = preg_replace(
                    '/<\/pre><\/body><\/html>$/',
                    "",
                    $output,
                );
                $output = trim($output);

                if (
                    strpos($output, "<?xml") !== false ||
                    strpos($output, "<rss") !== false
                ) {
                    Log::info("Selenium: 成功获取 RSS: {$url}");
                    return $output;
                }
            }

            return null;
        } catch (\Exception $e) {
            Log::error("Selenium 获取 RSS 异常: " . $e->getMessage());
            return null;
        }
    }

    private function updateSubscriptionError(
        Subscription $subscription,
        string $error,
    ): void {
        $subscription->update([
            "error_message" => $error,
            "last_error_at" => now(),
        ]);
    }
}
