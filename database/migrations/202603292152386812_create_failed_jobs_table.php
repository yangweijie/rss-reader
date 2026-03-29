<?php

use think\migration\Migrator;
use think\migration\db\Column;
use Phinx\Db\Adapter\MysqlAdapter;

class CreateFailedJobsTable extends Migrator
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
        $table = $this->table('failed_jobs', ['engine' => '', 'comment' => '' ,'id' => 'id' ,'primary_key' => ['id']]);
        $table->addColumn('uuid', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('connection', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('queue', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('payload', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('exception', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('failed_at', 'datetime', ['null' => false,'default' => 'CURRENT_TIMESTAMP','signed' => true,'comment' => '',])
			->addIndex(['uuid'], ['unique' => true,'name' => 'failed_jobs_uuid_unique'])
            ->create();
    }
}
