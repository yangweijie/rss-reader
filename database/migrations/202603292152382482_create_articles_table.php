<?php

use think\migration\Migrator;
use think\migration\db\Column;
use Phinx\Db\Adapter\MysqlAdapter;

class CreateArticlesTable extends Migrator
{
    /**
     * Change Method.
     *
     * Write your reversible migrations using this method.
     *
     * More information on writing migrations is available here:
     * http://docs.phinx.org/en/latest/migrations.html#the-abstractmigration-class
     *
     * The following commands can be used in this method and Phinx will
     * automatically reverse them when rolling back:
     *
     *    createTable
     *    renameTable
     *    addColumn
     *    renameColumn
     *    addIndex
     *    addForeignKey
     *
     * Remember to call "create()" or "update()" and NOT "save()" when working
     * with the Table class.
     */
    public function change()
    {
        $table = $this->table('articles', ['engine' => '', 'comment' => '' ,'id' => 'id' ,'primary_key' => ['id']]);
        $table->addColumn('feed_id', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('user_id', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('title', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('content', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('excerpt', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('link', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('author', 'string', ['null' => true,'signed' => true,'comment' => '',])
			->addColumn('published_at', 'datetime', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('read', 'boolean', ['null' => false,'default' => 0,'signed' => true,'comment' => '',])
			->addColumn('favorite', 'boolean', ['null' => false,'default' => 0,'signed' => true,'comment' => '',])
			->addColumn('created_at', 'datetime', ['null' => true,'signed' => true,'comment' => '',])
			->addColumn('updated_at', 'datetime', ['null' => true,'signed' => true,'comment' => '',])
            ->create();
    }
}
