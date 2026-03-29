<?php

use think\migration\Migrator;
use think\migration\db\Column;
use Phinx\Db\Adapter\MysqlAdapter;

class CreateCategoriesTable extends Migrator
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
        $table = $this->table('categories', ['engine' => '', 'comment' => '' ,'id' => 'id' ,'primary_key' => ['id']]);
        $table->addColumn('user_id', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('label', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('parent_id', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('order', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => 0,'signed' => true,'comment' => '',])
			->addColumn('created_at', 'datetime', ['null' => true,'signed' => true,'comment' => '',])
			->addColumn('updated_at', 'datetime', ['null' => true,'signed' => true,'comment' => '',])
            ->create();
    }
}
