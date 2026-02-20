import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark,
  CheckCircle,
  ExternalLink,
  Share2,
  ArrowLeft,
  ArrowRight,
  Languages
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default memo(function ArticleContent({
  article,
  onToggleRead,
  onToggleFavorite,
  onPrevArticle,
  onNextArticle,
  hasPrev,
  hasNext
}) {
  const [isTranslated, setIsTranslated] = useState(false);

  // 检测 translate.js 加载状态
  useEffect(() => {
    console.log('Translate.js 加载状态:', {
      loaded: window.translateLoaded,
      ready: window.translateReady,
      translate: typeof window.translate !== 'undefined'
    });
  }, []);

  // 文章变化时，如果之前开启了翻译，自动翻译新文章
  useEffect(() => {
    if (article && window.isTranslating && window.translateLoaded && window.translateReady) {
      console.log('文章变化，自动翻译');
      // 等待 DOM 渲染完成
      setTimeout(() => {
        try {
          // 重置之前的翻译
          window.translate.reset();

          // 获取文章正文元素（.prose 类的元素）
          const articleContent = document.querySelector('article .prose') ||
                                document.querySelector('[class*="prose"]');

          if (articleContent) {
            window.translate.to = 'chinese_simplified';
            window.translate.setDocuments([articleContent]);
            window.translate.execute();
            setIsTranslated(true);
          }
        } catch (error) {
          console.error('自动翻译失败:', error);
        }
      }, 100);
    }
  }, [article?.id]); // 只在文章 ID 变化时触发

  // 切换翻译状态
  const handleTranslate = () => {
    console.log('点击翻译按钮');

    // 检查 translate.js 是否已加载
    if (!window.translateLoaded || !window.translateReady) {
      console.error('翻译功能未加载:', { loaded: window.translateLoaded, ready: window.translateReady });
      alert('翻译功能加载中，请稍后再试');
      return;
    }

    if (typeof window.translate === 'undefined') {
      console.error('translate 对象未定义');
      alert('翻译功能初始化失败，请刷新页面后再试');
      return;
    }

    console.log('translate 对象:', {
      exists: true,
      hasExecute: typeof window.translate.execute === 'function',
      hasReset: typeof window.translate.reset === 'function',
      to: window.translate.to,
      local: window.translate.language?.getLocal()
    });

    try {
      if (isTranslated) {
        console.log('执行恢复原文');
        // 恢复原文本
        window.translate.reset();
        setIsTranslated(false);
        // 清除全局翻译状态
        window.isTranslating = false;
      } else {
        console.log('执行翻译');

        // 设置目标语言为中文
        window.translate.to = 'chinese_simplified';
        console.log('设置目标语言为:', window.translate.to);

        // 获取文章正文元素（.prose 类的元素）
        const articleContent = document.querySelector('article .prose') ||
                                document.querySelector('[class*="prose"]');

        console.log('找到文章正文元素:', {
          articleContent: !!articleContent,
          className: articleContent?.className,
          tagName: articleContent?.tagName
        });

        if (!articleContent) {
          console.error('未找到文章正文元素');
          alert('未找到文章正文内容');
          return;
        }

        // 使用 setDocuments 限制翻译范围到文章正文
        // 这样就只会翻译 .prose 元素内的内容
        window.translate.setDocuments([articleContent]);
        console.log('设置翻译文档范围:', articleContent);

        // 执行翻译
        console.log('开始调用 translate.execute()');
        window.translate.execute();
        console.log('翻译执行完成');
        setIsTranslated(true);
        // 设置全局翻译状态
        window.isTranslating = true;
      }
    } catch (error) {
      console.error('翻译功能出错:', error);
      alert('翻译功能暂时不可用');
    }
  };

  if (!article) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center text-gray-400">
          <p className="text-lg">选择一篇文章查看</p>
          <p className="text-sm mt-2">从左侧列表选择文章开始阅读</p>
        </div>
      </div>
    );
  }

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 处理文章内容，给 img 标签添加 referrerpolicy 属性，给 a 标签添加 target="_blank" 和样式
  const processContent = (html) => {
    if (!html) return html;
    
    // 先处理 img 标签，添加 referrerpolicy
    let processedHtml = html.replace(
      /<img([^>]*?)>/gi,
      '<img$1 referrerpolicy="no-referrer">'
    );
    
    // 处理 a 标签，添加 target="_blank" 和样式类
    processedHtml = processedHtml.replace(
      /<a([^>]*?)>/gi,
      (match, attributes) => {
        // 检查是否已经有 target 属性
        if (attributes.includes('target=')) {
          return match;
        }
        
        // 添加 target="_blank" 和样式类
        return `<a${attributes} target="_blank" class="text-blue-600 hover:text-blue-800 underline">`;
      }
    );
    
    return processedHtml;
  };

  return (
    <motion.div
      key={article.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-white"
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        {/* 导航 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevArticle}
            disabled={!hasPrev}
            className={cn(
              'p-2 rounded-md transition-colors',
              hasPrev
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onNextArticle}
            disabled={!hasNext}
            className={cn(
              'p-2 rounded-md transition-colors',
              hasNext
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            )}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 翻译 */}
          <button
            onClick={handleTranslate}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              isTranslated
                ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Languages className="w-4 h-4" />
            {isTranslated ? '原文' : '翻译'}
          </button>

          {/* 收藏 */}
          <button
            onClick={() => onToggleFavorite(article)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              article.favorite
                ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Bookmark className={cn("w-4 h-4", article.favorite && "fill-current")} />
            {article.favorite ? '已收藏' : '收藏'}
          </button>

          {/* 标记已读/未读 */}
          <button
            onClick={() => onToggleRead(article)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              article.read
                ? 'text-green-600 bg-green-50 hover:bg-green-100'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <CheckCircle className="w-4 h-4" />
            {article.read ? '已读' : '标记已读'}
          </button>

          {/* 原文链接 */}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            原文
          </a>

          {/* 分享 */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: article.title,
                  url: article.link
                });
              } else {
                navigator.clipboard.writeText(article.link);
              }
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto px-6 py-8">
          {/* 标题 */}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xl font-bold text-gray-900 mb-4 leading-tight hover:text-[#861DD4] transition-colors"
          >
            {article.title}
          </a>
          
          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
            {/* 来源 */}
            {article.feed && (
              <div className="flex items-center gap-2">
                {article.feed.icon && (
                  <img
                    src={article.feed.icon}
                    alt=""
                    className="w-4 h-4 rounded-sm"
                    referrerPolicy="no-referrer"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <span className="font-medium text-gray-700">
                  {article.feed.title}
                </span>
              </div>
            )}
            
            {/* 作者 */}
            {article.author && (
              <span>作者: {article.author}</span>
            )}
            
            {/* 发布时间 */}
            {article.published_at && (
              <span>{formatDate(article.published_at)}</span>
            )}
            
            {/* 阅读时间 */}
            {article.content && (
              <span>
                {Math.ceil(article.content.length / 500)} 分钟阅读
              </span>
            )}
          </div>
          
          {/* 标签 */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {article.tags.map(tag => (
                <span
                  key={tag.id}
                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-md"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          
          {/* 封面图 */}
          {article.image && (
            <div className="mb-6">
              <img
                src={article.image}
                alt=""
                className="w-full h-auto rounded-lg"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}
          
          {/* 正文 */}
          <div
            className="prose prose-lg prose-gray max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:text-violet-600 dark:prose-code:text-violet-400 prose-code:before:content-[''] prose-code:after:content-[''] prose-code:px-1.5 prose-code:py-0.5 prose-code:bg-violet-50 dark:prose-code:bg-violet-900/20 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 dark:prose-pre:border-gray-800 prose-pre:rounded-lg prose-pre:shadow-xl prose-blockquote:border-l-4 prose-blockquote:border-violet-500 dark:prose-blockquote:border-violet-400 prose-blockquote:bg-violet-50/50 dark:prose-blockquote:bg-violet-900/10 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r prose-blockquote:not-italic prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300 prose-hr:border-gray-200 dark:prose-hr:border-gray-800 prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-violet-500 dark:prose-li:marker:text-violet-400 prose-img:rounded-lg prose-img:shadow-md prose-table:overflow-hidden prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-800 prose-thead:bg-gray-50 dark:prose-thead:bg-gray-900 prose-th:text-left prose-th:font-semibold prose-th:text-gray-700 dark:prose-th:text-gray-300 prose-td:border-b prose-td:border-gray-200 dark:prose-td:border-gray-800"
            dangerouslySetInnerHTML={{ __html: processContent(article.content) }}
          />
        </article>
      </div>
    </motion.div>
  );
});
