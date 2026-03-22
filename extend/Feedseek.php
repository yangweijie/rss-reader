<?php

use yzh52521\EasyHttp\Http;

/**
 * Class Feedseek
 * Feed 链接自动发现工具
 *
 * @package Feedseek
 */
class Feedseek
{
    const string W3C_FEED_VALIDATOR_URL = "https://validator.w3.org/feed/check.cgi";

    /**
     * @var bool 是否启用严格模式（验证 feed 有效性）
     */
    protected static bool $strict = false;

    /**
     * @var array 发现的 feed 列表，每项包含 title 和 url
     */
    protected static array $feeds = [];

    /**
     * @var int 请求超时时间（秒）
     */
    protected static int $timeout = 30;

    /**
     * 发现页面中的 feed 链接
     *
     * @param array|string $url 单个 URL 或 URL 数组
     * @param bool $strict 是否验证 feed 有效性
     * @return array
     * @throws InvalidArgumentException
     * @throws RuntimeException
     */
    public static function find(array|string $url, bool $strict = false): array
    {
        if (is_array($url)) {
            static $results = [];
            foreach ($url as $u) {
                if (isset($results[$u])) {
                    continue;
                }
                $results[$u] = static::find($u, $strict);
            }
            return $results;
        }

        if (!$url || !static::isValidUrl($url)) {
            throw new InvalidArgumentException("Invalid url");
        }

        static::$feeds = [];
        static::$strict = $strict;

        $response = Http::timeout(static::$timeout)->withVerify()->get($url);

        $statusCode = $response->status();
        if ($statusCode !== 200) {
            throw new RuntimeException(
                "Request failed ({$url}), status: {$statusCode}",
            );
        }

        $html = $response->body();
        static::parseHtml($html, $url);

        return static::$feeds;
    }

    /**
     * 解析 HTML 提取 feed 链接
     *
     * @param string $html
     * @param string $baseUrl
     */
    protected static function parseHtml(string $html, string $baseUrl): void
    {
        $dom = new DOMDocument();
        @$dom->loadHTML(
            '<?xml encoding="UTF-8">' . $html,
            LIBXML_NOERROR | LIBXML_NOWARNING,
        );

        $links = $dom->getElementsByTagName("link");

        foreach ($links as $node) {
            $rel = strtolower(trim($node->getAttribute("rel")));
            if ($rel === "alternate" || $rel === "self") {
                static::addFeed($node, $baseUrl);
            }
        }
    }

    /**
     * 添加 feed 到列表
     *
     * @param DOMElement $node
     * @param string $url
     */
    protected static function addFeed(DOMElement $node, string $url): void
    {
        if (!$node->getAttribute("href")) {
            return;
        }

        $feedLink = FeedLink::factory($node, $url);
        $uri = $feedLink->getUri();

        if (
            !static::isValidUrl($uri) ||
            static::isFeedExists($uri) ||
            (static::$strict && !static::isValidFeed($uri))
        ) {
            return;
        }

        // 获取 feed 标题，优先使用 title 属性，其次是 type 属性
        $title =
            $node->getAttribute("title") ?: $node->getAttribute("type") ?: $uri;

        static::$feeds[] = [
            "title" => $title,
            "url" => $uri,
        ];
    }

    /**
     * 检查 feed 是否已存在
     *
     * @param string $uri
     * @return bool
     */
    protected static function isFeedExists(string $uri): bool
    {
        foreach (static::$feeds as $feed) {
            if ($feed["url"] === $uri) {
                return true;
            }
        }
        return false;
    }

    /**
     * 验证 URL 是否有效
     *
     * @param string|null $url
     * @return bool
     */
    protected static function isValidUrl(?string $url): bool
    {
        if (!$url) {
            return false;
        }
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    /**
     * 验证 feed 是否有效（通过 W3C 验证器）
     *
     * @param string $url
     * @return bool
     */
    protected static function isValidFeed(string $url): bool
    {
        $requestUrl =
            static::W3C_FEED_VALIDATOR_URL .
            "?" .
            http_build_query([
                "url" => $url,
                "output" => "soap12",
            ]);

        try {
            $response = Http::timeout(static::$timeout)
                ->withVerify()
                ->get($requestUrl);

            $xml = $response->body();

            // 简单解析 SOAP 响应
            if (
                preg_match(
                    "/<m:validity[^>]*>([^<]+)<\/m:validity>/i",
                    $xml,
                    $matches,
                )
            ) {
                return strtolower(trim($matches[1])) === "true";
            }

            return false;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * 设置请求超时时间
     *
     * @param int $seconds
     */
    public static function setTimeout(int $seconds): void
    {
        static::$timeout = $seconds;
    }

    /**
     * 获取请求超时时间
     *
     * @return int
     */
    public static function getTimeout(): int
    {
        return static::$timeout;
    }
}
