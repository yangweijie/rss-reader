<?php
declare(strict_types=1);

namespace app\domain;

use linron\thinkdto\BaseDto;
use linron\thinkdto\attributes\Valid;

class TagDto extends BaseDto
{
    #[Valid(name: 'require|integer', message: '标签ID必填')]
    public int $tag_id;
}
