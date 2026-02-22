<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Category;
use App\Models\Subscription;
use App\Models\Tag;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ArticleController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $perPage = 30;

        $query = Article::where('user_id', Auth::id())
            ->with('feed:id,title,icon,url,updated_at', 'tags:id,name,color');

        // 当指定订阅源时，未读文章排在前面
        if ($request->has('feed_id') && $request->feed_id) {
            $query->where('feed_id', $request->feed_id)
                  ->orderBy('read', 'asc')
                  ->orderBy('published_at', 'desc');
        } else {
            $query->orderBy('published_at', 'desc');
        }

        if ($request->has('tag_id') && $request->tag_id) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('tags.id', $request->tag_id);
            });
        }

        if ($request->has('filter') && $request->filter) {
            switch ($request->filter) {
                case 'unread':
                    $query->where('read', false);
                    break;
                case 'read':
                    $query->where('read', true);
                    break;
                case 'favorite':
                    $query->where('favorite', true);
                    break;
            }
        }

        // 搜索功能
        if ($request->has('search') && $request->search) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('content', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('excerpt', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('author', 'LIKE', "%{$searchTerm}%");
            });
        }

        $articles = $query->paginate($perPage)->through(function ($article) {
            $article->excerpt = strip_tags($article->excerpt);
            // 搜索时高亮匹配内容
            if (request()->search) {
                $article->highlight = $this->highlightText($article->excerpt ?? '', request()->search);
            }
            return $article;
        });

        $subscriptions = Subscription::where('user_id', Auth::id())
            ->select('id', 'title', 'icon', 'url', 'unread_count', 'error_message', 'last_error_at', 'category_id')
            ->orderBy('title')
            ->get();

        $tags = Tag::where('user_id', Auth::id())
            ->orderBy('name')
            ->get();

        $categories = Category::where('user_id', Auth::id())
            ->orderBy('order')
            ->orderBy('label')
            ->get();

        // 如果是 AJAX 请求，返回 JSON
        if ($request->ajax() || $request->wantsJson()) {
            return response()->json([
                'articles' => $articles,
                'filters' => [
                    'feed_id' => $request->feed_id,
                    'tag_id' => $request->tag_id,
                    'filter' => $request->filter ?? 'all',
                    'search' => $request->search,
                ],
            ]);
        }

        return Inertia::render('Articles/Index', [
            'articles' => $articles,
            'subscriptions' => $subscriptions,
            'categories' => $categories,
            'tags' => $tags,
            'allTags' => $tags,
            'filters' => [
                'feed_id' => $request->feed_id,
                'tag_id' => $request->tag_id,
                'filter' => $request->filter ?? 'all',
                'search' => $request->search,
            ],
        ]);
    }

    /**
     * 高亮搜索文本
     */
    private function highlightText($text, $search)
    {
        if (empty($search) || empty($text)) {
            return $text;
        }

        $pattern = '/(' . preg_quote($search, '/') . ')/i';
        return preg_replace($pattern, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>', $text);
    }

    /**
     * 智能搜索 - 使用全文搜索（如果可用）
     */
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2',
        ]);

        $searchTerm = $request->q;
        $perPage = $request->per_page ?? 30;

        // 尝试使用 SQLite FTS5 全文搜索
        try {
            $results = $this->fullTextSearch($searchTerm, $perPage);
        } catch (\Exception $e) {
            // Fallback to LIKE search
            $results = $this->likeSearch($searchTerm, $perPage);
        }

        return response()->json($results);
    }

    /**
     * 全文搜索 (SQLite FTS5)
     */
    private function fullTextSearch($searchTerm, $perPage)
    {
        $userId = Auth::id();
        
        // 构建搜索查询
        $articles = Article::where('user_id', $userId)
            ->whereRaw("title LIKE ? OR content LIKE ? OR excerpt LIKE ?", 
                ["%{$searchTerm}%", "%{$searchTerm}%", "%{$searchTerm}%"])
            ->with('feed:id,title,icon,url,updated_at', 'tags:id,name,color')
            ->orderBy('published_at', 'desc')
            ->paginate($perPage);

        return $articles;
    }

    /**
     * LIKE 搜索 (Fallback)
     */
    private function likeSearch($searchTerm, $perPage)
    {
        $userId = Auth::id();

        $articles = Article::where('user_id', $userId)
            ->where(function ($query) use ($searchTerm) {
                $query->where('title', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('content', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('excerpt', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('author', 'LIKE', "%{$searchTerm}%");
            })
            ->with('feed:id,title,icon,url,updated_at', 'tags:id,name,color')
            ->orderBy('published_at', 'desc')
            ->paginate($perPage);

        return $articles;
    }

    public function show(Request $request, Article $article)
    {
        $this->authorize('view', $article);

        $article->update(['read' => true]);

        $article->load('feed', 'tags');

        // 如果是 JSON 请求，返回 JSON 数据
        if ($request->wantsJson()) {
            return response()->json([
                'article' => $article
            ]);
        }

        $tags = Tag::where('user_id', Auth::id())
            ->orderBy('name')
            ->get();

        return Inertia::render('Articles/Show', [
            'article' => $article,
            'tags' => $tags,
        ]);
    }

    public function markAsRead(Article $article)
    {
        $this->authorize('update', $article);

        $article->update(['read' => true]);

        $this->updateSubscriptionUnreadCount($article->feed_id);

        return response()->json(['success' => true, 'read' => true]);
    }

    public function markAsUnread(Article $article)
    {
        $this->authorize('update', $article);

        $article->update(['read' => false]);

        $this->updateSubscriptionUnreadCount($article->feed_id);

        return response()->json(['success' => true, 'read' => false]);
    }

    public function toggleFavorite(Article $article)
    {
        $this->authorize('update', $article);

        $article->update(['favorite' => !$article->favorite]);

        return response()->json(['success' => true, 'favorite' => $article->favorite]);
    }

    public function batchMarkAsRead(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:articles,id',
        ]);

        $affectedFeedIds = Article::where('user_id', Auth::id())
            ->whereIn('id', $validated['ids'])
            ->where('read', false)
            ->pluck('feed_id')
            ->unique()
            ->toArray();

        Article::where('user_id', Auth::id())
            ->whereIn('id', $validated['ids'])
            ->update(['read' => true]);

        foreach ($affectedFeedIds as $feedId) {
            $this->updateSubscriptionUnreadCount($feedId);
        }

        return back()->with('success', '已批量标记为已读');
    }

    public function setTags(Request $request, Article $article)
    {
        $this->authorize('update', $article);

        $validated = $request->validate([
            'tag_ids' => 'array',
            'tag_ids.*' => 'exists:tags,id',
        ]);

        $syncData = [];
        foreach ($validated['tag_ids'] ?? [] as $tagId) {
            $syncData[$tagId] = ['user_id' => Auth::id()];
        }
        $article->tags()->sync($syncData);

        return back()->with('success', '标签已更新');
    }

    public function attachTag(Request $request, Article $article, Tag $tag)
    {
        $this->authorize('update', $article);

        if ($tag->user_id !== Auth::id()) {
            abort(403);
        }

        // 检查标签是否已经关联到文章
        if ($article->tags()->where('tag_id', $tag->id)->exists()) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => '标签已添加'
                ]);
            }
            return back()->with('info', '标签已添加');
        }

        $article->tags()->attach($tag->id, ['user_id' => Auth::id()]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => '标签已添加'
            ]);
        }

        return back()->with('success', '标签已添加');
    }

    public function detachTag(Request $request, Article $article, Tag $tag)
    {
        $this->authorize('update', $article);

        if ($tag->user_id !== Auth::id()) {
            abort(403);
        }

        $article->tags()->detach($tag->id);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => '标签已移除'
            ]);
        }

        return back()->with('success', '标签已移除');
    }

    private function updateSubscriptionUnreadCount($feedId)
    {
        if (!$feedId) return;

        $count = Article::where('feed_id', $feedId)
            ->where('user_id', Auth::id())
            ->where('read', false)
            ->count();

        Subscription::where('id', $feedId)
            ->where('user_id', Auth::id())
            ->update(['unread_count' => $count]);
    }
}
