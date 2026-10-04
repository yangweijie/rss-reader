<?php
declare(strict_types=1);

namespace app\model;

use think\Model;
use think\facade\Db;

class Subscription extends Model
{
    protected $table = "subscriptions";

    public function articles()
    {
        return $this->hasMany(Article::class, "feed_id");
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * 从 articles 表重算指定订阅源的未读数,消除冗余计数的漂移。
     * 单条标记已读/未读、批量已读、刷新拉新文章后都应调用。
     */
    public static function syncUnreadCounts(array $feedIds): void
    {
        $feedIds = array_values(array_unique(array_filter(array_map("intval", $feedIds))));
        if (empty($feedIds)) {
            return;
        }

        $ids = implode(",", $feedIds);
        // read 在 MySQL 中是保留字,用反引号兼容(MySQL/SQLite 均支持)
        Db::execute(
            "UPDATE subscriptions SET unread_count = (SELECT COUNT(*) FROM articles WHERE articles.feed_id = subscriptions.id AND articles.`read` = 0) WHERE id IN ({$ids})",
        );
    }
}

