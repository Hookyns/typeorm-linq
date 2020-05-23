import {getConnection}        from "typeorm"
import LinqSelectQueryBuilder from "../src/LinqSelectQueryBuilder";
import {User}                 from "./entity/User";
import {UserAccount}          from "./entity/UserAccount";
import {UserRole}             from "./entity/UserRole";
import {UserRoleSysNames}     from "./entity/UserRoleSysNames";

class Test {
	foo: string;
	bar: number;
	baz: boolean;
}

export const test = <Test>{
	bar: 5,
	baz: false,
	foo: "Hello class initializer"
};

export default class SelectBuilder
{
	async init() {
		let filter = {
			findLastName: "Paul",
			lastNameStarts: "A.*",
			requestedNames: ["Lukas", "Leon", "Paul"]
		};
		
		let field = "lastName";
		
		let users = await new LinqSelectQueryBuilder(getConnection().manager, User)
			.where(user => (user.firstName == "Nash" || user[field] == filter.findLastName) && user!["midName"] != "Carl")
			.getRawMany();
		
		console.log(users);
		
		let users2 = await new LinqSelectQueryBuilder(getConnection().manager, User)
			.where(user => user.firstName.match(filter.lastNameStarts) && user.midName != null)
			.getRawMany();

		console.log(users2);
		
		let users3 = await new LinqSelectQueryBuilder(getConnection().manager, User)
			.where(user => filter.requestedNames.includes(user.firstName) || user.midName.startsWith("A") || user.midName.endsWith("s"))
			.getRawMany();

		console.log(typeof users3[0], users3[0]);
		
		return;
		
		let users20 = await new LinqSelectQueryBuilder(getConnection().manager, User)
			.innerJoin(
				UserAccount, 
				(user, userAccount) => user.userAccountId == userAccount.id,
				(user, userAccount) => ({
					user,
					userAccount
				}))
			.innerJoin(
				UserRole, 
				(x, userRole) => x.user.userRoleId == userRole.id,
				(x, userRole) => ({
					...x,
					userRole
				}))
			.where(x => x.user.firstName.match("A.*") || x.userRole.sysName == UserRoleSysNames.Admin)
			.map(x => ({
				name: x.user.firstName + " " + x.user.lastName,
				login: x.userAccount.login,
				passHash: x.userAccount.passHash,
				salt: x.userAccount.salt
			}))
			.where(x => !!x.name)
			.getMany()
		;
		
	}
}