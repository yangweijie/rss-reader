<?php
declare(strict_types=1);

namespace app\controller\api;

use app\domain\ArticleDto;
use app\domain\TagArticleDto;
use app\domain\FeedArticleDto;
use app\domain\PageDto;
use app\model\Article;
use app\model\Subscription;
use app\model\ArticleTags;
use app\model\Tag;
use bigDream\thinkJump\Jump;
use think\Request;

class Articles
{
    // 用户全部订阅源文章列表
    public function all(Request $request)
    {
        $dto = new PageDto($request->get());
        $keyword = $request->get("keyword", "");
        $unread = $request->get("unread", "");

        $feedIds = Subscription::where("user_id", $request->uid)->column("id");

        if (empty($feedIds)) {
            return Jump::returnResponse()->result(
                [
                    "list" => [],
                    "total" => 0,
                    "page" => $dto->page,
                    "page_size" => $dto->page_size,
                ],
                "success",
                "获取成功",
            );
        }

        $query = Article::whereIn("articles.feed_id", $feedIds)->withJoin(
            ["feed" => ["id", "title"]],
            "LEFT",
        );

        // 搜索关键词
        if ($keyword) {
            $query->where(function ($q) use ($keyword) {
                $q->whereLike("articles.title", "%{$keyword}%")->whereOr(
                    "articles.content",
                    "like",
                    "%{$keyword}%",
                );
            });
        }

        // 只看未读
        if ($unread === "1") {
            $query->where("articles.read", 0);
        }

        $query->order("articles.published_at", "desc");

        $total = $query->count();
        $list = $query->page($dto->page, $dto->page_size)->select()->toArray();

        return Jump::returnResponse()->result(
            [
                "list" => $list,
                "total" => $total,
                "page" => $dto->page,
                "page_size" => $dto->page_size,
            ],
            "success",
            "获取成功",
        );
    }

    // 用户稍后阅读的文章列表
    public function stars(Request $request)
    {
        $dto = new PageDto($request->get());
        $keyword = $request->get("keyword", "");

        $feedIds = Subscription::where("user_id", $request->uid)->column("id");

        if (empty($feedIds)) {
            return Jump::returnResponse()->result(
                [
                    "list" => [],
                    "total" => 0,
                    "page" => $dto->page,
                    "page_size" => $dto->page_size,
                ],
                "success",
                "获取成功",
            );
        }

        $query = Article::whereIn("feed_id", $feedIds)->where("favorite", 1);

        // 搜索关键词
        if ($keyword) {
            $query->where(function ($q) use ($keyword) {
                $q->whereLike("title", "%{$keyword}%")->whereOr(
                    "content",
                    "like",
                    "%{$keyword}%",
                );
            });
        }

        $query->order("published_at", "desc");

        $total = $query->count();
        $list = $query->page($dto->page, $dto->page_size)->select()->toArray();

        return Jump::returnResponse()->result(
            [
                "list" => $list,
                "total" => $total,
                "page" => $dto->page,
                "page_size" => $dto->page_size,
            ],
            "success",
            "获取成功",
        );
    }

    // 用户收藏文章
    public function star(Request $request)
    {
        $dto = new ArticleDto($request->post());

        try {
            $dto->validate("star");
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        $article = Article::find($dto->article_id);

        if (!$article) {
            return Jump::returnResponse()->error("文章不存在");
        }

        // 验证文章是否属于当前用户
        $feed = Subscription::find($article->feed_id);
        if (!$feed || $feed->user_id != $request->uid) {
            return Jump::returnResponse()->error("无权限操作");
        }

        $article->favorite = 1;
        $article->save();

        return Jump::returnResponse()->success("收藏成功");
    }

    // 用户取消收藏文章
    public function unstar(Request $request)
    {
        $dto = new ArticleDto($request->post());

        try {
            $dto->validate("unstar");
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        $article = Article::find($dto->article_id);

        if (!$article) {
            return Jump::returnResponse()->error("文章不存在");
        }

        // 验证文章是否属于当前用户
        $feed = Subscription::find($article->feed_id);
        if (!$feed || $feed->user_id != $request->uid) {
            return Jump::returnResponse()->error("无权限操作");
        }

        $article->favorite = 0;
        $article->save();

        return Jump::returnResponse()->success("取消收藏成功");
    }

    // 用户标签下的文章
    public function listByTag(Request $request)
    {
        $dto = new TagArticleDto($request->get());
        $keyword = $request->get("keyword", "");
        $unread = $request->get("unread", "");

        try {
            $dto->validate("listByTag");
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        // 验证标签属于当前用户
        $tag = \app\model\Tag::where("id", $dto->tag_id)
            ->where("user_id", $request->uid)
            ->find();

        if (!$tag) {
            return Jump::returnResponse()->error("标签不存在");
        }

        $articleIds = ArticleTags::where("tag_id", $dto->tag_id)->column(
            "article_id",
        );

        if (empty($articleIds)) {
            return Jump::returnResponse()->result(
                [
                    "list" => [],
                    "total" => 0,
                    "page" => $dto->page,
                    "page_size" => $dto->page_size,
                ],
                "success",
                "获取成功",
            );
        }

        $query = Article::whereIn("id", $articleIds);

        // 搜索关键词
        if ($keyword) {
            $query->where(function ($q) use ($keyword) {
                $q->whereLike("title", "%{$keyword}%")->whereOr(
                    "content",
                    "like",
                    "%{$keyword}%",
                );
            });
        }

        // 只看未读
        if ($unread === "1") {
            $query->where("read", 0);
        }

        $query->order("published_at", "desc");

        $total = $query->count();
        $list = $query->page($dto->page, $dto->page_size)->select()->toArray();

        return Jump::returnResponse()->result(
            [
                "list" => $list,
                "total" => $total,
                "page" => $dto->page,
                "page_size" => $dto->page_size,
            ],
            "success",
            "获取成功",
        );
    }

    // 用户订阅源下的文章列表
    public function listByFeed(Request $request)
    {
        $dto = new FeedArticleDto($request->get());
        $keyword = $request->get("keyword", "");
        $unread = $request->get("unread", "");

        try {
            $dto->validate("listByFeed");
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        // 验证订阅源属于当前用户
        $feed = Subscription::where("id", $dto->feed_id)
            ->where("user_id", $request->uid)
            ->find();

        if (!$feed) {
            return Jump::returnResponse()->error("订阅源不存在");
        }

        $query = Article::where("feed_id", $dto->feed_id);

        // 搜索关键词
        if ($keyword) {
            $query->where(function ($q) use ($keyword) {
                $q->whereLike("title", "%{$keyword}%")->whereOr(
                    "content",
                    "like",
                    "%{$keyword}%",
                );
            });
        }

        // 只看未读
        if ($unread === "1") {
            $query->where("read", 0);
        }

        $query->order("published_at", "desc");

        $total = $query->count();
        $list = $query->page($dto->page, $dto->page_size)->select()->toArray();

        return Jump::returnResponse()->result(
            [
                "list" => $list,
                "total" => $total,
                "page" => $dto->page,
                "page_size" => $dto->page_size,
            ],
            "success",
            "获取成功",
        );
    }

    // 标记文章已读
    public function read(Request $request)
    {
        $dto = new ArticleDto($request->post());

        try {
            $dto->validate("read");
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        $article = Article::find($dto->article_id);

        if (!$article) {
            return Jump::returnResponse()->error("文章不存在");
        }

        $feed = Subscription::find($article->feed_id);
        if (!$feed || $feed->user_id != $request->uid) {
            return Jump::returnResponse()->error("无权限操作");
        }

        $article->read = 1;
        $article->save();

        return Jump::returnResponse()->success("标记已读成功");
    }

    // 取消文章已读
    public function unread(Request $request)
    {
        $dto = new ArticleDto($request->post());

        try {
            $dto->validate("read");
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        $article = Article::find($dto->article_id);

        if (!$article) {
            return Jump::returnResponse()->error("文章不存在");
        }

        $feed = Subscription::find($article->feed_id);
        if (!$feed || $feed->user_id != $request->uid) {
            return Jump::returnResponse()->error("无权限操作");
        }

        $article->read = 0;
        $article->save();

        return Jump::returnResponse()->success("取消已读成功");
    }

    // 标记以上文章已读
    public function readAbove(Request $request)
    {
        $articleId = $request->post("article_id");

        if (!$articleId) {
            return Jump::returnResponse()->error("文章ID不能为空");
        }

        $article = Article::find($articleId);

        if (!$article) {
            return Jump::returnResponse()->error("文章不存在");
        }

        $feed = Subscription::find($article->feed_id);
        if (!$feed || $feed->user_id != $request->uid) {
            return Jump::returnResponse()->error("无权限操作");
        }

        // 标记该文章及之前的所有文章为已读
        $feedIds = Subscription::where("user_id", $request->uid)->column("id");
        Article::whereIn("feed_id", $feedIds)
            ->where("published_at", "<=", $article->published_at)
            ->where("read", 0)
            ->update(["read" => 1]);

        return Jump::returnResponse()->success("标记已读成功");
    }

    // 为文章添加标签
    public function addTag(Request $request)
    {
        $articleId = $request->post("article_id");
        $tagId = $request->post("tag_id");

        if (!$articleId || !$tagId) {
            return Jump::returnResponse()->error("参数不完整");
        }

        $article = Article::find($articleId);
        if (!$article) {
            return Jump::returnResponse()->error("文章不存在");
        }

        $feed = Subscription::find($article->feed_id);
        if (!$feed || $feed->user_id != $request->uid) {
            return Jump::returnResponse()->error("无权限操作");
        }

        // 验证标签属于当前用户
        $tag = \app\model\Tag::where("id", $tagId)
            ->where("user_id", $request->uid)
            ->find();
        if (!$tag) {
            return Jump::returnResponse()->error("标签不存在");
        }

        // 检查是否已关联
        $exists = ArticleTags::where("article_id", $articleId)
            ->where("tag_id", $tagId)
            ->find();

        if ($exists) {
            return Jump::returnResponse()->error("已添加该标签");
        }

        $articleTag = new ArticleTags();
        $articleTag->article_id = $articleId;
        $articleTag->tag_id = $tagId;
        $articleTag->user_id = $request->uid;
        $articleTag->save();

        return Jump::returnResponse()->success("添加标签成功");
    }

    // 移除文章标签
    public function removeTag(Request $request)
    {
        $articleId = $request->post("article_id");
        $tagId = $request->post("tag_id");

        if (!$articleId || !$tagId) {
            return Jump::returnResponse()->error("参数不完整");
        }

        ArticleTags::where("article_id", $articleId)
            ->where("tag_id", $tagId)
            ->delete();

        return Jump::returnResponse()->success("移除标签成功");
    }

    // 分类下的文章列表
    public function listByCategory(Request $request)
    {
        $categoryId = $request->get("category_id");
        $keyword = $request->get("keyword", "");
        $unread = $request->get("unread", "");
        $page = (int) $request->get("page", 1);
        $pageSize = (int) $request->get("page_size", 20);

        if (!$categoryId) {
            return Jump::returnResponse()->error("分类ID不能为空");
        }

        // 获取该分类下的订阅源ID
        $feedIds = Subscription::where("user_id", $request->uid)
            ->where("category_id", $categoryId)
            ->column("id");

        if (empty($feedIds)) {
            return Jump::returnResponse()->result(
                [
                    "list" => [],
                    "total" => 0,
                    "page" => $page,
                    "page_size" => $pageSize,
                ],
                "success",
                "获取成功",
            );
        }

        $query = Article::whereIn("feed_id", $feedIds);

        // 搜索关键词
        if ($keyword) {
            $query->where(function ($q) use ($keyword) {
                $q->whereLike("title", "%{$keyword}%")->whereOr(
                    "content",
                    "like",
                    "%{$keyword}%",
                );
            });
        }

        // 只看未读
        if ($unread === "1") {
            $query->where("read", 0);
        }

        $query->order("published_at", "desc");

        $total = $query->count();
        $list = $query->page($page, $pageSize)->select()->toArray();

        return Jump::returnResponse()->result(
            [
                "list" => $list,
                "total" => $total,
                "page" => $page,
                "page_size" => $pageSize,
            ],
            "success",
            "获取成功",
        );
    }

    // 文章详情
    public function info(Request $request)
    {
        $articleId = $request->get("id");

        if (!$articleId) {
            return Jump::returnResponse()->error("文章ID不能为空");
        }

        // 获取用户的订阅源ID
        $feedIds = Subscription::where("user_id", $request->uid)->column("id");

        if (empty($feedIds)) {
            return Jump::returnResponse()->error("文章不存在");
        }

        // 查询文章
        $article = Article::where("id", $articleId)
            ->whereIn("feed_id", $feedIds)
            ->find();

        if (!$article) {
            return Jump::returnResponse()->error("文章不存在");
        }

        // 获取文章标签
        $tagIds = ArticleTags::where("article_id", $articleId)->column(
            "tag_id",
        );
        $tags = [];
        if (!empty($tagIds)) {
            $tags = Tag::whereIn("id", $tagIds)
                ->where("user_id", $request->uid)
                ->select()
                ->toArray();
        }

        // 添加标签到文章数据
        $articleData = $article->toArray();
        $articleData["tags"] = $tags;

        return Jump::returnResponse()->result(
            [
                "article" => $articleData,
            ],
            "success",
            "获取成功",
        );
    }
}
