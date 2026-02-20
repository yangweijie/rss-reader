#!/usr/bin/env python3
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# 配置 Chrome 无头模式
chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--window-size=1920,1080')

# 添加 User-Agent 和其他浏览器特征
chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36')
chrome_options.add_argument('--disable-blink-features=AutomationControlled')
chrome_options.add_experimental_option('excludeSwitches', ['enable-automation'])
chrome_options.add_experimental_option('useAutomationExtension', False)

# 启动浏览器
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

# 隐藏 webdriver 特征
driver.execute_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

try:
    # 先访问主页建立会话
    print('正在访问主页建立会话...')
    driver.get('https://php.libhunt.com/')
    time.sleep(5)
    
    # 访问 RSS URL
    url = 'https://php.libhunt.com/newsletter/feed'
    print(f'正在访问: {url}')
    driver.get(url)

    # 等待页面加载完成
    print('等待页面加载...')
    
    # 等待 15 秒让 Cloudflare 完成验证
    time.sleep(15)

    page_source = driver.page_source
    print(f'状态码: {len(page_source)} bytes')

    # 检查是否成功获取到 RSS 内容（检查转义的 XML）
    if '&lt;?xml version' in page_source or '&lt;rss version' in page_source:
        print('✓ 成功获取到 RSS 内容（已转义）！')
        
        # 使用 html.unescape 反转义
        import html
        unescaped = html.unescape(page_source)
        
        # 保存到文件
        with open('/Volumes/data/git/php/rss/qireader-laravel/storage/app/cache/test_rss.xml', 'w', encoding='utf-8') as f:
            f.write(unescaped)
        print('已保存到: storage/app/cache/test_rss.xml')
    elif '<?xml version' in page_source or '<rss version' in page_source:
        print('✓ 成功获取到 RSS 内容！')
        
        # 保存到文件
        with open('/Volumes/data/git/php/rss/qireader-laravel/storage/app/cache/test_rss.xml', 'w', encoding='utf-8') as f:
            f.write(page_source)
        print('已保存到: storage/app/cache/test_rss.xml')
    else:
        print('✗ 未能获取到 RSS 内容')
        print(f'页面标题: {driver.title}')

except Exception as e:
    print(f'错误: {e}')
    import traceback
    traceback.print_exc()
finally:
    driver.quit()