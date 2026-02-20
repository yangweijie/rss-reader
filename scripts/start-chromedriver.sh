#!/bin/bash

# 启动 ChromeDriver
CHROMEDRIVER_PATH="vendor/laravel/dusk/bin/chromedriver-mac-arm"
PORT=9515

# 检查是否已经在运行
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "ChromeDriver already running on port $PORT"
else
    echo "Starting ChromeDriver on port $PORT..."
    $CHROMEDRIVER_PATH --port=$PORT > /dev/null 2>&1 &
    sleep 2
    echo "ChromeDriver started"
fi