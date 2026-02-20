import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Folder } from 'lucide-react';

export default function CategoryDialog({ open, onOpenChange, onSuccess }) {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!name.trim()) {
            setError('请输入文件夹名称');
            return;
        }

        setIsLoading(true);
        setError('');

        fetch('/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
            },
            body: JSON.stringify({ label: name.trim() }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setName('');
                    onSuccess?.(data.category);
                    onOpenChange(false);
                } else {
                    setError(data.message || '创建失败');
                }
            })
            .catch(() => {
                setError('创建失败，请重试');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleClose = () => {
        setName('');
        setError('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Folder className="h-5 w-5 text-blue-500" />
                            新建文件夹
                        </DialogTitle>
                        <DialogDescription>
                            创建一个新的文件夹来组织订阅源
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category-name">文件夹名称</Label>
                            <Input
                                id="category-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="输入文件夹名称"
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-500">{error}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            取消
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? '创建中...' : '创建'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
