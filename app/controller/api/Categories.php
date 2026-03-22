<?php
declare(strict_types=1);

namespace app\controller\api;

use app\domain\CategoryDto;
use app\model\Category;
use app\model\Subscription;
use bigDream\thinkJump\Jump;
use think\Request;

class Categories
{
    // 用户分类列表
    public function list(Request $request)
    {
        $categories = Category::where('user_id', $request->uid)
            ->order('order', 'asc')
            ->select();

        // 获取每个分类的订阅源数量和未读文章数
        foreach ($categories as $category) {
            $feedIds = Subscription::where('user_id', $request->uid)
                ->where('category_id', $category->id)
                ->column('id');
            
            $category->feed_count = count($feedIds);
            $category->unread_count = \app\model\Article::whereIn('feed_id', $feedIds)
                ->where('read', 0)
                ->count();
        }

        return Jump::returnResponse()->result([
            'list' => $categories,
        ], 'success', '获取成功');
    }

    // 添加分类
    public function add(Request $request)
    {
        $name = $request->post('name');
        
        if (!$name) {
            return Jump::returnResponse()->error('分类名称不能为空');
        }

        // 检查是否已存在
        $exists = Category::where('user_id', $request->uid)
            ->where('label', $name)
            ->find();
        
        if ($exists) {
            return Jump::returnResponse()->error('分类已存在');
        }

        $category = new Category();
        $category->user_id = $request->uid;
        $category->label = $name;
        $category->order = 0;
        $category->save();

        return Jump::returnResponse()->result([
            'category' => $category,
        ], 'success', '添加成功');
    }

    // 编辑分类（重命名）
    public function edit(Request $request)
    {
        $categoryId = $request->post('category_id');
        $name = $request->post('name');
        
        if (!$categoryId || !$name) {
            return Jump::returnResponse()->error('参数不完整');
        }

        $category = Category::where('id', $categoryId)
            ->where('user_id', $request->uid)
            ->find();

        if (!$category) {
            return Jump::returnResponse()->error('分类不存在');
        }

        // 检查名称是否重复
        $exists = Category::where('user_id', $request->uid)
            ->where('label', $name)
            ->where('id', '<>', $categoryId)
            ->find();
        
        if ($exists) {
            return Jump::returnResponse()->error('分类名称已存在');
        }

        $category->label = $name;
        $category->save();

        return Jump::returnResponse()->success('编辑成功');
    }

    // 删除分类，需要将含分类的订阅源分类重置为0
    public function del(Request $request)
    {
        $dto = new CategoryDto($request->post());
        
        try {
            $dto->validate('del');
        } catch (\Exception $e) {
            return Jump::returnResponse()->error($e->getMessage());
        }

        // 将该分类下的订阅源分类重置为0
        Subscription::where('user_id', $request->uid)
            ->where('category_id', $dto->category_id)
            ->update(['category_id' => 0]);

        // 删除分类记录
        Category::where('id', $dto->category_id)
            ->where('user_id', $request->uid)
            ->delete();

        return Jump::returnResponse()->success('删除成功');
    }

    // 置顶分类
    public function pin(Request $request)
    {
        $categoryId = $request->post('category_id');
        
        if (!$categoryId) {
            return Jump::returnResponse()->error('参数不完整');
        }

        $category = Category::where('id', $categoryId)
            ->where('user_id', $request->uid)
            ->find();

        if (!$category) {
            return Jump::returnResponse()->error('分类不存在');
        }

        // 获取当前最小 order 值
        $minOrder = Category::where('user_id', $request->uid)
            ->min('order') ?? 0;
        
        // 设置为比最小值还小，实现置顶
        $category->order = $minOrder - 1;
        $category->save();

        return Jump::returnResponse()->success('置顶成功');
    }
}