<?php
declare(strict_types=1);

namespace app\domain;

use linron\thinkdto\BaseDto;
use linron\thinkdto\attributes\Valid;

class FeedEditDto extends BaseDto
{
    #[Valid(name: 'require|integer', message: '订阅源ID必填')]
    public int $feed_id;

    #[Valid(name: 'require|integer', message: '分类ID必填')]
    public int $category_id;
}
