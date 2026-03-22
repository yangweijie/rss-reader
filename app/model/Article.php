<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

/**
 * @mixin \think\Model
 */
class Article extends Model
{
    protected $table = "articles";

    // 摘要最大长度
    const EXCERPT_MAX_LENGTH = 200;

    public function articleTags()
    {
        return $this->hasMany(ArticleTags::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function feed()
    {
        return $this->belongsTo(Subscription::class, 'feed_id');
    }

    /**
     * 内容获取器：为 img 标签添加 referrerPolicy="no-referrer"
     */
    public function getContentAttr($value)
    {
        if (empty($value)) {
            return $value;
        }
        // 为所有 img 标签添加 referrerPolicy 属性
        return preg_replace('/<img(\s+[^>]*)?>/i', '<img$1 referrerPolicy="no-referrer">', $value);
    }

    /**
     * 摘要获取器：限制长度，并处理 img 标签
     */
    public function getExcerptAttr($value)
    {
        if (empty($value)) {
            return $value;
        }
        // 先为 img 标签添加 referrerPolicy
        $value = preg_replace('/<img(\s+[^>]*)?>/i', '<img$1 referrerPolicy="no-referrer">', $value);
        
        // 移除 HTML 标签后截取纯文本
        $text = strip_tags($value);
        if (mb_strlen($text) > self::EXCERPT_MAX_LENGTH) {
            $text = mb_substr($text, 0, self::EXCERPT_MAX_LENGTH) . '...';
        }
        return $text;
    }
}
