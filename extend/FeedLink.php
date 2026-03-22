<?php
/**
 * Feed Link 类 - 用于解析和验证 feed 链接
 */
class FeedLink
{
    /**
     * @var DOMElement DOM 节点
     */
    protected DOMElement $node;

    /**
     * @var string 当前 URI
     */
    protected string $currentUri;

    /**
     * @var string feed 类型
     */
    protected string $type;

    /**
     * @param DOMElement $node
     * @param string $currentUri
     */
    public function __construct(DOMElement $node, string $currentUri)
    {
        $this->node = $node;
        $this->currentUri = $currentUri;
        $this->type = strtolower(trim($node->getAttribute("type")));
    }

    /**
     * 获取 URI
     * @return string|null
     */
    public function getUri(): ?string
    {
        return match ($this->type) {
            "application/rss+xml",
            "application/x.atom+xml",
            "application/atom+xml",
            "application/rdf+xml"
                => $this->buildUri(),
            default => null,
        };
    }

    /**
     * 构建完整 URI
     * @return string|null
     */
    protected function buildUri(): ?string
    {
        $href = $this->node->getAttribute("href");
        if (empty($href)) {
            return null;
        }

        // 处理协议相对 URL (//example.com/feed)
        if (str_starts_with($href, "//")) {
            $parsed = parse_url($this->currentUri);
            return ($parsed["scheme"] ?? "http") . ":" . $href;
        }

        // 处理绝对 URL
        if (preg_match("~^https?://~i", $href)) {
            return $href;
        }

        // 处理相对 URL
        $parsed = parse_url($this->currentUri);
        $scheme = $parsed["scheme"] ?? "http";
        $host = $parsed["host"] ?? "";
        $port = isset($parsed["port"]) ? ":" . $parsed["port"] : "";

        // 根路径
        if (str_starts_with($href, "/")) {
            return $scheme . "://" . $host . $port . $href;
        }

        // 相对路径
        $path = $parsed["path"] ?? "/";
        $path = dirname($path);
        if ($path !== "/") {
            $path .= "/";
        }

        return $scheme . "://" . $host . $port . $path . $href;
    }

    /**
     * 工厂方法
     * @param DOMElement $node
     * @param string $currentUri
     * @return static
     */
    public static function factory(DOMElement $node, string $currentUri): static
    {
        return new static($node, $currentUri);
    }
}
