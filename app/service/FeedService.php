<?php
declare(strict_types=1);

namespace app\service;

use app\model\Article;
use app\model\Subscription as Feed;
use Laminas\Feed\Reader\Reader;

class FeedService
{
    public static function discover(string $url): array
    {
        return \Feedseek::find($url);
    }

    public static function addFeed(
        int $userId,
        string $feedUrl,
        ?string $title = null,
    ): Feed {
        $feed = new Feed();
        $feed->user_id = $userId;
        $feed->url = $feedUrl;
        $feed->title = $title ?: self::fetchFeedTitle($feedUrl);
        $feed->save();

        self::refreshFeed($feed);

        return $feed;
    }

    public static function fetchFeedTitle(string $url): string
    {
        try {
            $feed = Reader::import($url);
            return $feed->getTitle() ?: "Unknown Feed";
        } catch (Exception $e) {
            return "Unknown Feed";
        }
    }

    public static function refreshFeed(Feed $feed): array
    {
        $result = ["new" => 0, "updated" => 0, "errors" => []];

        try {
            $feedData = Reader::import($feed->url);

            // 统计文章数量
            $articleCount = 0;
            foreach ($feedData as $entry) {
                $articleCount++;
            }

            // 重新导入以便遍历
            $feedData = Reader::import($feed->url);

            echo "[" .
                date("Y-m-d H:i:s") .
                "] local.INFO: 解析到 {$articleCount} 篇文章" .
                PHP_EOL;

            $feed->title = $feedData->getTitle() ?: $feed->title;
            $feed->description = $feedData->getDescription();
            $feed->last_fetched = date("Y-m-d H:i:s");
            $feed->save();

            foreach ($feedData as $entry) {
                $articleResult = self::syncArticle($feed, $entry);
                if ($articleResult === "created") {
                    $result["new"]++;
                } elseif ($articleResult === "updated") {
                    $result["updated"]++;
                }
            }
        } catch (Exception $e) {
            $result["errors"][] = $e->getMessage();
            echo "[" .
                date("Y-m-d H:i:s") .
                "] local.ERROR: 刷新失败: " .
                $e->getMessage() .
                PHP_EOL;
        }

        return $result;
    }

    protected static function syncArticle(Feed $feed, $entry): string
    {
        $link = $entry->getLink() ?: "";
        $title = $entry->getTitle() ?: "";
        $content = $entry->getContent() ?: $entry->getDescription() ?: "";
        $description = $entry->getDescription() ?: $content ?: "";
        $excerpt = strip_tags((string) $description);
        $excerpt = mb_substr($excerpt, 0, 200, "UTF-8");
        $author = $entry->getAuthor() ?: null;
        $publishedAt = $entry->getDateCreated() ?: new \DateTime();

        // 获取 guid（RSS 的唯一标识符）
        $guid = $entry->getId() ?: "";
        
        // 如果没有 guid，使用 link 的 MD5 hash 作为唯一标识
        if (empty($guid) && !empty($link)) {
            $guid = md5($link);
        }
        
        // 如果仍然没有唯一标识，使用 title + publishedAt 的 hash
        if (empty($guid)) {
            $guid = md5($title . $publishedAt->format("Y-m-d H:i:s"));
        }

        // 尝试使用 guid 查找（如果字段存在）
        $existing = null;
        try {
            $existing = Article::where("feed_id", "=", $feed->id)
                ->where("guid", "=", $guid)
                ->find();
        } catch (\Exception $e) {
            // guid 字段可能不存在，回退到使用 link
            $existing = null;
        }
        
        // 如果 guid 查找失败，使用 link 作为备用
        if (!$existing && !empty($link)) {
            $existing = Article::where("feed_id", "=", $feed->id)
                ->where("link", "=", $link)
                ->find();
        }

        if ($existing) {
            // 文章已存在，检查是否需要更新
            // 只有当发布时间或标题发生变化时才更新
            $existingPublishedAt = $existing->published_at
                ? strtotime($existing->published_at)
                : 0;
            $newPublishedAt = $publishedAt->getTimestamp();

            if (
                $existingPublishedAt == $newPublishedAt &&
                $existing->title === ($title ?: "No Title")
            ) {
                return "skipped";
            }

            $existing->title = $title ?: "No Title";
            $existing->content = $content ?: "";
            $existing->excerpt = $excerpt ?: "Click to read more";
            $existing->author = is_array($author)
                ? $author["name"] ?? null
                : $author;
            $existing->published_at = $publishedAt->format("Y-m-d H:i:s");
            $existing->link = $link; // 更新 link 以防链接发生变化
            // 尝试更新 guid 字段（如果存在）
            try {
                $existing->guid = $guid;
            } catch (\Exception $e) {
                // 忽略 guid 字段不存在的错误
            }
            $existing->save();
            return "updated";
        }

        $article = new Article();
        $article->feed_id = $feed->id;
        $article->user_id = $feed->user_id;
        $article->link = $link;
        $article->title = $title ?: "No Title";
        $article->content = $content ?: "";
        $article->excerpt = $excerpt ?: "Click to read more";
        $article->author = is_array($author)
            ? $author["name"] ?? null
            : $author;
        $article->published_at = $publishedAt->format("Y-m-d H:i:s");
        $article->read = 0;
        $article->favorite = 0;
        // 尝试设置 guid 字段（如果存在）
        try {
            $article->guid = $guid;
        } catch (\Exception $e) {
            // 忽略 guid 字段不存在的错误
        }
        $article->save();
        return "created";
    }

    public static function deleteFeed(Feed $feed): void
    {
        $feed->togher(Article::class)->delete();
        $feed->delete();
    }

    public static function markFeedRead(Feed $feed): void
    {
        Article::where("feed_id", $feed->id)->update(["read" => 1]);
    }

    public static function markAllRead(?int $userId): int
    {
        Article::where("user_id", $userId)->update([
            "read" => 1,
        ]);
    }

    public static function exportOpml(int $userId): string
    {
        $feeds = Feed::where("user_id", $userId)->select();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<opml version="2.0">';
        $xml .= "<head><title>QiReader Subscriptions</title></head>";
        $xml .= "<body>";

        foreach ($feeds as $feed) {
            $title = htmlspecialchars($feed->title);
            $url = htmlspecialchars($feed->url);
            $xml .= "<outline text=\"{$title}\" title=\"{$title}\" type=\"rss\" xmlUrl=\"{$url}\"/>";
        }

        $xml .= "</body></opml>";
        return $xml;
    }

    public static function importOpml(int $userId, string $opmlContent): array
    {
        $result = ["imported" => 0, "errors" => []];

        $dom = new \DOMDocument();
        @$dom->loadHTML($opmlContent);

        $xpath = new \DOMXPath($dom);
        $outlines = $xpath->query(
            '//outline[@type="rss"] | //outline[@xmlUrl]',
        );

        foreach ($outlines as $outline) {
            $xmlUrl = $outline->getAttribute("xmlUrl");
            if (empty($xmlUrl)) {
                continue;
            }

            $title =
                $outline->getAttribute("title") ?:
                $outline->getAttribute("text") ?:
                "Unknown";

            try {
                self::addFeed($userId, $xmlUrl, $title);
                $result["imported"]++;
            } catch (\Exception $e) {
                $result["errors"][] =
                    "Failed to import {$title}: " . $e->getMessage();
            }
        }

        return $result;
    }
}
