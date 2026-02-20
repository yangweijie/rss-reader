<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Article extends Model
{
    protected $fillable = [
        'feed_id',
        'user_id',
        'title',
        'content',
        'excerpt',
        'link',
        'author',
        'published_at',
        'read',
        'favorite',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'read' => 'boolean',
        'favorite' => 'boolean',
    ];

    public function feed(): BelongsTo
    {
        return $this->belongsTo(Subscription::class, 'feed_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'article_tags')
            ->withPivot('user_id')
            ->withTimestamps();
    }
}
