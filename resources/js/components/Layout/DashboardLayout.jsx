import { useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children, sidebarMode = 'normal', onHideSidebar }) {
    const { auth, subscriptions, categories, tags } = usePage().props;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && currentPath === '/articles') {
                const lastRefresh = localStorage.getItem('last_subscription_refresh');
                const now = Date.now();
                const refreshInterval = 5 * 60 * 1000;

                if (!lastRefresh || (now - lastRefresh) > refreshInterval) {
                    localStorage.setItem('last_subscription_refresh', now.toString());
                    
                    router.post('/subscriptions/refresh-all', {}, {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: () => {
                            // 刷新成功，Inertia 会自动更新 props
                        },
                        onError: (errors) => {
                            console.error('自动刷新失败:', errors);
                        }
                    });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [currentPath]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
            <div className="flex relative w-full">
                {/* 三栏模式 - 显示左栏 */}
                {sidebarMode === 'normal' && (
                    <Sidebar
                        subscriptions={subscriptions || []}
                        categories={categories || []}
                        tags={tags || []}
                        currentPath={currentPath}
                        showToggle={true}
                        onToggle={onHideSidebar}
                    />
                )}

                {/* 主内容区域 */}
                <main className="flex-1 w-full min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
