<?php

use think\migration\Migrator;
use think\migration\db\Column;
use Phinx\Db\Adapter\MysqlAdapter;

class CreateSessionsTable extends Migrator
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
        $table = $this->table('sessions', ['engine' => '', 'comment' => '' ,'id' => false ,'primary_key' => ['id']]);
        $table->addColumn('id', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('user_id', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('ip_address', 'string', ['null' => true,'signed' => true,'comment' => '',])
			->addColumn('user_agent', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('payload', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('last_activity', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addIndex(['last_activity'], ['name' => 'sessions_last_activity_index'])
			->addIndex(['user_id'], ['name' => 'sessions_user_id_index'])
            ->create();
    }
}
