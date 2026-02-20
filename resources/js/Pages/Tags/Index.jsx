import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

export default function TagIndex({ tags }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tagToDelete, setTagToDelete] = useState(null);
    const [formData, setFormData] = useState({ name: '', color: '#3b82f6' });

    const predefinedColors = [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
        '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#000000'
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        router.post('/tags', formData, {
            onSuccess: () => {
                setDialogOpen(false);
                setFormData({ name: '', color: '#3b82f6' });
            },
        });
    };

    const handleDelete = (id) => {
        setTagToDelete(tags.find(t => t.id === id));
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (tagToDelete) {
            router.delete(`/tags/${tagToDelete.id}`, {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setTagToDelete(null);
                },
            });
        }
    };

    return (
        <DashboardLayout>
            <Head title="标签" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">标签</h2>
                        <p className="text-muted-foreground">管理和组织您的标签</p>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                创建标签
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>创建标签</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">标签名称</Label>
                                    <Input
                                        id="name"
                                        placeholder="输入标签名称"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="color">颜色</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="color"
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-20 h-10"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {predefinedColors.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    className={`w-8 h-8 rounded border-2 ${
                                                        formData.color === color
                                                            ? 'border-black dark:border-white'
                                                            : 'border-transparent'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => setFormData({ ...formData, color })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full">
                                    创建
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {tags.map((tag) => (
                        <Card key={tag.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{tag.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            <Badge
                                                variant="secondary"
                                                style={{ backgroundColor: tag.color }}
                                            >
                                                {tag.color}
                                            </Badge>
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.get(`/articles?tag_id=${tag.id}`)}
                                    >
                                        查看文章
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(tag.id)}
                                    >
                                        删除
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {tags.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <p className="text-muted-foreground text-center">
                                还没有标签
                                <br />
                                点击右上角创建您的第一个标签
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* 删除确认对话框 */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl">删除标签"{tagToDelete?.name}"?</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                这将会移除所有属于这个标签的文章。此操作不可撤销。
                            </p>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDeleteDialogOpen(false);
                                    setTagToDelete(null);
                                }}
                            >
                                取消
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                删除
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}