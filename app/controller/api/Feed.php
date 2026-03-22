<?php
declare(strict_types=1);

namespace app\controller\api;

use app\domain\FeedDto;
use app\domain\FeedAddDto;
use app\domain\FeedEditDto;
use app\domain\DiscoverDto;
use app\domain\PageDto;
use app\model\Subscription;
use app\model\Article;
use app\service\FeedService;
use app\job\RefreshFeedJob;
use bigDream\thinkJump\Jump;
use Kode\Queue\Factory;
use think\Request;

class Feed
{
    // 用户订阅列表
    public function list(Request $request)
    {
        $page = (int) $request->get('page', 1);
        $pageSize = (int) $request->get('page_size', 20);
        
        $query = Subscription::where('user_id', $request->uid)
            ->order('id', 'desc');

        $total = $query->count();
        $list = $query->page($page, $pageSize)->select();

        // 获取每个订阅源的文章数量
        foreach ($list as $feed) {
            $feed->article_count = Article::where('feed_id', $feed->id)->count();
            $feed->unread_count = Article::where('feed_id', $feed->id)->where('read', 0)->count();
        }

        return Jump::returnResponse()->result([
            'list' => $list,
            'total' => $total,
            'page' => $page,
            'page_size' => $pageSize,
        ], 'success', '获取成功');
    }

    // 订阅源详情
    public function info(Request $request)
    {
        $dto = new FeedDto($request->get());
        
        try {
            $dto->validate('info');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        $feed = Subscription::where('id', $dto->feed_id)
            ->where('user_id', $request->uid)
            ->find();

        if (!$feed) {
            return Jump::returnResponse()->error('订阅源不存在');
        }

        $feed->article_count = Article::where('feed_id', $feed->id)->count();
        $feed->unread_count = Article::where('feed_id', $feed->id)->where('read', 0)->count();

        return Jump::returnResponse()->result([
            'feed' => $feed,
        ], 'success', '获取成功');
    }

    // 发现订阅源
    public function discover(Request $request)
    {
        $dto = new DiscoverDto($request->post());
        
        try {
            $dto->validate('discover');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        try {
            $result = FeedService::discover($dto->url);
            return Jump::returnResponse()->result([
                'feeds' => $result,
            ], 'success', '发现成功');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error('发现失败: ' . $e->getMessage());
        }
    }

    // 添加用户订阅源
    public function add(Request $request)
    {
        $dto = new FeedAddDto($request->post());
        
        try {
            $dto->validate('add');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        // 检查是否已订阅
        $exists = Subscription::where('user_id', $request->uid)
            ->where('url', $dto->url)
            ->find();
        
        if ($exists) {
            return Jump::returnResponse()->error('已订阅该源');
        }

        try {
            $feed = FeedService::addFeed($request->uid, $dto->url);
            $feed->category_id = $dto->category_id;
            $feed->save();

            return Jump::returnResponse()->result([
                'feed' => $feed,
            ], 'success', '订阅成功');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error('订阅失败: ' . $e->getMessage());
        }
    }

    // 编辑订阅源分类
    public function edit(Request $request)
    {
        $dto = new FeedEditDto($request->post());
        
        try {
            $dto->validate('edit');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        $feed = Subscription::where('id', $dto->feed_id)
            ->where('user_id', $request->uid)
            ->find();

        if (!$feed) {
            return Jump::returnResponse()->error('订阅源不存在');
        }

        $feed->category_id = $dto->category_id;
        $feed->save();

        return Jump::returnResponse()->success('编辑成功');
    }

    // 用户退订订阅源
    public function del(Request $request)
    {
        $dto = new FeedDto($request->post());
        
        try {
            $dto->validate('del');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        $feed = Subscription::where('id', $dto->feed_id)
            ->where('user_id', $request->uid)
            ->find();

        if (!$feed) {
            return Jump::returnResponse()->error('订阅源不存在');
        }

        // 删除订阅源下的文章
        Article::where('feed_id', $feed->id)->delete();
        
        // 删除订阅源
        $feed->delete();

        return Jump::returnResponse()->success('退订成功');
    }

    // 手动触发刷新用户订阅源
    public function refresh(Request $request)
    {
        $feedId = $request->post('feed_id', null);

        // 获取数据库配置
        $dbConfig = config('database');
        $connection = $dbConfig['default'] ?? 'sqlite';
        $config = $dbConfig['connections'][$connection] ?? [];
        
        // 构建队列配置
        $queueConfig = [
            'default' => 'database',
            'connections' => [
                'database' => [
                    'driver' => 'database',
                    'dsn' => $config['dsn'] ?? 'sqlite:' . root_path() . 'database/database.sqlite',
                    'username' => $config['username'] ?? null,
                    'password' => $config['password'] ?? null,
                    'table' => 'queue_jobs',
                ],
            ],
        ];
        
        // 创建队列实例
        $queue = Factory::create($queueConfig);

        // 推送刷新任务到队列
        $jobData = [
            'user_id' => $request->uid,
            'feed_id' => $feedId,
        ];

        $jobId = $queue->push(RefreshFeedJob::class, $jobData, 'feeds');

        return Jump::returnResponse()->result([
            'job_id' => $jobId,
        ], 'success', '刷新任务已加入队列');
    }

    // 导出订阅源为 OPML
    public function export(Request $request)
    {
        $opml = FeedService::exportOpml($request->uid);
        
        return response($opml, 200, [
            'Content-Type' => 'text/xml; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="qireader-subscriptions.opml"',
        ]);
    }

    // 导入 OPML 订阅源
    public function import(Request $request)
    {
        $file = $request->file('file');
        
        if (!$file) {
            return Jump::returnResponse()->error('请选择文件');
        }

        try {
            $content = file_get_contents($file->getPathname());
            $result = FeedService::importOpml($request->uid, $content);
            
            return Jump::returnResponse()->result([
                'imported' => $result['imported'],
                'errors' => $result['errors'],
            ], 'success', "成功导入 {$result['imported']} 个订阅源");
        } catch (\Exception $e) {
            return Jump::returnResponse()->error('导入失败: ' . $e->getMessage());
        }
    }
}