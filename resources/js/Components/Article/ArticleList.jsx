import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bookmark, 
  Clock,
  ExternalLink,
  Tag as TagIcon,
  Trash2,
  X,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu } from '@/components/ui/context-menu';
import { router } from '@inertiajs/react';

const TagManager = ({ article, tags, isOpen, onClose, onAttachTag, onDetachTag, onCreateTag }) => {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  const colorOptions = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  ];

  const articleTags = article?.tags || [];

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    // 检查是否已存在同名标签（不区分大小写）
    const existingTag = tags?.find(t =>
      t.name.toLowerCase() === newTagName.trim().toLowerCase()
    );

    if (existingTag) {
      // 如果已存在，直接关联
      await onAttachTag(article.id, existingTag.id);
      // 清空输入框
      setNewTagName('');
      setNewTagColor('#3b82f6');
    } else {
      // 如果不存在，创建新标签
      await onCreateTag(newTagName, newTagColor);
      // 确保清空输入框
      setNewTagName('');
      setNewTagColor('#3b82f6');
    }
  };

  if (!isOpen || !article) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">标签管理</h3>
          <p className="text-sm text-gray-500 mt-1">为此文章添加或移除标签</p>
        </div>

        <div className="p-4 space-y-4">
          {/* 现有标签 */}
          <div>
            <div className="text-xs text-gray-400 font-medium mb-2">文章标签</div>
            <div className="flex flex-wrap gap-2">
              {articleTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => onDetachTag(article.id, tag.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors group"
                  style={{ backgroundColor: tag.color || '#3b82f6' }}
                >
                  <span className="text-white">{tag.name}</span>
                  <X className="w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
              {articleTags.length === 0 && (
                <span className="text-sm text-gray-400">暂无标签</span>
              )}
            </div>
          </div>

          {/* 可用标签 */}
          <div>
            <div className="text-xs text-gray-400 font-medium mb-2">可用标签</div>
            <div className="flex flex-wrap gap-2">
              {tags?.filter(t => !articleTags.find(at => at.id === t.id)).map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => onAttachTag(article.id, tag.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#3b82f6' }} />
                  <span>{tag.name}</span>
                  <Plus className="w-3 h-3 text-gray-400" />
                </button>
              ))}
              {(!tags || tags.filter(t => !articleTags.find(at => at.id === t.id)).length === 0) && (
                <span className="text-sm text-gray-400">没有更多标签</span>
              )}
            </div>
          </div>

          {/* 创建新标签 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-400 font-medium mb-2">创建新标签</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="输入标签名称..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:border-[#861DD4]"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <button
                onClick={handleAddTag}
                disabled={!newTagName.trim()}
                className="px-4 py-2 bg-[#861DD4] text-white rounded-lg text-sm hover:bg-[#6B17AA] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewTagColor(color)}
                  className={cn(
                    'w-6 h-6 rounded-full shrink-0 transition-transform',
                    newTagColor === color && 'ring-2 ring-offset-1 ring-gray-400 scale-110'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            完成
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

const highlightText = (text, search) => {
  if (!search || !text) return text;
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => 
    regex.test(part) 
      ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark>
      : part
  );
};

const ArticleItem = memo(function ArticleItem({ 
  article, 
  isSelected, 
  isSelectedForBatch,
  onSelect,
  onToggleFavorite,
  onSelectOne,
  onOpenTagManager,
  searchQuery
}) {
  const [contextMenu, setContextMenu] = useState(null);

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} 分钟前`;
      }
      return `${hours} 小时前`;
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days} 天前`;
    }
    return d.toLocaleDateString('zh-CN');
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const contextMenuItems = [
    {
      label: article.favorite ? '取消收藏' : '添加收藏',
      icon: <Bookmark className="w-4 h-4" />,
      onClick: () => {
        onToggleFavorite(article);
        setContextMenu(null);
      }
    },
    {
      label: '标签管理',
      icon: <TagIcon className="w-4 h-4" />,
      onClick: () => {
        onOpenTagManager(article);
        setContextMenu(null);
      }
    },
    {
      label: '在新标签页打开',
      icon: <ExternalLink className="w-4 h-4" />,
      onClick: () => {
        window.open(article.link, '_blank');
        setContextMenu(null);
      }
    },
    { divider: true },
    {
      label: '删除',
      icon: <Trash2 className="w-4 h-4" />,
      danger: true,
      onClick: () => {
        // TODO: 实现删除功能
        setContextMenu(null);
      }
    }
  ];

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          'group relative px-4 py-3 cursor-pointer border-b border-gray-100',
          'transition-colors duration-150',
          isSelected ? 'bg-[#861DD4]/5 border-l-2 border-l-[#861DD4]' : 'hover:bg-gray-50',
          !article.read && 'bg-white',
          article.read && 'bg-gray-50/50 opacity-70'
        )}
        onClick={() => onSelect(article)}
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-start gap-3">
          {/* 未读标记 - 小蓝点 */}
          {!article.read && (
            <div className="w-2 h-2 mt-2 rounded-full bg-[#861DD4] flex-shrink-0" />
          )}
          
          <div className="flex-1 min-w-0">
            {/* 标题 */}
            <h3 className={cn(
              'text-sm font-medium leading-5 line-clamp-2 mb-1',
              article.read ? 'text-gray-600' : 'text-gray-900'
            )}>
              {searchQuery ? highlightText(article.title, searchQuery) : article.title}
            </h3>
            
            {/* 摘要 */}
            {(article.highlight || article.excerpt) && (
              <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                {article.highlight 
                  ? <span dangerouslySetInnerHTML={{ __html: article.highlight }} />
                  : (searchQuery ? highlightText(article.excerpt, searchQuery) : article.excerpt)
                }
              </p>
            )}
            
            {/* 标签 */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {article.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs text-white"
                    style={{ backgroundColor: tag.color || '#3b82f6' }}
                  >
                    {tag.name}
                  </span>
                ))}
                {article.tags.length > 3 && (
                  <span className="text-xs text-gray-400">+{article.tags.length - 3}</span>
                )}
              </div>
            )}
            
            {/* 元信息 */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {/* 来源 */}
              {article.feed?.title && (
                <span className="flex items-center gap-1 truncate">
                  {article.feed.icon && (
                    <img
                      src={article.feed.icon}
                      alt=""
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  <span className="truncate max-w-[120px]">{article.feed.title}</span>
                </span>
              )}
              
              {/* 作者 */}
              {article.author && (
                <span className="truncate">{article.author}</span>
              )}
              
              {/* 时间 */}
              <span className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {formatDate(article.published_at)}
              </span>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            {/* 收藏 - 一直显示 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(article);
              }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                article.favorite
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
            >
              <Bookmark className={cn("w-4 h-4", article.favorite && "fill-current")} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
});

export default function ArticleList({
  articles = [],
  selectedIds,
  selectedArticleId,
  onSelectOne,
  onSelectAll,
  onArticleClick,
  onFavorite,
  allTags,
  onRefresh,
  searchQuery
}) {
  const [tagManagerArticle, setTagManagerArticle] = useState(null);
  
  const handleToggleFavorite = (article) => {
    onFavorite(article.id, article.favorite);
  };

  const handleAttachTag = async (articleId, tagId) => {
    try {
      await fetch(`/articles/${articleId}/tags/${tagId}/attach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
        },
      });
      const updatedArticle = await onRefresh?.(articleId);
      // 使用返回的更新文章更新 tagManagerArticle
      if (tagManagerArticle?.id === articleId && updatedArticle) {
        setTagManagerArticle(updatedArticle);
      }
    } catch (error) {
      console.error('Failed to attach tag:', error);
    }
  };

  const handleDetachTag = async (articleId, tagId) => {
    try {
      await fetch(`/articles/${articleId}/tags/${tagId}/detach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
        },
      });
      const updatedArticle = await onRefresh?.(articleId);
      // 使用返回的更新文章更新 tagManagerArticle
      if (tagManagerArticle?.id === articleId && updatedArticle) {
        setTagManagerArticle(updatedArticle);
      }
    } catch (error) {
      console.error('Failed to detach tag:', error);
    }
  };

  const handleCreateTag = async (name, color) => {
    console.log('handleCreateTag called with:', name, color);
    try {
      const response = await fetch('/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({ name, color }),
      });
      const data = await response.json();
      console.log('Tag created:', data);
      if (data.tag && tagManagerArticle) {
        await handleAttachTag(tagManagerArticle.id, data.tag.id);
        console.log('Tag attached successfully');
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  return (
    <>
      <div className="flex flex-col bg-white">
        <div className="flex-1">
          <AnimatePresence mode="popLayout">
            {articles.length > 0 ? (
              articles.map(article => (
                <ArticleItem
                  key={article.id}
                  article={article}
                  isSelected={selectedArticleId === article.id}
                  isSelectedForBatch={selectedIds?.has(article.id)}
                  onSelect={onArticleClick}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectOne={onSelectOne}
                  onOpenTagManager={setTagManagerArticle}
                  searchQuery={searchQuery}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-gray-400 py-12"
              >
                <p>暂无文章</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 标签管理器 */}
      <TagManager
        article={tagManagerArticle}
        tags={allTags}
        isOpen={!!tagManagerArticle}
        onClose={() => setTagManagerArticle(null)}
        onAttachTag={handleAttachTag}
        onDetachTag={handleDetachTag}
        onCreateTag={handleCreateTag}
      />
    </>
  );
}
