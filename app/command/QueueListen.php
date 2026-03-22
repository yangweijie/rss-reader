<?php
declare(strict_types=1);

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use Kode\Queue\Factory;

/**
 * 队列监听命令
 * 使用方法: php think queue:listen
 */
class QueueListen extends Command
{
    protected function configure()
    {
        $this->setName('queue:listen')
            ->setDescription('启动队列消费者，监听订阅源刷新任务');
    }

    protected function execute(Input $input, Output $output)
    {
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

        $output->writeln("队列消费者启动，监听队列: feeds");

        while (true) {
            try {
                $job = $queue->pop("feeds");

                if ($job) {
                    $output->writeln("处理任务: {$job['job']}");

                    $jobClass = $job['job'];

                    if (class_exists($jobClass)) {
                        $handler = new $jobClass();
                        $result = $handler->handle($job['data']);

                        if ($result) {
                            $output->writeln("任务完成");
                        } else {
                            $output->writeln("任务失败");
                        }
                    } else {
                        $output->writeln("任务类不存在: {$jobClass}");
                    }
                } else {
                    // 队列为空，休眠1秒
                    sleep(1);
                }
            } catch (\Exception $e) {
                $output->writeln("错误: " . $e->getMessage());
                sleep(1);
            }
        }
    }
}
