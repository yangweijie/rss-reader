<?php
use think\facade\Route;

// 页面路由
Route::get('/', 'Index/index');
Route::get('auth/login', 'Index/login');

// 登录接口（无需认证）
Route::post('api/auth/login', 'api.Auth/login');
Route::post('api/auth/logout', 'api.Auth/logout');

// 需要认证的 API 路由组
Route::group('api', function () {
    // 文章相关
    Route::get('articles/all', 'api.Articles/all');
    Route::get('articles/stars', 'api.Articles/stars');
    Route::get('articles/by-tag', 'api.Articles/listByTag');
    Route::get('articles/by-feed', 'api.Articles/listByFeed');
    Route::get('articles/by-category', 'api.Articles/listByCategory');
    Route::get('articles/info', 'api.Articles/info');
    Route::post('articles/star', 'api.Articles/star');
    Route::post('articles/unstar', 'api.Articles/unstar');
    Route::post('articles/read', 'api.Articles/read');
    Route::post('articles/unread', 'api.Articles/unread');
    Route::post('articles/read-above', 'api.Articles/readAbove');
    Route::post('articles/add-tag', 'api.Articles/addTag');
    Route::post('articles/remove-tag', 'api.Articles/removeTag');

    // 分类相关
    Route::get('categories', 'api.Categories/list');
    Route::post('categories/add', 'api.Categories/add');
    Route::post('categories/edit', 'api.Categories/edit');
    Route::post('categories/pin', 'api.Categories/pin');
    Route::post('categories/del', 'api.Categories/del');

    // 订阅源相关
    Route::get('feeds', 'api.Feed/list');
    Route::get('feed/info', 'api.Feed/info');
    Route::post('feed/discover', 'api.Feed/discover');
    Route::post('feed/add', 'api.Feed/add');
    Route::post('feed/edit', 'api.Feed/edit');
    Route::post('feed/del', 'api.Feed/del');
    Route::post('feed/refresh', 'api.Feed/refresh');
    Route::get('feed/export', 'api.Feed/export');
    Route::post('feed/import', 'api.Feed/import');

    // 标签相关
    Route::get('tags', 'api.Tags/list');
    Route::post('tag/add', 'api.Tags/add');
    Route::post('tag/edit', 'api.Tags/edit');
    Route::post('tag/del', 'api.Tags/del');
})->middleware(\app\middleware\Auth::class);
