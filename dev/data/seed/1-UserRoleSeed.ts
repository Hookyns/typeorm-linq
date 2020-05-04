import {Connection}       from "typeorm"
import {Factory, Seeder}  from "typeorm-seeding"
import {UserRole}         from "../../entity/UserRole"
import {UserRoleSysNames} from "../../entity/UserRoleSysNames";

export default class UserRoleSeed implements Seeder
{
	public async run(factory: Factory, connection: Connection): Promise<any>
	{
		await connection.query(`DELETE FROM ${connection.getMetadata(UserRole).tableName}`);

		await connection
			.createQueryBuilder()
			.insert()
			.into(UserRole)
			.values([
				{name: "Admin", sysName: UserRoleSysNames.Admin},
				{name: "Guest", sysName: UserRoleSysNames.Guest},
				{name: "User"},
			])
			.execute()
	}
}