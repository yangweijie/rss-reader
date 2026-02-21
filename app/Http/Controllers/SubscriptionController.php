<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Category;
use App\Models\Subscription;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use SimplePie\SimplePie;
use XMLReader;
use XMLWriter;

class SubscriptionController extends Controller
{
    use AuthorizesRequests;

    public function create(Request $request)
    {
        $category = null;
        if ($request->has('category_id')) {
            $category = \App\Models\Category::where('user_id', Auth::id())
                ->find($request->category_id);
        }

        $categories = \App\Models\Category::where('user_id', Auth::id())
            ->orderBy('label')
            ->get(['id', 'label', 'parent_id']);

        return Inertia::render('Subscriptions/Create', [
            'category' => $category,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'url' => 'required|url',
            'title' => 'nullable|string|max:255',
            'category_id' => 'nullable|string',
        ]);

        // 将 'none' 或空字符串转换为 null
        if (empty($validated['category_id']) || $validated['category_id'] === 'none') {
            $validated['category_id'] = null;
        }

        // 如果不是 null，验证是否为有效的分类 ID
        if ($validated['category_id'] !== null) {
            $category = Category::where('user_id', Auth::id())
                ->where('id', $validated['category_id'])
                ->first();

            if (!$category) {
                return back()->withErrors(['category_id' => '分类不存在']);
            }
        }

        // 如果没有提供标题，尝试从 RSS feed 获取

                if (empty($validated['title'])) {

                    try {

                        $feed = new \SimplePie();

                        $feed->set_feed_url($validated['url']);

                        $feed->enable_cache(false);

                        $feed->init();

        

                        if ($feed->error()) {

                            return back()->withErrors(['title' => '无法获取到标题，请填写一个标题']);

                        }

        

                        $feedTitle = $feed->get_title();

                        if (empty($feedTitle)) {

                            return back()->withErrors(['title' => '无法获取到标题，请填写一个标题']);

                        }

        

                        $validated['title'] = $feedTitle;

                    } catch (\Exception $e) {

                        return back()->withErrors(['title' => '无法获取到标题，请填写一个标题']);

                    }

                }

        

                // 创建订阅源
                $subscription = Subscription::create([
                    ...$validated,
                    'user_id' => Auth::id(),
                ]);

                // 异步获取网站图标（使用 Concurrency::defer）
                $subscriptionId = $subscription->id;
                \Illuminate\Support\Facades\Concurrency::defer(function () use ($subscriptionId) {
                    $sub = Subscription::find($subscriptionId);
                    if (!$sub || !empty($sub->icon)) {
                        return;
                    }

                    try {
                        $parsedUrl = parse_url($sub->url);
                        $domain = $parsedUrl['host'] ?? '';
                        
                        if (empty($domain)) {
                            return;
                        }

                        $scheme = $parsedUrl['scheme'] ?? 'https';
                        
                        // 获取顶级域名
                        $topLevelDomain = $domain;
                        if (substr_count($domain, '.') > 1) {
                            $parts = explode('.', $domain);
                            $topLevelDomain = implode('.', array_slice($parts, -2));
                        }

                        // 先尝试 oxyry favicon 服务
                        $oxyryIconUrl = "https://nettools1.oxyry.com/favicon?domain={$topLevelDomain}&size=32";
                        
                        $ch = curl_init($oxyryIconUrl);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_HEADER, true);
                        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
                        
                        $response = curl_exec($ch);
                        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
                        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
                        $body = substr($response, $headerSize);
                        curl_close($ch);
                        
                        $isValidIcon = false;
                        if ($httpCode == 200 && $body && strlen($body) > 0) {
                            if ($contentType && (strpos($contentType, 'image/') !== false || strpos($contentType, 'application/octet-stream') !== false)) {
                                $isValidIcon = true;
                            } else {
                                $magic = substr($body, 0, 4);
                                if ($magic === "\x89PNG" || $magic === "GIF8" || substr($magic, 0, 2) === "\xFF\xD8" || substr($magic, 0, 4) === "RIFF") {
                                    $isValidIcon = true;
                                }
                            }
                        }
                        
                        if ($isValidIcon) {
                            $sub->icon = $oxyryIconUrl;
                            $sub->save();
                            Log::info("订阅源 {$sub->id} 图标获取成功: {$oxyryIconUrl}");
                            return;
                        }

                        // oxyry 失败，尝试 Favicon 库
                        $baseUrl = $scheme . '://' . $domain;
                        $favicon = new \Favicon\Favicon();
                        $iconUrl = $favicon->get($baseUrl);
                        
                        if ($iconUrl && $iconUrl !== $baseUrl) {
                            $sub->icon = $iconUrl;
                            $sub->save();
                            Log::info("订阅源 {$sub->id} 图标获取成功: {$iconUrl}");
                        }
                    } catch (\Exception $e) {
                        Log::error("订阅源 {$subscriptionId} 图标获取失败: " . $e->getMessage());
                    }
                });

                // 异步刷新订阅源
                \Illuminate\Support\Facades\Concurrency::defer(function () use ($subscription) {
            try {
                $feed = new SimplePie();
                $feed->set_feed_url($subscription->url);
                $feed->set_cache_location(storage_path('app/cache/rss'));
                $feed->set_cache_duration(3600);
                $feed->enable_cache(true);

                \Log::info("订阅源 {$subscription->id} 异步刷新开始，URL: {$subscription->url}");

                // 设置 User-Agent 模拟浏览器
                $feed->set_useragent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0');

                // 设置输出编码为 UTF-8，兼容 GBK 等中文编码
                $feed->set_output_encoding('UTF-8');

                // 增加超时时间，V2EX 等网站可能响应较慢
                $feed->set_timeout(60);

                // 设置额外的 cURL 选项
                $feed->set_curl_options([
                    CURLOPT_HTTPHEADER => [
                        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language: en-US,en;q=0.9',
                        'Accept-Encoding: gzip, deflate, br',
                        'Connection: keep-alive',
                        'Upgrade-Insecure-Requests: 1',
                        'Sec-Fetch-Dest: document',
                        'Sec-Fetch-Mode: navigate',
                        'Sec-Fetch-Site: none',
                        'Sec-Fetch-User: ?1',
                        'Cache-Control: max-age=0',
                    ],
                    CURLOPT_REFERER => 'https://php.libhunt.com/',
                ]);
                
                \Log::info("订阅源 {$subscription->id} 开始调用 SimplePie");
                $feed->init();
                
                \Log::info("订阅源 {$subscription->id} SimplePie 调用完成");

                if (!$feed->error()) {
                    $count = 0;
                    foreach ($feed->get_items() as $item) {
                        $link = $item->get_permalink();
                        $title = $item->get_title();
                        $publishedAt = $item->get_date('Y-m-d H:i:s');

                        if (!$link) {
                            continue;
                        }

                        // 获取内容，如果没有内容则使用链接
                        $content = $item->get_content();
                        $excerpt = $item->get_description();

                        // 如果没有内容和摘要，创建一个包含链接的内容
                        if (empty($content) && empty($excerpt)) {
                            $content = '<p><a href="' . htmlspecialchars($link) . '" target="_blank">阅读全文</a></p>';
                        }

                        $article = Article::updateOrCreate(
                            [
                                'user_id' => $subscription->user_id,
                                'feed_id' => $subscription->id,
                                'link' => $link,
                            ],
                            [
                                'title' => $title ?: '无标题',
                                'content' => $content,
                                'excerpt' => $excerpt ?: '点击标题阅读全文',
                                'author' => $item->get_author(),
                                'published_at' => $publishedAt ?: now(),
                                'read' => false,
                                'favorite' => false,
                            ]
                        );

                        if ($article->wasRecentlyCreated) {
                            $count++;
                        }
                    }

                    $unreadCount = Article::where('feed_id', $subscription->id)
                        ->where('user_id', $subscription->user_id)
                        ->where('read', false)
                        ->count();

                    $subscription->update([
                        'title' => $feed->get_title() ?: $subscription->title,
                        'unread_count' => $unreadCount,
                        'error_message' => null,
                        'last_error_at' => null,
                    ]);

                    \Illuminate\Support\Facades\Log::info("订阅源 {$subscription->id} 刷新完成，获取了 {$count} 篇新文章，未读数: {$unreadCount}");
                }
            } catch (\Exception $e) {
                $errorMsg = $e->getMessage();
                \Illuminate\Support\Facades\Log::error("订阅源 {$subscription->id} 异步刷新异常: {$errorMsg}");
                \Illuminate\Support\Facades\Log::error("订阅源 {$subscription->id} 异常堆栈: " . $e->getTraceAsString());

                // 检测常见的反爬虫错误并给出友好提示
                if (strpos($errorMsg, '403') !== false || strpos($errorMsg, 'Just a moment') !== false || strpos($errorMsg, '请稍候') !== false) {
                    \Illuminate\Support\Facades\Log::info("订阅源 {$subscription->id} 检测到反爬虫保护，尝试使用 Dusk");
                    
                    $rssContent = $this->fetchRssWithDusk($subscription->url);
                    
                    if ($rssContent) {
                        \Illuminate\Support\Facades\Log::info("订阅源 {$subscription->id} Dusk 获取成功，开始解析");
                        
                        $feed = new SimplePie();
                        $feed->set_raw_data($rssContent);
                        $feed->enable_cache(false);
                        $feed->init();
                        
                        if (!$feed->error()) {
                            $count = 0;
                            foreach ($feed->get_items() as $item) {
                                $link = $item->get_permalink();
                                $title = $item->get_title();
                                $publishedAt = $item->get_date('Y-m-d H:i:s');

                                if (!$link) {
                                    continue;
                                }

                                // 获取内容，如果没有内容则使用链接
                                $content = $item->get_content();
                                $excerpt = $item->get_description();

                                // 如果没有内容和摘要，创建一个包含链接的内容
                                if (empty($content) && empty($excerpt)) {
                                    $content = '<p><a href="' . htmlspecialchars($link) . '" target="_blank">阅读全文</a></p>';
                                }

                                $article = Article::updateOrCreate(
                                    [
                                        'user_id' => $subscription->user_id,
                                        'feed_id' => $subscription->id,
                                        'link' => $link,
                                    ],
                                    [
                                        'title' => $title ?: '无标题',
                                        'content' => $content,
                                        'excerpt' => $excerpt ?: '点击标题阅读全文',
                                        'author' => $item->get_author(),
                                        'published_at' => $publishedAt ?: now(),
                                        'read' => false,
                                        'favorite' => false,
                                    ]
                                );

                                if ($article->wasRecentlyCreated) {
                                    $count++;
                                }
                            }

                            $unreadCount = Article::where('feed_id', $subscription->id)
                                ->where('user_id', $subscription->user_id)
                                ->where('read', false)
                                ->count();

                            $subscription->update([
                                'title' => $feed->get_title() ?: $subscription->title,
                                'unread_count' => $unreadCount,
                                'error_message' => null,
                                'last_error_at' => null,
                            ]);

                            \Illuminate\Support\Facades\Log::info("订阅源 {$subscription->id} Dusk 刷新完成，获取了 {$count} 篇新文章");
                        } else {
                            $errorMsg = '该订阅源使用了反爬虫保护（如 Cloudflare），无法自动获取。请直接访问网站查看：' . $subscription->url;
                            \Illuminate\Support\Facades\Log::error("订阅源 {$subscription->id} Dusk RSS 解析失败: " . $feed->error());
                        }
                    } else {
                        $errorMsg = '该订阅源使用了反爬虫保护（如 Cloudflare），无法自动获取。请直接访问网站查看：' . $subscription->url;
                        \Illuminate\Support\Facades\Log::error("订阅源 {$subscription->id} Dusk 获取失败");
                    }
                } elseif (strpos($errorMsg, 'Connection reset') !== false || strpos($errorMsg, 'timed out') !== false) {
                    $errorMsg = '连接超时或被重置，可能是网络问题或网站限制了访问。请稍后重试。';
                    \Illuminate\Support\Facades\Log::warning("订阅源 {$subscription->id} 连接问题: {$errorMsg}");
                }

                // 更新错误信息
                $subscription->update([
                    'error_message' => $errorMsg,
                    'last_error_at' => now(),
                ]);
            }
        });

        return redirect()->route('articles.index')
            ->with('success', '订阅源已添加，正在后台刷新...');
    }

    public function edit(Subscription $subscription)
    {
        $this->authorize('update', $subscription);

        $categories = Category::where('user_id', Auth::id())
            ->orderBy('label')
            ->get();

        return Inertia::render('Subscriptions/Edit', [
            'subscription' => $subscription,
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Subscription $subscription)
    {
        $this->authorize('update', $subscription);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'nullable|string',
        ]);

        // 将 'none' 或空字符串转换为 null
        if (empty($validated['category_id']) || $validated['category_id'] === 'none') {
            $validated['category_id'] = null;
        }

        // 如果不是 null，验证是否为有效的分类 ID
        if ($validated['category_id'] !== null) {
            $category = Category::where('user_id', Auth::id())
                ->where('id', $validated['category_id'])
                ->first();

            if (!$category) {
                return back()->withErrors(['category_id' => '分类不存在']);
            }
        }

        // 如果 icon 为空，异步重新获取
        if (empty($subscription->icon)) {
            $subscriptionId = $subscription->id;
            \Illuminate\Support\Facades\Concurrency::defer(function () use ($subscriptionId) {
                $sub = Subscription::find($subscriptionId);
                if (!$sub || !empty($sub->icon)) {
                    return;
                }

                try {
                    $parsedUrl = parse_url($sub->url);
                    $domain = $parsedUrl['host'] ?? '';
                    
                    if (empty($domain)) {
                        return;
                    }

                    $scheme = $parsedUrl['scheme'] ?? 'https';
                    
                    // 获取顶级域名
                    $topLevelDomain = $domain;
                    if (substr_count($domain, '.') > 1) {
                        $parts = explode('.', $domain);
                        $topLevelDomain = implode('.', array_slice($parts, -2));
                    }

                    // 先尝试 oxyry favicon 服务
                    $oxyryIconUrl = "https://nettools1.oxyry.com/favicon?domain={$topLevelDomain}&size=32";
                    
                    $ch = curl_init($oxyryIconUrl);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_HEADER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
                    
                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
                    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
                    $body = substr($response, $headerSize);
                    curl_close($ch);
                    
                    $isValidIcon = false;
                    if ($httpCode == 200 && $body && strlen($body) > 0) {
                        if ($contentType && (strpos($contentType, 'image/') !== false || strpos($contentType, 'application/octet-stream') !== false)) {
                            $isValidIcon = true;
                        } else {
                            $magic = substr($body, 0, 4);
                            if ($magic === "\x89PNG" || $magic === "GIF8" || substr($magic, 0, 2) === "\xFF\xD8" || substr($magic, 0, 4) === "RIFF") {
                                $isValidIcon = true;
                            }
                        }
                    }
                    
                    if ($isValidIcon) {
                        $sub->icon = $oxyryIconUrl;
                        $sub->save();
                        Log::info("订阅源 {$sub->id} 图标获取成功: {$oxyryIconUrl}");
                        return;
                    }

                    // oxyry 失败，尝试 Favicon 库
                    $baseUrl = $scheme . '://' . $domain;
                    $favicon = new \Favicon\Favicon();
                    $iconUrl = $favicon->get($baseUrl);
                    
                    if ($iconUrl && $iconUrl !== $baseUrl) {
                        $sub->icon = $iconUrl;
                        $sub->save();
                        Log::info("订阅源 {$sub->id} 图标获取成功: {$iconUrl}");
                    }
                } catch (\Exception $e) {
                    Log::error("订阅源 {$subscriptionId} 图标获取失败: " . $e->getMessage());
                }
            });
            Log::info("订阅源 {$subscription->id} 已安排异步获取图标");
        }

        $subscription->update($validated);

        return redirect()->route('articles.index')
            ->with('success', '订阅源已更新');
    }

    public function destroy(Subscription $subscription)
    {
        $this->authorize('delete', $subscription);

        $subscription->delete();

        return redirect()->route('articles.index')
            ->with('success', '订阅源已删除');
    }

    public function refresh(Subscription $subscription)
    {
        $this->authorize('update', $subscription);

        try {
            $feed = new SimplePie();
            
            // 先获取并清理内容
            $cleanedData = self::fetchAndCleanRawData($subscription->url);
            
            if ($cleanedData === null) {
                Log::warning("订阅源 {$subscription->id} 无法获取 RSS 内容");
                return back()->withErrors(['error' => '无法获取 RSS 内容']);
            }
            
            Log::info("订阅源 {$subscription->id} 获取清理后的内容，长度: " . strlen($cleanedData));
            
            // 设置清理后的原始数据
            $feed->set_raw_data($cleanedData);
            
            $feed->set_cache_location(storage_path('app/cache/rss'));
            $feed->set_cache_duration(3600);
            $feed->enable_cache(true);

            // 设置 User-Agent 模拟浏览器
            $feed->set_useragent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0');

            // 设置输出编码为 UTF-8，兼容 GBK 等中文编码
            $feed->set_output_encoding('UTF-8');

            // 增加超时时间，V2EX 等网站可能响应较慢
            $feed->set_timeout(60);

            // 设置额外的 cURL 选项
            $feed->set_curl_options([
                CURLOPT_HTTPHEADER => [
                    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language: en-US,en;q=0.9',
                    'Accept-Encoding: gzip, deflate, br',
                    'Connection: keep-alive',
                    'Upgrade-Insecure-Requests: 1',
                    'Sec-Fetch-Dest: document',
                    'Sec-Fetch-Mode: navigate',
                    'Sec-Fetch-Site: none',
                    'Sec-Fetch-User: ?1',
                    'Cache-Control: max-age=0',
                ],
                CURLOPT_REFERER => 'https://php.libhunt.com/',
            ]);

            Log::info("订阅源 {$subscription->id} 开始初始化 SimplePie");
            
            $feed->init();
            
            Log::info("订阅源 {$subscription->id} SimplePie 初始化完成，错误: " . ($feed->error() ?: '无'));

            // 如果 SimplePie 失败，尝试使用 Selenium
            if ($feed->error()) {
                $error = $feed->error();

                // 检测是否是反爬虫保护
                if (strpos($error, '403') !== false || strpos($error, 'Just a moment') !== false) {
                    // 尝试使用 Selenium 获取
                    Log::info('SimplePie 失败，尝试使用 Selenium 获取: ' . $subscription->url);
                    $rssContent = $this->fetchRssWithSelenium($subscription->url);

                    if ($rssContent) {
                        // 使用 Selenium 获取的内容创建临时 SimplePie
                        $feed = new SimplePie();
                        $feed->set_raw_data($rssContent);
                        $feed->set_output_encoding('UTF-8');
                        $feed->init();

                        if ($feed->error()) {
                            return back()->withErrors(['error' => 'Selenium 获取成功但解析失败：' . $feed->error()]);
                        }
                    } else {
                        return back()->withErrors(['error' => '该订阅源使用了反爬虫保护（如 Cloudflare），Selenium 也无法获取。请直接访问网站查看：' . $subscription->url]);
                    }
                } elseif (strpos($error, 'Connection reset') !== false || strpos($error, 'timed out') !== false) {
                    return back()->withErrors(['error' => '连接超时或被重置，可能是网络问题或网站限制了访问。请稍后重试。']);
                } else {
                    return back()->withErrors(['error' => '无法获取 RSS 订阅：' . $error]);
                }
            }

            $count = 0;
            foreach ($feed->get_items() as $item) {
                $link = $item->get_permalink();
                $title = $item->get_title();
                $publishedAt = $item->get_date('Y-m-d H:i:s');

                if (!$link) {
                    continue;
                }

                // 获取内容，如果没有内容则使用链接
                $content = $item->get_content();
                $excerpt = $item->get_description();

                // 如果没有内容和摘要，创建一个包含链接的内容
                if (empty($content) && empty($excerpt)) {
                    $content = '<p><a href="' . htmlspecialchars($link) . '" target="_blank">阅读全文</a></p>';
                }

                $article = Article::updateOrCreate(
                    [
                        'user_id' => Auth::id(),
                        'feed_id' => $subscription->id,
                        'link' => $link,
                    ],
                    [
                        'title' => $title ?: '无标题',
                        'content' => $content,
                        'excerpt' => $excerpt ?: '点击标题阅读全文',
                        'author' => $item->get_author(),
                        'published_at' => $publishedAt ?: now(),
                        'read' => false,
                        'favorite' => false,
                    ]
                );

                if ($article->wasRecentlyCreated) {
                    $count++;
                }
            }

            $unreadCount = Article::where('feed_id', $subscription->id)
                ->where('user_id', Auth::id())
                ->where('read', false)
                ->count();

            $subscription->update([
                'title' => $feed->get_title() ?: $subscription->title,
                'unread_count' => $unreadCount,
                'error_message' => null,
                'last_error_at' => null,
            ]);

            return back()->with('success', "已刷新订阅源，获取了 {$count} 篇新文章");
        } catch (\Exception $e) {
            Log::error('Failed to refresh subscription: ' . $e->getMessage());

            // 更新错误信息
            $subscription->update([
                'error_message' => $e->getMessage(),
                'last_error_at' => now(),
            ]);

            return back()->withErrors(['error' => '刷新失败：' . $e->getMessage()]);
        }
    }

    public function refreshAll()
    {
        $subscriptions = Subscription::where('user_id', Auth::id())->get();

        // 使用异步任务刷新所有订阅源，避免超时
        \Illuminate\Support\Facades\Concurrency::defer(function () use ($subscriptions) {
            foreach ($subscriptions as $subscription) {
                try {
                    $feed = new SimplePie();
                    $feed->set_feed_url($subscription->url);
                    $feed->set_cache_location(storage_path('app/cache/rss'));
                    $feed->set_cache_duration(3600);
                    $feed->enable_cache(true);

                    // 设置 User-Agent 模拟浏览器
                    $feed->set_useragent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0');

                    // 设置输出编码为 UTF-8，兼容 GBK 等中文编码
                    $feed->set_output_encoding('UTF-8');

                    // 增加超时时间，V2EX 等网站可能响应较慢
                    $feed->set_timeout(60);

                    // 设置额外的 cURL 选项
                    $feed->set_curl_options([
                        CURLOPT_HTTPHEADER => [
                            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'Accept-Language: en-US,en;q=0.9',
                            'Accept-Encoding: gzip, deflate, br',
                            'Connection: keep-alive',
                            'Upgrade-Insecure-Requests: 1',
                            'Sec-Fetch-Dest: document',
                            'Sec-Fetch-Mode: navigate',
                            'Sec-Fetch-Site: none',
                            'Sec-Fetch-User: ?1',
                            'Cache-Control: max-age=0',
                        ],
                        CURLOPT_REFERER => 'https://php.libhunt.com/',
                    ]);

                    // 设置原始内容处理器以清理 XML
                    $rawData = self::fetchAndCleanRawData($subscription->url);
                    
                    if ($rawData === null) {
                        Log::warning("订阅源 {$subscription->id} 无法获取原始数据，跳过");
                        $subscription->update([
                            'error_message' => '无法获取 RSS 内容，可能是网络问题或网站限制了访问',
                            'last_error_at' => now(),
                        ]);
                        continue;
                    }
                    
                    $feed->set_raw_data($rawData);
                    
                    $feed->init();

                    Log::info("订阅源 {$subscription->id} ({$subscription->title}) 开始获取 RSS");

                    if ($feed->error()) {
                    $error = $feed->error();
                    Log::warning("订阅源 {$subscription->id} SimplePie 获取失败: {$error}");

                    // 检测常见的反爬虫错误
                    $isAntiBot = false;
                    if (strpos($error, '403') !== false || strpos($error, 'Just a moment') !== false || strpos($error, '请稍候') !== false) {
                        Log::info("订阅源 {$subscription->id} 检测到反爬虫保护，准备使用 Dusk 获取");
                        $startTime = microtime(true);
                        
                        $rssContent = $this->fetchRssWithDusk($subscription->url);
                        
                        $elapsed = round(microtime(true) - $startTime, 2);
                        
                        if ($rssContent) {
                            Log::info("订阅源 {$subscription->id} Dusk 获取成功，耗时 {$elapsed} 秒，内容长度: " . strlen($rssContent) . " bytes");
                            
                            $feed = new SimplePie();
                            $feed->set_raw_data($rssContent);
                            $feed->enable_cache(false);
                            $feed->init();
                            
                            if (!$feed->error()) {
                                Log::info("订阅源 {$subscription->id} Dusk RSS 解析成功");
                            } else {
                                $duskError = $feed->error();
                                Log::error("订阅源 {$subscription->id} Dusk RSS 解析失败: {$duskError}");
                                $error = '该订阅源使用了反爬虫保护（如 Cloudflare），无法自动获取。请手动访问：' . $subscription->url;
                                $isAntiBot = true;
                            }
                        } else {
                            Log::error("订阅源 {$subscription->id} Dusk 获取失败，耗时 {$elapsed} 秒");
                            $error = '该订阅源使用了反爬虫保护（如 Cloudflare），无法自动获取。请手动访问：' . $subscription->url;
                            $isAntiBot = true;
                        }
                    } elseif (strpos($error, 'Connection reset') !== false || strpos($error, 'timed out') !== false) {
                        Log::warning("订阅源 {$subscription->id} 连接问题: {$error}");
                        $error = '连接超时或被重置，可能是网络问题或网站限制了访问。请稍后重试。';
                    } else {
                        Log::error("订阅源 {$subscription->id} 未知错误: {$error}");
                    }

                    Log::error('Failed to refresh subscription ' . $subscription->id . ': ' . $error);
                    $subscription->update([
                        'error_message' => $error,
                        'last_error_at' => now(),
                    ]);
                    continue;
                }

                    Log::info("订阅源 {$subscription->id} RSS 获取成功，开始解析文章");
                    $count = 0;
                    foreach ($feed->get_items() as $item) {
                        $link = $item->get_permalink();
                        $title = $item->get_title();
                        $publishedAt = $item->get_date('Y-m-d H:i:s');

                        if (!$link) {
                            continue;
                        }

                        $article = Article::updateOrCreate(
                            [
                                'user_id' => $subscription->user_id,
                                'feed_id' => $subscription->id,
                                'link' => $link,
                            ],
                            [
                                'title' => $title ?: '无标题',
                                'content' => $item->get_content(),
                                'excerpt' => $item->get_description(),
                                'author' => $item->get_author(),
                                'published_at' => $publishedAt ?: now(),
                                'read' => false,
                                'favorite' => false,
                            ]
                        );

                        if ($article->wasRecentlyCreated) {
                            $count++;
                        }
                    }

                    $unreadCount = Article::where('feed_id', $subscription->id)
                        ->where('user_id', $subscription->user_id)
                        ->where('read', false)
                        ->count();

                    $subscription->update([
                        'title' => $feed->get_title() ?: $subscription->title,
                        'unread_count' => $unreadCount,
                        'error_message' => null,
                        'last_error_at' => null,
                    ]);

                    Log::info('Successfully refreshed subscription ' . $subscription->id . ', got ' . $count . ' new articles');
                } catch (\Exception $e) {
                    Log::error('Failed to refresh subscription ' . $subscription->id . ': ' . $e->getMessage());

                    // 更新错误信息
                    $subscription->update([
                        'error_message' => $e->getMessage(),
                        'last_error_at' => now(),
                    ]);
                }
            }
        });

        return back()->with('success', "正在后台刷新 {$subscriptions->count()} 个订阅源，请稍后查看结果");
    }

    public function importOpml(Request $request)
    {
        $this->authorize('create', Subscription::class);

        $validated = $request->validate([
            'opml' => 'required|file|mimes:xml,opml',
        ]);

        $file = $request->file('opml');
        $xmlContent = file_get_contents($file->getPathname());

        $reader = new XMLReader();
        $reader->xml($xmlContent);
        $count = 0;

        while ($reader->read()) {
            if ($reader->nodeType == XMLReader::ELEMENT && $reader->name == 'outline') {
                $xmlUrl = $reader->getAttribute('xmlUrl');
                $title = $reader->getAttribute('title') ?: $xmlUrl;

                if ($xmlUrl) {
                    // 检查是否已存在
                    $existing = Subscription::where('user_id', Auth::id())
                        ->where('url', $xmlUrl)
                        ->first();

                    if (!$existing) {
                        Subscription::create([
                            'url' => $xmlUrl,
                            'title' => $title ?: '无标题',
                            'user_id' => Auth::id(),
                            'unread_count' => 0,
                        ]);
                        $count++;
                    }
                }
            }
        }

        return redirect()->route('articles.index')
            ->with('success', "已导入 {$count} 个订阅源");
    }

    public function move(Request $request, Subscription $subscription)
    {
        $this->authorize('update', $subscription);

        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $subscription->update($validated);

        return response()->json([
            'id' => (string) $subscription->id,
            'categoryId' => $subscription->category_id,
        ]);
    }

    public function exportOpml()
    {
        $subscriptions = Subscription::where('user_id', Auth::id())
            ->orderBy('title')
            ->get();

        $writer = new XMLWriter();
        $writer->openMemory();
        $writer->setIndent(true);
        $writer->startDocument('1.0', 'UTF-8');
        $writer->startElement('opml');
        $writer->writeAttribute('version', '1.0');
        $writer->startElement('head');
        $writer->writeElement('title', 'Qi Reader Subscriptions');
        $writer->endElement();
        $writer->startElement('body');

        foreach ($subscriptions as $subscription) {
            $writer->startElement('outline');
            $writer->writeAttribute('type', 'rss');
            $writer->writeAttribute('text', $subscription->title);
            $writer->writeAttribute('xmlUrl', $subscription->url);
            $writer->endElement();
        }

        $writer->endElement();
        $writer->endElement();
        $writer->endDocument();

        $opmlContent = $writer->outputMemory();

        return response($opmlContent)
            ->header('Content-Type', 'application/xml')
            ->header('Content-Disposition', 'attachment; filename="subscriptions.opml"')
            ->header('X-Inertia', 'false'); // 告诉 Inertia 这是一个文件下载请求，不要拦截
    }

    /**
     * 使用 Selenium 获取受 Cloudflare 保护的 RSS 内容
     */
    public function fetchRssWithSelenium($url)
    {
        $script = base_path('scripts/fetch_rss_with_selenium.py');
        
        // 切换到项目根目录执行脚本
        $oldDir = getcwd();
        chdir(base_path());
        
        $command = escapeshellcmd('python3') . ' ' . escapeshellarg('scripts/fetch_rss_with_selenium.py') . ' ' . escapeshellarg($url);
        
        $output = shell_exec($command . ' 2>&1');
        
        chdir($oldDir);

        // 检查是否有输出
        if (!empty($output)) {
            // 转换 HTML 实体（&lt; -> <, &gt; -> >）
            $output = html_entity_decode($output, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            
            // 清理可能的 HTML 包装
            $output = preg_replace('/^<html><head>.*?<\/head><body><pre[^>]*>/s', '', $output);
            $output = preg_replace('/<\/pre><\/body><\/html>$/', '', $output);
            
            // 去除空白字符
            $output = trim($output);

            // 检查是否包含 XML 声明
            if (strpos($output, '<?xml') !== false || strpos($output, '<rss') !== false) {
                return $output;
            }
        }

        return null;
    }

    /**
     * 使用 Laravel Dusk 获取受 Cloudflare 保护的 RSS 内容
     */
    public function fetchRssWithDusk($url)
    {
        Log::info("Dusk: 开始获取 URL: {$url}");
        
        try {
            // 检查 ChromeDriver 是否运行
            $chromedriverCheck = shell_exec('lsof -Pi :9515 -sTCP:LISTEN -t 2>&1');
            if (!$chromedriverCheck) {
                Log::warning("Dusk: ChromeDriver 未运行，尝试启动");
                $startScript = base_path('scripts/start-chromedriver.sh');
                if (file_exists($startScript)) {
                    shell_exec($startScript . ' 2>&1');
                    sleep(2);
                    Log::info("Dusk: ChromeDriver 启动脚本已执行");
                }
            }
            
            // 使用 artisan 命令获取 RSS
            $phpPath = PHP_BINARY ?: 'php';
            $command = $phpPath . ' ' . base_path('artisan') . ' rss:fetch-dusk ' . escapeshellarg($url);
            Log::info("Dusk: 执行命令: {$command}");
            
            $startTime = microtime(true);
            $output = shell_exec($command . ' 2>&1');
            $elapsed = round(microtime(true) - $startTime, 2);
            
            Log::info("Dusk: 命令执行完成，耗时 {$elapsed} 秒");
            Log::info("Dusk: 原始输出长度: " . strlen($output) . " bytes");
            Log::debug("Dusk: 原始输出前 200 字符: " . substr($output, 0, 200));

            if (!empty($output)) {
                // 转换 HTML 实体
                $output = html_entity_decode($output, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                Log::info("Dusk: HTML 实体转换完成");
                
                // 清理可能的 HTML 包装
                $output = preg_replace('/^<html><head>.*?<\/head><body><pre[^>]*>/s', '', $output);
                $output = preg_replace('/<\/pre><\/body><<\/html>$/', '', $output);
                
                // 去除空白字符
                $output = trim($output);
                
                Log::info("Dusk: 清理后长度: " . strlen($output) . " bytes");
                Log::debug("Dusk: 清理后前 200 字符: " . substr($output, 0, 200));

                // 检查是否包含 XML 声明
                if (strpos($output, '<?xml') !== false || strpos($output, '<rss') !== false) {
                    Log::info("Dusk: 检测到有效的 RSS 内容");
                    return $output;
                } else {
                    Log::warning("Dusk: 未检测到有效的 RSS 内容，输出可能包含错误信息");
                    Log::warning("Dusk: 输出内容: " . substr($output, 0, 500));
                }
            } else {
                Log::error("Dusk: 命令无输出");
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Dusk 获取 RSS 异常: ' . $e->getMessage());
            Log::error('Dusk 异常堆栈: ' . $e->getTraceAsString());
            return null;
        }
    }

    /**
     * 清理和修复 XML 内容，增加解析兼容性
     */
    private static function cleanXmlContent($content)
    {
        try {
            // 移除 BOM 标记
            $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
            $content = preg_replace('/^\xFE\xFF/', '', $content);
            $content = preg_replace('/^\xFF\xFE/', '', $content);

            // 移除缓存注释（WordPress 常见的缓存注释）
            $content = preg_replace('/<!--Cached.*?-->/s', '', $content);
            $content = preg_replace('/<!--[^>]*-->/s', '', $content);

            // 移除其他 WordPress 缓存相关注释
            $content = preg_replace('/<!--\s*Cache Date:.*?-->/s', '', $content);

            // 修复未闭合的注释 - 移除所有未闭合的注释标记
            $content = preg_replace('/<!--[^>]*$/s', '', $content);

            // 修复未闭合的 CDATA
            $content = preg_replace('/<!\[CDATA\[(?![^\]]*\]\]>)/s', '<![CDATA[]]>', $content);

            // 修复 CDATA 问题：先移除所有 CDATA 标签，保留内容
            // 注意：这会移除 CDATA 的转义效果，但通常 RSS 内容中不需要严格的 CDATA 转义
            $content = preg_replace('/<!\[CDATA\[/s', '', $content);
            $content = preg_replace('/\]\]>/s', '', $content);

            // 移除控制字符（保留换行和制表符）
            $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content);

            // 修复多重 XML 声明
            $content = preg_replace('/(<\?xml[^>]*\?>)/s', '$1', $content);

            // 确保有 XML 声明
            if (strpos($content, '<?xml') === false && strpos($content, '<rss') !== false) {
                $content = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . $content;
            }

            return $content;
        } catch (\Exception $e) {
            Log::error('清理 XML 内容失败: ' . $e->getMessage());
            return $content;
        }
    }

    /**
     * 获取并清理原始数据
     */
    private static function fetchAndCleanRawData($url)
    {
        try {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: en-US,en;q=0.9',
            ]);
            
            // 不设置 Accept-Encoding，让 SimplePie 自己处理
            // 如果设置 Accept-Encoding: gzip, deflate, br，curl 会返回压缩内容
            // 但 SimplePie 的 set_raw_data 期望的是未压缩的原始数据
            
            $content = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode != 200) {
                Log::warning("获取原始数据失败，HTTP 状态码: {$httpCode}");
                return null;
            }

            if (empty($content)) {
                Log::warning("获取的原始数据为空");
                return null;
            }

            // 检查是否是 gzip 压缩的
            if (substr($content, 0, 2) === "\x1f\x8b") {
                $content = gzdecode($content);
                if ($content === false) {
                    Log::warning("gzip 解压失败");
                    return null;
                }
            }

            // 清理 XML 内容
            return self::cleanXmlContent($content);
        } catch (\Exception $e) {
            Log::error('获取原始数据失败: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 获取网站图标
     */
    private function fetchWebsiteIcon($url)
    {
        try {
            $parsedUrl = parse_url($url);
            $domain = $parsedUrl['host'] ?? '';
            
            if (empty($domain)) {
                return null;
            }

            $scheme = $parsedUrl['scheme'] ?? 'https';
            $baseUrl = $scheme . '://' . $domain;
            Log::info("开始获取网站图标: {$domain}");

            // 获取顶级域名
            $topLevelDomain = $domain;
            if (substr_count($domain, '.') > 1) {
                $parts = explode('.', $domain);
                $topLevelDomain = implode('.', array_slice($parts, -2));
            }

            // 先尝试 oxyry favicon 服务
            $oxyryIconUrl = "https://nettools1.oxyry.com/favicon?domain={$topLevelDomain}&size=32";
            if ($this->checkOxyryIcon($oxyryIconUrl)) {
                Log::info("oxyry 服务返回有效图标: {$oxyryIconUrl}");
                return $oxyryIconUrl;
            }
            Log::info("oxyry 服务无响应，尝试其他方式");

            // 尝试多个 URL 策略
            $urlsToTry = [$baseUrl];

            if (substr_count($domain, '.') > 1) {
                $topLevelUrl = $scheme . '://' . $topLevelDomain;
                if ($topLevelUrl !== $baseUrl) {
                    $urlsToTry[] = $topLevelUrl;
                }
            }

            foreach ($urlsToTry as $testUrl) {
                $finalUrl = $this->getRedirectedUrl($testUrl);
                if ($finalUrl && $finalUrl !== $testUrl) {
                    $urlsToTry[] = $finalUrl;
                }
            }

            $urlsToTry = array_unique($urlsToTry);
            
            foreach ($urlsToTry as $tryUrl) {
                $iconUrl = $this->fetchIconFromUrl($tryUrl);
                if ($iconUrl) {
                    return $iconUrl;
                }
            }

            return null;
        } catch (\Exception $e) {
            Log::error('获取网站图标失败: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 检查 oxyry 服务是否返回有效图标
     */
    private function checkOxyryIcon($url, $timeout = 5)
    {
        try {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $body = substr($response, $headerSize);
            
            curl_close($ch);
            
            if ($httpCode == 200 && $body && strlen($body) > 0) {
                if ($contentType && (strpos($contentType, 'image/') !== false || strpos($contentType, 'application/octet-stream') !== false)) {
                    return true;
                }
                $magic = substr($body, 0, 4);
                if ($magic === "\x89PNG" || $magic === "GIF8" || substr($magic, 0, 2) === "\xFF\xD8" || substr($magic, 0, 4) === "RIFF") {
                    return true;
                }
            }
            
            return false;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * 获取重定向后的最终 URL
     */
    private function getRedirectedUrl($url, $timeout = 5)
    {
        try {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            
            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            
            if ($httpCode >= 300 && $httpCode < 400) {
                $redirectUrl = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
                curl_close($ch);
                return $redirectUrl;
            }
            
            curl_close($ch);
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * 从指定 URL 获取图标
     */
    private function fetchIconFromUrl($url)
    {
        try {
            $normalizedUrl = rtrim($url, '/');
            $favicon = new \Favicon\Favicon();
            $iconUrl = $favicon->get($normalizedUrl);
            
            if ($iconUrl && $iconUrl !== $normalizedUrl) {
                return $iconUrl;
            }
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }
}
