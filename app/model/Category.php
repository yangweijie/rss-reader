<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

/**
 * @mixin \think\Model
 */
class Category extends Model
{
    protected $table = "categories";

    public function Feed()
    {
        return $this->hasMany(Subscription::class);
    }
}
