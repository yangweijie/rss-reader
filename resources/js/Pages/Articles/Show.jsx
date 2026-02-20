import { Head, Link, router } from '@inertiajs/react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ArticleShow({ article, tags }) {
    const handleMarkAsRead = () => {
        router.post(`/articles/${article.id}/read`);
    };

    const handleMarkAsFavorite = () => {
        router.post(`/articles/${article.id}/favorite`);
    };

    const handleToggleTag = (tagId) => {
        const isAttached = article.tags.some(t => t.id === tagId);
        router.post(`/articles/${article.id}/tags`, {
            tagIds: isAttached
                ? article.tags.filter(t => t.id !== tagId).map(t => t.id)
                : [...article.tags.map(t => t.id), tagId],
        });
    };

    return (
        <DashboardLayout>
            <Head title={article.title} />

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Link
                        href="/articles"
                        className="text-sm text-muted-foreground hover:text-primary"
                    >
                        ← 返回文章列表
                    </Link>
                    <div className="flex gap-2">
                        <Button
                            variant={article.read ? 'outline' : 'default'}
                            onClick={handleMarkAsRead}
                        >
                            {article.read ? '标记为未读' : '标记为已读'}
                        </Button>
                        <Button
                            variant={article.favorite ? 'default' : 'outline'}
                            onClick={handleMarkAsFavorite}
                        >
                            {article.favorite ? '已收藏' : '收藏'}
                        </Button>
                        <Button
                            variant="outline"
                            asChild
                        >
                            <a href={article.link} target="_blank" rel="noopener noreferrer">
                                打开原文
                            </a>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-2xl">{article.title}</CardTitle>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    {article.author && <span>{article.author}</span>}
                                    <span>{new Date(article.published_at).toLocaleDateString('zh-CN')}</span>
                                    {article.feed && (
                                        <Link
                                            href={`/articles?feed_id=${article.feed.id}`}
                                            className="hover:text-primary"
                                        >
                                            {article.feed.title}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: article.content }}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>标签</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {article.tags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        style={{ backgroundColor: tag.color }}
                                        className="cursor-pointer"
                                        onClick={() => handleToggleTag(tag.id)}
                                    >
                                        {tag.name}
                                        <span className="ml-1">×</span>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tags
                                    .filter((tag) => !article.tags.some(t => t.id === tag.id))
                                    .map((tag) => (
                                        <Badge
                                            key={tag.id}
                                            variant="outline"
                                            style={{ borderColor: tag.color }}
                                            className="cursor-pointer"
                                            onClick={() => handleToggleTag(tag.id)}
                                        >
                                            + {tag.name}
                                        </Badge>
                                    ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}