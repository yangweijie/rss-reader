<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class ArticleTags extends Model
{
    protected $name = 'article_tags';

    public function article()
    {
        return $this->belongsTo(Article::class);
    }

    public function tag()
    {
        return $this->belongsTo(Tag::class);
    }
}