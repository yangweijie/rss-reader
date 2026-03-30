<?php
declare(strict_types=1);

namespace app\middleware;

use bigDream\thinkJump\Jump;
use think\facade\Jwt;
use Exception;

class Auth
{
    public function handle($request, \Closure $next)
    {
        $token = $request->header("token", "");
        
        if (empty($token)) {
            return Jump::returnResponse()->error('请先登录', '/auth/login');
        }
        
        $data = Jwt::Check($token);
        
        if ($data['code'] !== 1) {
            return Jump::returnResponse()->error($data['msg'] ?: 'Token无效，请重新登录');
        }
        
        $request->uid = $data["data"]["user_id"];
        
        return $next($request);
    }
}