import { memo } from 'react';
import FeedItem from './FeedItem';

const FeedList = memo(function FeedList({
  items = [],
  expandedFolders = new Set(),
  onToggleFolder,
  onSelect,
  selectedId,
  level = 0
}) {
  if (!items || items.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-gray-400 text-center">
        暂无订阅源
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {items.map(item => (
        <FeedItem
          key={item.id}
          item={item}
          isExpanded={expandedFolders.has(item.id)}
          isSelected={selectedId === item.id}
          level={level}
          onToggle={() => onToggleFolder?.(item.id)}
          onSelect={() => onSelect?.(item)}
        >
          {item.isFolder && item.children && item.children.length > 0 && (
            <FeedList
              items={item.children}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelect={onSelect}
              selectedId={selectedId}
              level={level + 1}
            />
          )}
        </FeedItem>
      ))}
    </div>
  );
});

export default FeedList;
