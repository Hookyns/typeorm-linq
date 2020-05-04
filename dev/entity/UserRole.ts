import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class UserRole
{
	@PrimaryGeneratedColumn()
	id: number;

	@Column({length: 100})
	name: string;

	@Column({length: 20, nullable: true})
	sysName: string;
}