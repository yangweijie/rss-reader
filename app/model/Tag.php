<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class Tag extends Model
{
    protected $table = 'tags';

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function articles()
    {
        return $this->belongsToMany(Article::class, ArticleTags::class, 'article_id', 'tag_id');
    }
}