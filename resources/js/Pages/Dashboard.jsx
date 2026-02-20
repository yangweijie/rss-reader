import { Head, Link } from '@inertiajs/react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Dashboard() {
    return (
        <DashboardLayout>
            <Head title="控制台" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">欢迎使用 Qi Reader</h2>
                    <p className="text-muted-foreground">开始阅读您的 RSS 订阅内容</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Link href="/articles">
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                        <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <div>
                                        <CardTitle>订阅源</CardTitle>
                                        <CardDescription>管理您的 RSS 订阅</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>

                    <Link href="/articles">
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                                        <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <div>
                                        <CardTitle>文章</CardTitle>
                                        <CardDescription>阅读您的订阅内容</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>

                    <Link href="/tags">
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                        <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <CardTitle>标签</CardTitle>
                                        <CardDescription>组织和分类文章</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>快速开始</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                                1
                            </div>
                            <div>
                                <p className="font-medium">添加订阅源</p>
                                <p className="text-sm text-muted-foreground">前往订阅源页面，添加您喜欢的 RSS 订阅</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400">
                                2
                            </div>
                            <div>
                                <p className="font-medium">阅读文章</p>
                                <p className="text-sm text-muted-foreground">浏览文章列表，点击文章标题查看详情</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400">
                                3
                            </div>
                            <div>
                                <p className="font-medium">使用标签</p>
                                <p className="text-sm text-muted-foreground">创建标签来组织和分类您的文章</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}