import {Column, Entity, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import {User}                                             from "./User";

@Entity()
export class UserAccount
{
	@PrimaryGeneratedColumn()
	id: number;

	@Column({length: 30})
	login: string;

	@Column({length: 100})
	passHash: string;

	@Column({length: 40})
	salt: string;

	@OneToOne(() => User, user => user.userAccount)
	user: User;
}