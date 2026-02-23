import { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Folder, Plus } from 'lucide-react';

export default function SubscriptionCreate({ category, categories }) {
    const { url: currentUrl } = usePage();
    const urlParams = new URLSearchParams(currentUrl.split('?')[1]);
    const categoryId = urlParams.get('category_id');

    const [formData, setFormData] = useState({
        url: '',
        title: '',
        category_id: categoryId || ''
    });

    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [localCategories, setLocalCategories] = useState(categories);
    const [errors, setErrors] = useState({});
    const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
    const [selectKey, setSelectKey] = useState(0); // 强制重新渲染 Select

    // 当 category_id 变化时，同步更新 formData
    useEffect(() => {
        setFormData(prev => ({ ...prev, category_id: selectedCategoryId }));
    }, [selectedCategoryId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            category_id: formData.category_id === 'none' ? null : formData.category_id
        };
        router.post('/subscriptions', submitData, {
            onSuccess: () => {
                setFormData({ url: '', title: '', category_id: categoryId || '' });
                setErrors({});
            },
            onError: (pageErrors) => {
                setErrors(pageErrors);
            },
        });
    };

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;

        // 检查名称是否重复
        const isDuplicate = localCategories.some(cat => 
            cat.label.toLowerCase() === newFolderName.trim().toLowerCase()
        );
        
        if (isDuplicate) {
            alert('文件夹名称已存在');
            return;
        }

        fetch('/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
            },
            body: JSON.stringify({ label: newFolderName })
        })
        .then(res => res.json())
        .then(data => {
            console.log('创建文件夹返回数据:', data);
            if (data.category?.id || data.id) {
                const categoryId = data.category?.id || data.id;
                const categoryLabel = data.category?.label || data.label || newFolderName;
                const newCategory = { id: categoryId, label: categoryLabel, parent_id: null };
                console.log('新文件夹对象:', newCategory);
                console.log('更新后的分类列表:', [...localCategories, newCategory]);
                console.log('设置的 category_id:', String(categoryId));
                setLocalCategories([...localCategories, newCategory]);
                setNewFolderName('');
                setShowNewFolderDialog(false);
                // 强制重新渲染 Select 组件
                setSelectKey(prev => prev + 1);
                // 延迟设置选中的文件夹，确保 DOM 已更新
                setTimeout(() => {
                    setSelectedCategoryId(String(categoryId));
                    console.log('延迟设置后的 selectedCategoryId:', String(categoryId));
                }, 0);
                // 刷新侧边栏数据
                router.reload({ only: ['categories'] });
            }
        })
        .catch(err => console.error('Failed to create folder:', err));
    };

    return (
        <DashboardLayout>
            <Head title="添加订阅源" />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/articles">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">添加订阅源</h2>
                        <p className="text-muted-foreground">添加新的 RSS 订阅源</p>
                    </div>
                </div>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>订阅源信息</CardTitle>
                        <CardDescription>
                            请填写订阅源的 RSS 链接和标题
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label>所属文件夹</Label>
                                <div className="flex gap-2">
                                    <Select 
                                        key={selectKey}
                                        value={selectedCategoryId} 
                                        onValueChange={(value) => {
                                            console.log('Select onValueChange:', value);
                                            setSelectedCategoryId(value);
                                        }}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="选择文件夹（可选）" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">无文件夹</SelectItem>
                                            {localCategories.map((cat) => (
                                                <SelectItem key={cat.id} value={String(cat.id)}>
                                                    {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="icon"
                                        onClick={() => setShowNewFolderDialog(true)}
                                        title="新建文件夹"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {formData.category_id && (
                                    <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                                        <Folder className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">将添加到:</span>
                                        <span className="font-medium">
                                            {localCategories.find(c => String(c.id) === formData.category_id)?.label || category?.label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="url">RSS 链接</Label>
                                <Input
                                    id="url"
                                    type="url"
                                    placeholder="https://example.com/rss"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    required
                                />
                                <p className="text-sm text-muted-foreground">
                                    请输入完整的 RSS 或 Atom feed 链接
                                </p>
                                {errors.url && (
                                    <p className="text-sm text-red-500">{errors.url}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">标题</Label>
                                <Input
                                    id="title"
                                    placeholder="留空则自动从 RSS 获取标题"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                                <p className="text-sm text-muted-foreground">
                                    为订阅源起一个易于识别的名称（留空则自动从 RSS 获取）
                                </p>
                                {errors.title && (
                                    <p className="text-sm text-red-500">{errors.title}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <Button type="submit">
                                    创建订阅源
                                </Button>
                                <Link href="/articles">
                                    <Button type="button" variant="outline">
                                        取消
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新建文件夹</DialogTitle>
                        <DialogDescription>
                            创建一个新文件夹来组织订阅源
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="folderName">文件夹名称</Label>
                            <Input
                                id="folderName"
                                placeholder="输入文件夹名称"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                            取消
                        </Button>
                        <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                            创建
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}