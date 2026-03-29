<?php

use think\migration\Migrator;
use think\migration\db\Column;
use Phinx\Db\Adapter\MysqlAdapter;

class CreateUsersTable extends Migrator
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
        $table = $this->table('users', ['engine' => '', 'comment' => '' ,'id' => 'id' ,'primary_key' => ['id']]);
        $table->addColumn('name', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('email', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('email_verified_at', 'datetime', ['null' => true,'signed' => true,'comment' => '',])
			->addColumn('password', 'string', ['null' => false,'default' => null,'signed' => true,'comment' => '',])
			->addColumn('remember_token', 'string', ['null' => true,'signed' => true,'comment' => '',])
			->addColumn('created_at', 'datetime', ['null' => true,'signed' => true,'comment' => '',])
			->addColumn('updated_at', 'datetime', ['null' => true,'signed' => true,'comment' => '',])
			->addIndex(['email'], ['unique' => true,'name' => 'users_email_unique'])
            ->create();
    }
}
