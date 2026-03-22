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
        return view("auth/login");
    }
}
