<?php

use think\migration\Migrator;
use think\migration\db\Column;
use Phinx\Db\Adapter\MysqlAdapter;

class AddGuidToArticlesTable extends Migrator
{
    /**
     * Change Method.
     *
     * 为 articles 表添加 guid 字段，用于存储文章唯一标识符
     * 避免RSS刷新时文章重复插入
     */
    public function change()
    {
        $table = $this->table('articles');
        
        // 添加 guid 字段
        $table->addColumn('guid', 'string', [
            'limit' => 255,
            'null' => false,
            'default' => '',
            'comment' => '文章唯一标识符',
            'after' => 'feed_id',
        ])
        ->addIndex(['feed_id', 'guid'], ['name' => 'idx_articles_feed_guid'])
        ->update();
    }
}