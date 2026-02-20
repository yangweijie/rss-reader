#!/usr/bin/env python3
"""
使用 Selenium 绕过 Cloudflare 保护获取 RSS 内容
"""
import sys
import time
import html
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def fetch_rss(url):
    """
    使用 Selenium 获取 RSS 内容
    
    Args:
        url: RSS 订阅源 URL
    
    Returns:
        RSS 内容字符串，如果失败则返回 None
    """
    driver = None
    try:
        # 配置 Chrome 无头模式
        chrome_options = Options()
        chrome_options.add_argument('--headless=new')  # 使用新的无头模式
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--disable-software-rasterizer')
        chrome_options.add_argument('--disable-extensions')

        # 添加 User-Agent 和其他浏览器特征
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option('excludeSwitches', ['enable-automation'])
        chrome_options.add_experimental_option('useAutomationExtension', False)

        # 启动浏览器
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

        # 隐藏 webdriver 特征
        driver.execute_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

        # 先访问主页建立会话
        domain = '/'.join(url.split('/')[:3])
        driver.get(domain)
        time.sleep(2)
        
        # 访问 RSS URL
        driver.get(url)
        
        # 等待页面加载，Cloudflare 验证最多等待 20 秒
        max_wait = 20
        waited = 0
        while waited < max_wait:
            time.sleep(2)
            waited += 2
            page_source = driver.page_source
            
            # 检查是否获取到 RSS 内容
            if '&lt;?xml version' in page_source or '&lt;rss version' in page_source:
                # HTML 转义的 XML，需要反转义
                return html.unescape(page_source)
            elif '<?xml version' in page_source or '<rss version' in page_source:
                # 正常的 XML
                return page_source
            elif 'Just a moment' not in page_source and '请稍候' not in page_source:
                # 页面已加载但不是 RSS
                break

        return None

    except Exception as e:
        print(f'错误: {e}', file=sys.stderr)
        return None
    finally:
        if driver:
            driver.quit()

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('用法: python3 fetch_rss_with_selenium.py <rss_url>', file=sys.stderr)
        sys.exit(1)
    
    url = sys.argv[1]
    rss_content = fetch_rss(url)
    
    if rss_content:
        print(rss_content)
        sys.exit(0)
    else:
        print('无法获取 RSS 内容', file=sys.stderr)
        sys.exit(1)