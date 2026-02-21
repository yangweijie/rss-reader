<?php

use App\Http\Controllers\ArticleController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TagController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('dashboard');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // 订阅源路由 - 特定路由必须在资源路由之前
    Route::post('/subscriptions/import-opml', [SubscriptionController::class, 'importOpml'])->name('subscriptions.import-opml');
    Route::get('/subscriptions/export-opml', [SubscriptionController::class, 'exportOpml'])->name('subscriptions.export-opml');
    Route::post('/subscriptions/{subscription}/refresh', [SubscriptionController::class, 'refresh'])->name('subscriptions.refresh');
    Route::post('/subscriptions/refresh-all', [SubscriptionController::class, 'refreshAll'])->name('subscriptions.refresh-all');
    Route::resource('subscriptions', SubscriptionController::class)->except(['index']);

    // 文章路由
    Route::prefix('articles')->group(function () {
        Route::get('/', [ArticleController::class, 'index'])->name('articles.index');
        Route::get('/{article}', [ArticleController::class, 'show'])->name('articles.show');
        Route::post('/{article}/read', [ArticleController::class, 'markAsRead'])->name('articles.read');
        Route::post('/{article}/unread', [ArticleController::class, 'markAsUnread'])->name('articles.unread');
        Route::post('/{article}/favorite', [ArticleController::class, 'toggleFavorite'])->name('articles.favorite');
        Route::post('/batch-read', [ArticleController::class, 'batchMarkAsRead'])->name('articles.batch-read');
        Route::post('/{article}/tags', [ArticleController::class, 'setTags'])->name('articles.tags');
        Route::post('/{article}/tags/{tag}/attach', [ArticleController::class, 'attachTag'])->name('articles.tags.attach');
        Route::post('/{article}/tags/{tag}/detach', [ArticleController::class, 'detachTag'])->name('articles.tags.detach');
    });

    // 标签路由
    Route::resource('tags', TagController::class);

    // 分类路由
    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index'])->name('categories.index');
        Route::get('/tree', [CategoryController::class, 'tree'])->name('categories.tree');
        Route::post('/', [CategoryController::class, 'store'])->name('categories.store');
        Route::patch('/{category}', [CategoryController::class, 'update'])->name('categories.update');
        Route::delete('/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
        Route::post('/{category}/move', [CategoryController::class, 'move'])->name('categories.move');
    });

    // 订阅源移动
    Route::post('/subscriptions/{subscription}/move', [SubscriptionController::class, 'move'])->name('subscriptions.move');
});

require __DIR__.'/auth.php';
