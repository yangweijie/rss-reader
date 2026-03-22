<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

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
}
