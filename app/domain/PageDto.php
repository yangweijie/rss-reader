<?php
declare(strict_types=1);

namespace app\domain;

use linron\thinkdto\BaseDto;
use linron\thinkdto\attributes\DefaultVal;

class PageDto extends BaseDto
{
    #[DefaultVal(value: 1)]
    public ?int $page = 1;

    #[DefaultVal(value: 20)]
    public ?int $page_size = 20;
}
