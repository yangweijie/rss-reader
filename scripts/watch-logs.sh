#!/bin/bash

# 实时查看订阅源刷新日志

echo "========================================="
echo "订阅源刷新日志监控"
echo "========================================="
echo "按 Ctrl+C 停止"
echo "========================================="
echo ""

tail -f storage/logs/laravel.log | grep -E "(订阅源|Dusk|RSS|Cloudflare|反爬虫)"