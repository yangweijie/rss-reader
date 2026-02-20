<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Subscription;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CategoryController extends Controller
{
    use AuthorizesRequests;

    /**
     * 获取当前用户的所有分类（树状结构）
     */
    public function index()
    {
        $categories = Category::where('user_id', Auth::id())
            ->with(['children', 'subscriptions'])
            ->whereNull('parent_id')
            ->orderBy('order')
            ->get();

        return response()->json($this->formatTree($categories));
    }

    /**
     * 获取树状结构，包含分类和订阅源
     */
    public function tree()
    {
        $categories = Category::where('user_id', Auth::id())
            ->with(['children.subscriptions', 'subscriptions'])
            ->whereNull('parent_id')
            ->orderBy('order')
            ->get();

        $uncategorizedSubscriptions = Subscription::where('user_id', Auth::id())
            ->whereNull('category_id')
            ->orderBy('title')
            ->get();

        $tree = $this->formatTree($categories);

        if ($uncategorizedSubscriptions->isNotEmpty()) {
            $tree[] = [
                'id' => 'uncategorized',
                'title' => '未分类',
                'icon' => null,
                'isFolder' => true,
                'expanded' => true,
                'children' => $uncategorizedSubscriptions->map(fn($sub) => [
                    'id' => (string) $sub->id,
                    'title' => $sub->title,
                    'url' => $sub->url,
                    'icon' => $sub->icon,
                    'unreadCount' => $sub->unread_count,
                    'isFolder' => false,
                ])->values()->toArray(),
            ];
        }

        return response()->json($tree);
    }

    private function formatTree($categories)
    {
        return $categories->map(function ($category) {
            $children = collect();

            if ($category->children->isNotEmpty()) {
                $children = $children->merge($this->formatTree($category->children));
            }

            if ($category->subscriptions->isNotEmpty()) {
                $subscriptions = $category->subscriptions->map(fn($sub) => [
                    'id' => (string) $sub->id,
                    'title' => $sub->title,
                    'url' => $sub->url,
                    'icon' => $sub->icon,
                    'unreadCount' => $sub->unread_count,
                    'isFolder' => false,
                ]);
                $children = $children->merge($subscriptions);
            }

            return [
                'id' => (string) $category->id,
                'title' => $category->label,
                'icon' => null,
                'isFolder' => true,
                'expanded' => true,
                'children' => $children->values()->toArray(),
            ];
        })->values()->toArray();
    }

    /**
     * 创建新分类
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        if (!empty($validated['parent_id'])) {
            $parent = Category::where('user_id', Auth::id())
                ->where('id', $validated['parent_id'])
                ->first();

            if (!$parent) {
                // 如果是 Inertia 请求，返回重定向带错误
                if ($request->header('X-Inertia')) {
                    return back()->withErrors(['label' => '父分类不存在']);
                }
                // 如果是普通请求，返回 JSON
                return response()->json(['success' => false, 'message' => '父分类不存在'], 400);
            }
        }

        $maxOrder = Category::where('user_id', Auth::id())
            ->where('parent_id', $validated['parent_id'] ?? null)
            ->max('order') ?? 0;

        $category = Category::create([
            'label' => $validated['label'],
            'parent_id' => $validated['parent_id'] ?? null,
            'user_id' => Auth::id(),
            'order' => $maxOrder + 1,
        ]);

        // 判断是否是 Inertia 请求
        if ($request->header('X-Inertia')) {
            // Inertia 请求，返回重定向
            return back()->with('success', '分类创建成功');
        }

        // 普通 fetch 请求，返回 JSON
        return response()->json([
            'success' => true,
            'category' => [
                'id' => $category->id,
                'label' => $category->label,
                'parent_id' => $category->parent_id,
            ],
        ]);
    }

    /**
     * 更新分类
     */
    public function update(Request $request, Category $category)
    {
        $this->authorize('update', $category);

        $validated = $request->validate([
            'label' => 'sometimes|required|string|max:255',
        ]);

        $category->update($validated);

        return back()->with('success', '分类更新成功');
    }

    /**
     * 删除分类
     */
    public function destroy(Category $category)
    {
        $this->authorize('delete', $category);

        Subscription::where('category_id', $category->id)
            ->update(['category_id' => null]);

        $childIds = $this->getAllChildIds($category);
        Subscription::whereIn('category_id', $childIds)
            ->update(['category_id' => null]);

        $category->delete();

        return back()->with('success', '分类已删除');
    }

    private function getAllChildIds(Category $category)
    {
        $ids = [];
        foreach ($category->children as $child) {
            $ids[] = $child->id;
            $ids = array_merge($ids, $this->getAllChildIds($child));
        }
        return $ids;
    }

    /**
     * 移动分类（改变父级或排序）
     */
    public function move(Request $request, Category $category)
    {
        $this->authorize('update', $category);

        $validated = $request->validate([
            'parent_id' => 'nullable|exists:categories,id',
            'order' => 'sometimes|integer|min:0',
        ]);

        if (!empty($validated['parent_id']) && $validated['parent_id'] == $category->id) {
            return back()->withErrors(['parent_id' => '不能将自己设为父分类']);
        }

        if (!empty($validated['parent_id'])) {
            $parent = Category::where('user_id', Auth::id())
                ->where('id', $validated['parent_id'])
                ->first();
            
            if (!$parent) {
                return back()->withErrors(['parent_id' => '父分类不存在']);
            }
        }

        $category->update($validated);

        return back()->with('success', '分类移动成功');
    }
}
