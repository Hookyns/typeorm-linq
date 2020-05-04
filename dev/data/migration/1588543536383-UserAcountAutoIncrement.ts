import {MigrationInterface, QueryRunner} from "typeorm";

export class UserAcountAutoIncrement1588543536383 implements MigrationInterface {
    name = 'UserAcountAutoIncrement1588543536383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `user` DROP FOREIGN KEY `FK_3574ef159f2858d2eb7b9652ceb`", undefined);
        await queryRunner.query("ALTER TABLE `user_account` DROP PRIMARY KEY", undefined);
        await queryRunner.query("ALTER TABLE `user_account` DROP COLUMN `id`", undefined);
        await queryRunner.query("ALTER TABLE `user_account` ADD `id` int NOT NULL PRIMARY KEY AUTO_INCREMENT", undefined);
        await queryRunner.query("ALTER TABLE `user` ADD CONSTRAINT `FK_3574ef159f2858d2eb7b9652ceb` FOREIGN KEY (`userAccountId`) REFERENCES `user_account`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `user` DROP FOREIGN KEY `FK_3574ef159f2858d2eb7b9652ceb`", undefined);
        await queryRunner.query("ALTER TABLE `user_account` DROP COLUMN `id`", undefined);
        await queryRunner.query("ALTER TABLE `user_account` ADD `id` int NOT NULL", undefined);
        await queryRunner.query("ALTER TABLE `user_account` ADD PRIMARY KEY (`id`)", undefined);
        await queryRunner.query("ALTER TABLE `user` ADD CONSTRAINT `FK_3574ef159f2858d2eb7b9652ceb` FOREIGN KEY (`userAccountId`) REFERENCES `user_account`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
    }

}
