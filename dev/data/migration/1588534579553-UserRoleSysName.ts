import {MigrationInterface, QueryRunner} from "typeorm";

export class UserRoleSysName1588534579553 implements MigrationInterface {
    name = 'UserRoleSysName1588534579553'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `user_role` ADD `sysName` varchar(20) NOT NULL", undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `user_role` DROP COLUMN `sysName`", undefined);
    }

}
