<?php

namespace App\Services;

use SimplePie\SimplePie;
use Illuminate\Support\Facades\Log;

class RssParser
{
    private SimplePie $feed;
    private ?string $rawData = null;

    public function __construct()
    {
        $this->feed = new SimplePie();
        $this->configureFeed();
    }

    private function configureFeed(): void
    {
        $this->feed->set_cache_location(storage_path('app/cache/rss'));
        $this->feed->set_cache_duration(3600);
        $this->feed->enable_cache(true);
        $this->feed->set_useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        $this->feed->set_output_encoding('UTF-8');
        $this->feed->set_timeout(60);
    }

    public function parseFromUrl(string $url): bool
    {
        $this->feed->set_feed_url($url);
        return $this->feed->init();
    }

    public function parseFromRawData(string $rawData): bool
    {
        $this->rawData = $rawData;
        $this->feed->set_raw_data($rawData);
        return $this->feed->init();
    }

    public function getItems(): array
    {
        return $this->feed->get_items() ?? [];
    }

    public function getTitle(): ?string
    {
        return $this->feed->get_title();
    }

    public function getLink(): ?string
    {
        return $this->feed->get_link();
    }

    public function getDescription(): ?string
    {
        return $this->feed->get_description();
    }

    public function getLanguage(): ?string
    {
        return $this->feed->get_language();
    }

    public function hasError(): bool
    {
        return (bool) $this->feed->error();
    }

    public function getError(): string
    {
        return $this->feed->error();
    }

    public function getRawData(): ?string
    {
        return $this->rawData;
    }

    public static function cleanXmlContent(string $content): string
    {
        // 移除 BOM 标记
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $content = preg_replace('/^\xFE\xFF/', '', $content);
        $content = preg_replace('/^\xFF\xFE/', '', $content);

        // 移除缓存注释（WordPress 常见）
        $content = preg_replace('/<!--Cached.*?-->/s', '', $content);
        $content = preg_replace('/<!--[^>]*-->/s', '', $content);

        // 修复未闭合的注释
        $content = preg_replace('/<!--[^>]*$/s', '', $content);

        // 修复未闭合的 CDATA
        $content = preg_replace('/<!\[CDATA\[(?![^\]]*\]\]>)/s', '<![CDATA[]]>', $content);

        // 移除 CDATA 标签，保留内容
        $content = preg_replace('/<!\[CDATA\[/s', '', $content);
        $content = preg_replace('/\]\]>/s', '', $content);

        // 移除控制字符
        $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content);

        // 修复多重 XML 声明
        $content = preg_replace('/(<\?xml[^>]*\?>)/s', '$1', $content);

        // 确保有 XML 声明
        if (strpos($content, '<?xml') === false && strpos($content, '<rss') !== false) {
            $content = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . $content;
        }

        return $content;
    }

    public static function fetchAndCleanRawData(string $url): ?string
    {
        try {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            $content = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode != 200) {
                Log::warning("获取 RSS 失败: HTTP {$httpCode} - {$url}");
                return null;
            }

            // 检查是否是 gzip 压缩的
            if (substr($content, 0, 2) === "\x1f\x8b") {
                $content = gzdecode($content);
            }

            return self::cleanXmlContent($content);
        } catch (\Exception $e) {
            Log::error('获取原始数据失败: ' . $e->getMessage());
            return null;
        }
    }
}
