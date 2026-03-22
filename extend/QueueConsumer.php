<?php
declare(strict_types=1);

/**
 * 队列消费者 - 刷新订阅源
 *
 * 启动方式: php think queue:listen
 * 或直接运行: php extend/QueueConsumer.php
 */

use Kode\Queue\Factory;

require_once __DIR__ . "/../vendor/autoload.php";

// 初始化应用
$app = new \think\App();
$app->initialize();

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

echo "队列消费者启动，监听队列: feeds\n";

while (true) {
    try {
        $job = $queue->pop("feeds");
        var_dump($job);
        if ($job) {
            echo "处理任务: {$job["job"]}\n";

            $jobClass = $job["job"];

            if (class_exists($jobClass)) {
                $handler = new $jobClass();
                $result = $handler->handle($job["data"]);

                if ($result) {
                    echo "任务完成\n";
                } else {
                    echo "任务失败\n";
                }
            } else {
                echo "任务类不存在: {$jobClass}\n";
            }
        } else {
            // 队列为空，休眠1秒
            sleep(1);
        }
    } catch (\Exception $e) {
        echo "错误: " . $e->getMessage() . "\n";
        sleep(1);
    }
}
