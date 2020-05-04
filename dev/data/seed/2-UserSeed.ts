import {randomBytes, scryptSync} from "crypto";
import {Connection}              from "typeorm"
import {Factory, Seeder, define} from "typeorm-seeding"
import {UserAccount}             from "../../entity/UserAccount";
import {UserRole}                from "../../entity/UserRole"
import {User}                    from "../../entity/User"

define(User, (faker, context) =>
{
	let user = new User();

	let gender = faker.random.number(1);

	user.firstName = faker.name.firstName(gender);
	user.midName = faker.name.firstName(gender);
	user.lastName = faker.name.lastName(gender);

	return user;
});

define(UserAccount, (faker, context: User) =>
{
	let user = new UserAccount();

	user.login = faker.internet.userName(context.firstName, context.lastName);

	const salt = randomBytes(16).toString("hex");
	const key = scryptSync(faker.internet.password(10), salt, 32);

	user.passHash = key.toString("hex");
	user.salt = salt;

	return user;
});

export default class UserSeed implements Seeder
{
	public async run(factory: Factory, connection: Connection): Promise<any>
	{
		const createdUsers = await factory(User)()
			.map(async user =>
			{
				user.userAccount = await factory(UserAccount)(user).create();
				user.userRole = await connection.getRepository(UserRole).findOne({name: "User"});

				return user;
			})
			.createMany(100)
		;
	}
}