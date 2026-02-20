import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export function ContextMenu({ x, y, items, onClose }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose?.();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (rect.right > viewportWidth) {
                menuRef.current.style.left = `${x - rect.width}px`;
            }
            if (rect.bottom > viewportHeight) {
                menuRef.current.style.top = `${y - rect.height}px`;
            }
        }
    }, [x, y]);

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
            style={{ left: x, top: y }}
        >
            {items.map((item, index) => (
                <div key={index}>
                    {item.divider && (
                        <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                    )}
                    <button
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                            item.danger
                                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        )}
                        onClick={item.onClick}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                </div>
            ))}
        </div>,
        document.body
    );
}

export function ContextMenuTrigger({ children, onContextMenu }) {
    return (
        <div onContextMenu={onContextMenu}>
            {children}
        </div>
    );
}

export function ContextMenuContent({ children }) {
    return children;
}

export function ContextMenuItem({ children, onClick, danger }) {
    return (
        <button
            className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                danger
                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

export function ContextMenuSeparator() {
    return <div className="my-1 border-t border-gray-200 dark:border-gray-700" />;
}
