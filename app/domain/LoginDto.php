<?php
declare(strict_types=1);

namespace app\domain;

use linron\thinkdto\BaseDto;
use linron\thinkdto\attributes\Valid;

class LoginDto extends BaseDto
{
    #[Valid(name: 'require', message: '用户名不能为空')]
    public string $name;

    #[Valid(name: 'require', message: '密码不能为空')]
    public string $password;
}
