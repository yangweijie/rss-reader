<?php
declare(strict_types=1);

namespace app\domain;

use linron\thinkdto\BaseDto;
use linron\thinkdto\attributes\Valid;

class DiscoverDto extends BaseDto
{
    #[Valid(name: 'require|url', message: 'URL必填且格式正确')]
    public string $url;
}
