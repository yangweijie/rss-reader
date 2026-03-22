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
        
        try {
            $data = Jwt::Check($token);
            $request->uid = $data["data"]["user_id"];
        } catch (Exception $e) {
            return Jump::returnResponse()->error('Token无效，请重新登录');
        }
        
        return $next($request);
    }
}