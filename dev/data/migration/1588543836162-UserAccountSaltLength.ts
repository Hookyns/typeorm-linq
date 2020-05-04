import {MigrationInterface, QueryRunner} from "typeorm";

export class UserAccountSaltLength1588543836162 implements MigrationInterface {
    name = 'UserAccountSaltLength1588543836162'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `user_account` DROP COLUMN `salt`", undefined);
        await queryRunner.query("ALTER TABLE `user_account` ADD `salt` varchar(40) NOT NULL", undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `user_account` DROP COLUMN `salt`", undefined);
        await queryRunner.query("ALTER TABLE `user_account` ADD `salt` varchar(30) NOT NULL", undefined);
    }

}
