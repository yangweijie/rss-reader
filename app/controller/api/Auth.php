<?php
declare(strict_types=1);

namespace app\controller\api;

use app\domain\LoginDto;
use app\model\User;
use think\facade\Jwt;
use think\Request;
use think\Response;

class Auth
{
    protected function json($data, int $code = 0, string $msg = ''): Response
    {
        return Response::create([
            'code' => $code,
            'msg' => $msg,
            'data' => $data,
            'time' => time(),
        ], 'json');
    }

    public function login(Request $request)
    {
        $data = $request->post();
        if (empty($data)) {
            $data = json_decode($request->getContent(), true) ?? [];
        }
        
        // 调试：检查接收的数据
        if (empty($data['name']) || empty($data['password'])) {
            return $this->json(null, 1, '数据格式错误: ' . json_encode($data));
        }
        
        // 临时跳过 DTO 验证直接测试
        $name = $data['name'];
        $password = $data['password'];

        $user = User::where('name', $name)->find();
        
        if (!$user) {
            return $this->json(null, 1, '用户不存在');
        }

        if (!password_verify($password, $user->password)) {
            return $this->json(null, 1, '密码错误');
        }

        $token = Jwt::getToken([
            'user_id' => $user->id,
            'name' => $user->name,
        ]);

        return $this->json([
            'token' => (string)$token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
            ],
        ], 0, '登录成功');
    }

    public function logout()
    {
        $token = Jwt::getRequestToken(request());
        
        if ($token) {
            Jwt::Logout($token);
        }

        return $this->json(null, 0, '退出成功');
    }
}