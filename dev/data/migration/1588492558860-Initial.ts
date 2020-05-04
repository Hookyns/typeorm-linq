import {MigrationInterface, QueryRunner} from "typeorm";

export class Initial1588492558860 implements MigrationInterface {
    name = 'Initial1588492558860'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `user_account` (`id` int NOT NULL, `login` varchar(30) NOT NULL, `passHash` varchar(100) NOT NULL, `salt` varchar(30) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `user_role` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(100) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `user` (`id` int NOT NULL AUTO_INCREMENT, `firstName` varchar(255) NOT NULL, `midName` varchar(255) NOT NULL, `lastName` varchar(255) NOT NULL, `userAccountId` int NOT NULL, `userRoleId` int NOT NULL, UNIQUE INDEX `REL_3574ef159f2858d2eb7b9652ce` (`userAccountId`), PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("ALTER TABLE `user` ADD CONSTRAINT `FK_3574ef159f2858d2eb7b9652ceb` FOREIGN KEY (`userAccountId`) REFERENCES `user_account`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
		await queryRunner.query("ALTER TABLE `user` ADD CONSTRAINT `FK_72292a143eb57e1189603308430` FOREIGN KEY (`userRoleId`) REFERENCES `user_role`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `user` DROP FOREIGN KEY `FK_72292a143eb57e1189603308430`", undefined);
        await queryRunner.query("ALTER TABLE `user` DROP FOREIGN KEY `FK_3574ef159f2858d2eb7b9652ceb`", undefined);
        await queryRunner.query("DROP INDEX `REL_72292a143eb57e118960330843` ON `user`", undefined);
        await queryRunner.query("DROP INDEX `REL_3574ef159f2858d2eb7b9652ce` ON `user`", undefined);
        await queryRunner.query("DROP TABLE `user`", undefined);
        await queryRunner.query("DROP TABLE `user_role`", undefined);
        await queryRunner.query("DROP TABLE `user_account`", undefined);
    }

}
