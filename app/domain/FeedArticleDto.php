<?php
declare(strict_types=1);

namespace app\domain;

use linron\thinkdto\BaseDto;
use linron\thinkdto\attributes\Valid;
use linron\thinkdto\attributes\DefaultVal;

class FeedArticleDto extends BaseDto
{
    #[Valid(name: 'require|integer', message: '订阅源ID必填')]
    public int $feed_id;

    #[DefaultVal(value: 1)]
    public ?int $page = null;

    #[DefaultVal(value: 20)]
    public ?int $page_size = null;
}
