import {ExpressionKind}                   from "js-expr-tree";
import {EntitySchema, SelectQueryBuilder} from "typeorm";
import {ObjectType}                       from "typeorm/common/ObjectType";
import {EntityManager}                    from "typeorm/entity-manager/EntityManager";
import BooleanQueryBuilder                from "./BooleanQueryBuilder";
import {isArrowFunction}                  from "./Helpers";

export default class LinqSelectQueryBuilder<TEntity>
{
	private static readonly mainAlias: string = "__mainEntity";

	private alias: string;

	private mapResultNum: number = 0;

	/**
	 * TypeORM entity manager
	 */
	private readonly manager: EntityManager;

	/**
	 * TypeORM select query builder
	 */
	private readonly builder: SelectQueryBuilder<TEntity>;

	/**
	 * Ctor
	 * @param manager
	 * @param entityType
	 * @param [_alias]
	 */
	constructor(manager: EntityManager, entityType: ObjectType<TEntity> | (() => SelectQueryBuilder<TEntity>), _alias: string = LinqSelectQueryBuilder.mainAlias)
	{
		this.manager = manager;
		this.builder = manager.createQueryBuilder().from(entityType, _alias);
		this.alias = _alias;
	}

	/**
	 * Prints sql to stdout using console.log.
	 */
	printSql(): LinqSelectQueryBuilder<TEntity>
	{
		this.builder.printSql();
		return this;
	}

	/**
	 * Gets generated sql that will be executed.
	 * Parameters in the query are escaped for the currently used driver.
	 */
	getSql(): string
	{
		return this.builder.getSql();
	}

	/**
	 * Adds AND WHERE condition in the query builder
	 * @param expression
	 */
	where(expression: Expression<(entity: TEntity) => boolean | RegExpMatchArray>): LinqSelectQueryBuilder<TEntity>
	{
		return this.addWhere(expression, this.builder.andWhere);
	}

	/**
	 * Adds OR WHERE condition in the query builder
	 * @param expression
	 */
	orWhere(expression: Expression<(entity: TEntity) => boolean | RegExpMatchArray>): LinqSelectQueryBuilder<TEntity>
	{
		return this.addWhere(expression, this.builder.orWhere);
	}

	innerJoin<TTargetEntity, TResult>(
		target: ObjectType<TTargetEntity> | LinqSelectQueryBuilder<TTargetEntity>,
		joinOn: Expression<(first: TEntity, second: TTargetEntity) => boolean>,
		result: Expression<(first: TEntity, second: TTargetEntity) => TResult>
	): LinqSelectQueryBuilder<TResult>
	{
		if (!isArrowFunction(joinOn.expression)) return;

		if (joinOn.expression.parameters.length != 2)
		{
			throw new Error("Join expression must have two parameters.");
		}

		if (joinOn.expression.body.kind != ExpressionKind.BinaryExpression)
		{
			throw new Error("There is no identity comparision in join expression.");
		}

		if (target instanceof LinqSelectQueryBuilder)
		{

			let [on, onParams] = ["", {}];//BooleanQueryBuilder.from(joinOn);
			this.builder.innerJoin(() => target.getSelectBuilder(), joinOn.expression.parameters[1].name.escapedText, on, onParams);
		}
		else
		{
			let [on, onParams] = ["", {}];//BooleanQueryBuilder.from(joinOn);
			this.builder.innerJoin(target, joinOn.expression.parameters[1].name.escapedText, on, onParams);
		}

		// TODO: Implement Result

		return this as any as LinqSelectQueryBuilder<TResult>;
	}

	/**
	 * Specify select expression
	 */
	map<TResult>(result: Expression<(entity: TEntity) => TResult>): LinqSelectQueryBuilder<TResult>
	{
		if (!isArrowFunction(result.expression)) return;

		// TODO: Implement


		const alias = "__map" + (this.mapResultNum + 1);
		// this.manager.createQueryBuilder().select().from(qb => this.builder, alias);

		const resultBuilder = new LinqSelectQueryBuilder<TResult>(
			this.manager,
			() => (this.getSelectBuilder() as any as SelectQueryBuilder<TResult>),
			alias
		);
		resultBuilder.mapResultNum = this.mapResultNum + 1;

		return resultBuilder;

		// Je třeba udělat subquery, pokud bude některý z PropertyAssignment obsahovat v Inicializer cokoliv jiného než MemberAccessExpression

		// return this as any as LinqSelectQueryBuilder<TResult>;
	}

	async getMany()
	{
		return await this.builder.getMany();
	}

	async getRawMany()
	{
		return await this.builder.getRawMany();
	}

	private getSelectBuilder(): SelectQueryBuilder<TEntity>
	{
		// udělat addSelect("", "") pro každý PropertyAssign z map() Expression

		return this.builder;
	}

	/**
	 * Call given "where" over builder
	 * @param expression
	 * @param where
	 */
	private addWhere(expression: Expression<(entity: TEntity) => boolean | RegExpMatchArray>, where: Function)
	{
		if (!isArrowFunction(expression.expression)) return;

		let [condition, parameters] = BooleanQueryBuilder.from(expression, {[expression.expression.parameters[0].name.escapedText]: this.alias});

		where.call(this.builder, condition, parameters);

		return this;
	}
}