<?php
declare(strict_types=1);

namespace app\controller\api;

use app\domain\TagDto;
use app\domain\TagAddDto;
use app\domain\TagEditDto;
use app\model\Tag;
use app\model\ArticleTags;
use bigDream\thinkJump\Jump;
use think\Request;

class Tags
{
    // 显示属于该用户的标签列表
    public function list(Request $request)
    {
        $tags = Tag::where('user_id', $request->uid)
            ->order('id', 'desc')
            ->select();

        // 获取每个标签的文章数量
        foreach ($tags as $tag) {
            $tag->article_count = ArticleTags::where('tag_id', $tag->id)->count();
        }

        return Jump::returnResponse()->result([
            'list' => $tags,
        ], 'success', '获取成功');
    }

    // 添加标签
    public function add(Request $request)
    {
        $dto = new TagAddDto($request->post());
        
        try {
            $dto->validate('add');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        // 检查是否已存在同名标签
        $exists = Tag::where('user_id', $request->uid)
            ->where('name', $dto->name)
            ->find();
        
        if ($exists) {
            return Jump::returnResponse()->error('标签已存在');
        }

        $tag = new Tag();
        $tag->user_id = $request->uid;
        $tag->name = $dto->name;
        $tag->save();

        return Jump::returnResponse()->result([
            'tag' => $tag,
        ], 'success', '添加成功');
    }

    // 编辑标签
    public function edit(Request $request)
    {
        $dto = new TagEditDto($request->post());
        
        try {
            $dto->validate('edit');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        $tag = Tag::where('id', $dto->tag_id)
            ->where('user_id', $request->uid)
            ->find();

        if (!$tag) {
            return Jump::returnResponse()->error('标签不存在');
        }

        // 检查是否已存在同名标签
        $exists = Tag::where('user_id', $request->uid)
            ->where('name', $dto->name)
            ->where('id', '<>', $dto->tag_id)
            ->find();
        
        if ($exists) {
            return Jump::returnResponse()->error('标签名称已存在');
        }

        $tag->name = $dto->name;
        $tag->save();

        return Jump::returnResponse()->success('编辑成功');
    }

    // 将文章标签列表里移除该标签id
    public function del(Request $request)
    {
        $dto = new TagDto($request->post());
        
        try {
            $dto->validate('del');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        $tag = Tag::where('id', $dto->tag_id)
            ->where('user_id', $request->uid)
            ->find();

        if (!$tag) {
            return Jump::returnResponse()->error('标签不存在');
        }

        // 删除文章与标签的关联
        ArticleTags::where('tag_id', $dto->tag_id)->delete();
        
        // 删除标签
        $tag->delete();

        return Jump::returnResponse()->success('删除成功');
    }
}