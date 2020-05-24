import {ExpressionKind, guards}           from "js-expr-tree";
import {SelectQueryBuilder}               from "typeorm";
import {ObjectType}                       from "typeorm/common/ObjectType";
import {EntityManager}                    from "typeorm/entity-manager/EntityManager";
import BooleanQueryBuilder                from "./BooleanQueryBuilder";
import {isArrowFunction}                  from "./Helpers";
import {AliasesDescription, ParamAliases} from "./types";

const BASE_ALIAS = "sel";
const MAIN_ALIAS_ID = "__mainEntity";

export default class LinqSelectQueryBuilder<TEntity>
{
	/**
	 * Aliases
	 * @description Object with description of selected data
	 */
	private readonly aliases: AliasesDescription = {};

	/**
	 * Number for alias generation
	 */
	private usedAliasNumber: number = 0;

	/**
	 * Type of entity
	 */
	private readonly entityType: ObjectType<TEntity> | (() => SelectQueryBuilder<TEntity>);

	/**
	 * TypeORM entity manager
	 */
	private readonly manager: EntityManager;

	/**
	 * TypeORM select query builder
	 */
	private _builder: SelectQueryBuilder<TEntity>;

	// private mapFunction

	/**
	 * Builder getter
	 */
	private get builder(): SelectQueryBuilder<TEntity>
	{
		if (!this._builder)
		{
			this._builder = this.manager.getRepository(this.entityType).createQueryBuilder(this.aliases[MAIN_ALIAS_ID].alias);
		}

		return this._builder;
	}

	/**
	 * Ctor
	 * @param manager
	 * @param entityType
	 */
	constructor(manager: EntityManager, entityType: ObjectType<TEntity> | (() => SelectQueryBuilder<TEntity>))
	{
		this.entityType = entityType;
		this.manager = manager;
		this.aliases[MAIN_ALIAS_ID] = {type: entityType, alias: this.getNewAlias()};
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
		if (!isArrowFunction(joinOn.expression)) throw undefined;

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
			// TODO: Implement
			throw new Error("Not implemented yet!");
			// let [on, onParams] = ["", {}];//BooleanQueryBuilder.from(joinOn);
			// this.builder.innerJoin(() => target.getSelectBuilder(), joinOn.expression.parameters[1].name.escapedText, on, onParams);
		}
		else
		{
			let targetAlias = this.getNewAlias();
			let [on, onParams] = BooleanQueryBuilder.from(joinOn, this.getExpressionParamsAliases(joinOn, target, targetAlias));
			this.builder.innerJoin(target, targetAlias, on, onParams);

			this.updateAliases(result, target, targetAlias);
		}

		// TODO: Implement Result

		return this as any as LinqSelectQueryBuilder<TResult>;
	}

	/**
	 * Specify select expression
	 */
	map<TResult>(result: Expression<(entity: TEntity) => TResult>): LinqSelectQueryBuilder<TResult>
	{
		if (!isArrowFunction(result.expression)) throw undefined;

		// TODO: Implement


		const alias = "__map" + (this.usedAliasNumber + 1);
		// this.manager.createQueryBuilder().select().from(qb => this.builder, alias);

		const resultBuilder = new LinqSelectQueryBuilder<TResult>(
			this.manager,
			() => (this.getSelectBuilder() as any as SelectQueryBuilder<TResult>)
		);
		// resultBuilder.alias = alias;
		resultBuilder.usedAliasNumber = this.usedAliasNumber + 1;

		return resultBuilder;

		// Je třeba udělat subquery, pokud bude některý z PropertyAssignment obsahovat v Inicializer cokoliv jiného než MemberAccessExpression

		// return this as any as LinqSelectQueryBuilder<TResult>;
	}

	async getMany()
	{
		return await this.builder.getMany();
	}


	select(...args)
	{
		this.builder.select.apply(this.builder, args);
		return this;
	}

	async getRawMany(): Promise<any[]>
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
	private addWhere(expression: Expression<(entity: TEntity) => boolean | RegExpMatchArray>, where: Function): LinqSelectQueryBuilder<TEntity>
	{
		if (!isArrowFunction(expression.expression)) throw undefined;

		let [condition, parameters] = BooleanQueryBuilder.from(expression, this.getExpressionParamsAliases(expression));

		where.call(this.builder, condition, parameters);

		return this;
	}

	/**
	 * Return new unique alias
	 */
	private getNewAlias()
	{
		return BASE_ALIAS + (++this.usedAliasNumber).toString();
	}

	private getExpressionParamsAliases<TTargetEntity = null>(
		expression: Expression<(entity) => (boolean | RegExpMatchArray)> | Expression<(entity, entity2) => (boolean | RegExpMatchArray)>,
		target?: ObjectType<TTargetEntity> | LinqSelectQueryBuilder<TTargetEntity>,
		targetAlias?: string
	): ParamAliases
	{
		if (!isArrowFunction(expression.expression)) throw undefined;

		const paramAliases = {};
		const keys = Object.keys(this.aliases);

		// if it's default query without any result object, then set alias right into param
		// otherwise set mapping of aliases into param
		paramAliases[expression.expression.parameters[0].name.escapedText] = keys.length == 1
			? this.aliases[keys[0]].alias
			: keys.map(resultFieldName => this.aliases[resultFieldName].alias);

		if (target)
		{
			paramAliases[expression.expression.parameters[1].name.escapedText] = targetAlias || this.getNewAlias();
		}

		return paramAliases;
	}

	/**
	 * Update stored aliases
	 * @param resultExpression
	 * @param target
	 * @param targetAlias
	 */
	private updateAliases<TTargetEntity, TResult>(resultExpression: Expression<(first: TEntity, second: TTargetEntity) => TResult>, target: ObjectType<TTargetEntity> | LinqSelectQueryBuilder<TTargetEntity>, targetAlias: string)
	{
		if (!isArrowFunction(resultExpression.expression)) throw undefined;

		// Single value result
		if (guards.isIdentifierExpression(resultExpression.expression.body) || guards.isPropertyAccessExpression(resultExpression.expression.body))
		{
			// TODO: vymazat všechny aliasy, kromě toho zde zmíněného
		}
		// Object literal
		else if (guards.isParenthesizedExpression(resultExpression.expression.body) && guards.isObjectLiteralExpression(resultExpression.expression.body.expression))
		{
			
		}
		else
		{
			throw new Error("Invalid result selector. It must be object literal or single value from param.");
		}
	}
}