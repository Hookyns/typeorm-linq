import {MigrationInterface, QueryRunner} from "typeorm";

export class UserRoleSysNameNullable1588540662329 implements MigrationInterface {
    name = 'UserRoleSysNameNullable1588540662329'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `user_role` CHANGE `sysName` `sysName` varchar(20) NULL", undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `user_role` CHANGE `sysName` `sysName` varchar(20) NOT NULL", undefined);
    }

}
