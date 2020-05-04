import {Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne} from "typeorm";
import {UserAccount}                                                             from "./UserAccount";
import {UserRole}                                                                from "./UserRole";

@Entity()
export class User
{

	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	firstName: string;

	@Column()
	midName: string;

	@Column()
	lastName: string;

	@Column()
	userAccountId: number;

	@Column()
	userRoleId: number;

	@OneToOne(() => UserAccount, {cascade: true, lazy: true})
	@JoinColumn({name: "userAccountId"})
	userAccount: UserAccount;

	@ManyToOne(() => UserRole, {cascade: true, lazy: true})
	@JoinColumn({name: "userRoleId"})
	userRole: UserRole;
}