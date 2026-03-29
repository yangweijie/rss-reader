<?php

use think\migration\Migrator;
use think\migration\db\Column;
use Phinx\Db\Adapter\MysqlAdapter;

class CreateCacheTable extends Migrator
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
        $table = $this->table('cache', ['engine' => '', 'comment' => '' ,'id' => false ,'primary_key' => ['key']]);
        $table->addColumn('key', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('value', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('expiration', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addIndex(['expiration'], ['name' => 'cache_expiration_index'])
            ->create();
    }
}
