<?php

use think\migration\Migrator;
use think\migration\db\Column;
use Phinx\Db\Adapter\MysqlAdapter;

class CreateJobBatchesTable extends Migrator
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
        $table = $this->table('job_batches', ['engine' => '', 'comment' => '' ,'id' => false ,'primary_key' => ['id']]);
        $table->addColumn('id', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('name', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('total_jobs', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('pending_jobs', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('failed_jobs', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('failed_job_ids', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => false,'signed' => true,'comment' => '',])
			->addColumn('options', 'text', ['limit' => MysqlAdapter::TEXT_MEDIUM,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('cancelled_at', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => true,'signed' => true,'comment' => '',])
			->addColumn('created_at', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('finished_at', 'integer', ['limit' => MysqlAdapter::INT_REGULAR,'null' => true,'signed' => true,'comment' => '',])
            ->create();
    }
}
