import { useState } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Link, Folder, Pencil } from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import CategoryDialog from '@/components/Feed/CategoryDialog.jsx';

export default function Edit({ subscription, categories }) {
    const { errors } = usePage().props;
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

    const { data, setData, put, processing } = useForm({
        title: subscription.title || '',
        category_id: subscription.category_id ? String(subscription.category_id) : 'none',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(`/subscriptions/${subscription.id}`, {
            onSuccess: () => router.visit('/articles'),
        });
    };

    const handleCategoryCreated = (category) => {
        setData('category_id', String(category.id));
    };

    return (
        <DashboardLayout>
            <Head title="编辑订阅源" />

            <div className="container max-w-2xl py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5" />
                            编辑订阅源
                        </CardTitle>
                        <CardDescription>
                            修改订阅源的标题和文件夹位置
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="url">RSS 链接</Label>
                                <Input
                                    id="url"
                                    type="url"
                                    value={subscription.url}
                                    disabled
                                    className="bg-gray-50"
                                />
                                <p className="text-xs text-gray-500">
                                    RSS 链接不可修改
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">标题</Label>
                                <Input
                                    id="title"
                                    type="text"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="订阅源标题"
                                />
                                {errors.title && (
                                    <p className="text-sm text-red-500">{errors.title}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="category">文件夹</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsCategoryDialogOpen(true)}
                                        className="h-8 px-2 text-xs"
                                    >
                                        + 新建文件夹
                                    </Button>
                                </div>
                                <Select
                                    value={data.category_id}
                                    onValueChange={(value) => setData('category_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择文件夹（可选）" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400">无文件夹</span>
                                            </div>
                                        </SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={String(category.id)}>
                                                <div className="flex items-center gap-2">
                                                    <Folder className="h-4 w-4 text-blue-500" />
                                                    <span>{category.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category_id && (
                                    <p className="text-sm text-red-500">{errors.category_id}</p>
                                )}
                            </div>

                            {data.category_id && data.category_id !== 'none' && (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                                    <Folder className="h-4 w-4" />
                                    <span>
                                        将移动到文件夹: {' '}
                                        {categories.find(c => String(c.id) === data.category_id)?.label || '无文件夹'}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <Link href="/">
                                    <Button type="button" variant="outline">
                                        取消
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    {processing ? '保存中...' : '保存修改'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <CategoryDialog
                open={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
                onSuccess={handleCategoryCreated}
            />
        </DashboardLayout>
    );
}
