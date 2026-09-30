<?php
namespace app\controller;

use think\Request;
use app\model\User;

class AuthController
{
    public function login(Request $request)
    {
        $data = $request->param();
        
        $user = User::where('email', $data['email'])->find();
        
        if (!$user || !$user->checkPassword($data['password'])) {
            return json(['code' => 1, 'msg' => 'Invalid credentials']);
        }
        
        session('user_id', $user->id);
        
        return json(['code' => 0, 'msg' => 'success', 'data' => $user]);
    }
    
    public function register(Request $request)
    {
        $data = $request->param();
        
        if (User::where('email', $data['email'])->find()) {
            return json(['code' => 1, 'msg' => 'Email already exists']);
        }
        
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);
        
        session('user_id', $user->id);
        
        return json(['code' => 0, 'msg' => 'success', 'data' => $user]);
    }
    
    public function logout()
    {
        session('user_id', null);
        return json(['code' => 0, 'msg' => 'success']);
    }
}