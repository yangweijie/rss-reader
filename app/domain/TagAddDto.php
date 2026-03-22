<?php
declare(strict_types=1);

namespace app\domain;

use linron\thinkdto\BaseDto;
use linron\thinkdto\attributes\Valid;

class TagAddDto extends BaseDto
{
    #[Valid(name: 'require', message: '标签名称必填')]
    public string $name;
}
