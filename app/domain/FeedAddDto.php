<?php
declare(strict_types=1);

namespace app\domain;

use linron\thinkdto\BaseDto;
use linron\thinkdto\attributes\Valid;
use linron\thinkdto\attributes\DefaultVal;

class FeedAddDto extends BaseDto
{
    #[Valid(name: 'require|url', message: '订阅源URL必填且格式正确')]
    public string $url;

    #[DefaultVal(value: 0)]
    public int $category_id;
}
