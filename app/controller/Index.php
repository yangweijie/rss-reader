<?php

namespace app\controller;

use app\BaseController;

class Index extends BaseController
{
    public function index()
    {
        return view("index/index");
    }

    public function login()
    {
        // 前端已替换为 React SPA,/auth/login 与 / 共用同一个壳视图,
        // 由前端路由(/auth/login -> Login 页)决定展示内容
        return view("index/index");
    }
}
