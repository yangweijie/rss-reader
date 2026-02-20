<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TagController extends Controller
{
    use AuthorizesRequests;
    public function index()
    {
        $tags = Tag::where('user_id', Auth::id())
            ->withCount('articles')
            ->orderBy('name')
            ->get();

        return Inertia::render('Tags/Index', [
            'tags' => $tags,
        ]);
    }

    public function create()
    {
        return Inertia::render('Tags/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:7',
        ]);

        // 检查是否已存在同名标签（不区分大小写）
        // SQLite 不支持 ILIKE，使用 whereRaw 实现
        $existingTag = Tag::where('user_id', Auth::id())
            ->whereRaw('LOWER(name) = LOWER(?)', [$validated['name']])
            ->first();

        if ($existingTag) {
            // 如果是 API 请求，返回已存在的标签
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'tag' => $existingTag,
                    'message' => '标签已存在'
                ]);
            }

            return redirect()->back()
                ->with('error', '标签 "' . $validated['name'] . '" 已存在');
        }

        $tag = Tag::create([
            ...$validated,
            'user_id' => Auth::id(),
        ]);

        // 如果是 API 请求（期望 JSON 响应），返回 JSON
        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'tag' => $tag
            ]);
        }

        return redirect()->route('tags.index')
            ->with('success', '标签已创建');
    }

    public function edit(Tag $tag)
    {
        $this->authorize('update', $tag);

        return Inertia::render('Tags/Edit', [
            'tag' => $tag,
        ]);
    }

    public function update(Request $request, Tag $tag)
    {
        $this->authorize('update', $tag);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:7',
        ]);

        $tag->update($validated);

        return redirect()->route('tags.index')
            ->with('success', '标签已更新');
    }

    public function destroy(Tag $tag)
    {
        $this->authorize('delete', $tag);

        // 移除与所有文章的关联关系
        $tag->articles()->detach();

        $tag->delete();

        return redirect()->route('tags.index')
            ->with('success', '标签已删除');
    }
}
