<?php

use think\migration\Migrator;
use think\migration\db\Column;
use Phinx\Db\Adapter\MysqlAdapter;

class CreateQueueJobsTable extends Migrator
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
        $table = $this->table('queue_jobs', ['engine' => '', 'comment' => '' ,'id' => 'id' ,'primary_key' => ['id']]);
        $table->addColumn('queue', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('payload', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('job_id', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('attempts', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('reserved_at', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('available_at', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('created_at', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addIndex(['job_id'], ['name' => 'idx_job_id'])
			->addIndex(['queue'], ['name' => 'idx_queue'])
            ->create();
    }
}
