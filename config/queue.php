<?php

return [
    'default' => env('QUEUE_DRIVER', 'database'),
    'connections' => [
        'sync' => [
            'driver' => 'sync',
        ],
        'redis' => [
            'driver' => 'redis',
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'port' => env('REDIS_PORT', 6379),
            'database' => env('REDIS_DB', 0),
            'password' => env('REDIS_PASSWORD', null),
        ],
        'database' => [
            'driver' => 'database',
            'dsn' => env('DB_DSN', 'sqlite:' . root_path() . 'database/database.sqlite'),
            'username' => env('DB_USER', null),
            'password' => env('DB_PASS', null),
            'table' => 'queue_jobs',
        ],
    ],
];
