import {ExpressionKind, guards, nodes} from "js-expr-tree";
import {isArrowFunction, regexToLike}  from "./Helpers";
import {ParamAliases}                  from "./types";

const IDENTIFIER_TEST_REGEX = /^[\w\d_]+$/;

export default class BooleanQueryBuilder
{
	private static readonly stringExpressionKinds = [
		ExpressionKind.StringLiteral,
		ExpressionKind.NoSubstitutionTemplateLiteral |
		ExpressionKind.TemplateHead |
		ExpressionKind.TemplateMiddle |
		ExpressionKind.TemplateTail
	];

	/**
	 * List of operators
	 */
	private static operatorsMap: { [key: number]: string } = {
		[ExpressionKind.AmpersandAmpersandToken]: "AND",
		[ExpressionKind.BarBarToken]: "OR",
		[ExpressionKind.EqualsEqualsEqualsToken]: "=",
		[ExpressionKind.EqualsEqualsToken]: "=",
		[ExpressionKind.ExclamationEqualsEqualsToken]: "!=",
		[ExpressionKind.ExclamationEqualsToken]: "!=",
		[ExpressionKind.GreaterThanEqualsToken]: ">=",
		[ExpressionKind.LessThanEqualsToken]: "<=",
		[ExpressionKind.PlusToken]: "+",
		[ExpressionKind.MinusToken]: "-",
		[ExpressionKind.AsteriskToken]: "*",
		[ExpressionKind.SlashToken]: "/",
		[ExpressionKind.PercentToken]: "%",
	};

	/**
	 * List of supported top-level expressions
	 */
	private static readonly supportedTopLevelExpressions = [
		ExpressionKind.BinaryExpression,
		ExpressionKind.Identifier,
		ExpressionKind.ParenthesizedExpression,
		ExpressionKind.PrefixUnaryExpression,
		ExpressionKind.CallExpression
	];

	/**
	 * List of supported functions
	 */
	private static functionsMap: { [key: string]: (args: string[], params: { [key: string]: any }) => string } = {
		"match": ([field, arg], params) =>
		{
			// It's a param
			if (arg[0] == ":")
			{
				const paramName = arg.slice(1);
				// Convert param value
				params[paramName] = regexToLike(params[paramName]);
			}
			// It's pattern right inside query
			else
			{
				arg = regexToLike(arg);
			}

			return field + " LIKE " + arg;
		},
		"startsWith": ([field, arg], params) =>
		{
			// It's a param
			if (arg[0] == ":")
			{
				const paramName = arg.slice(1);
				params[paramName] += "%";
			}
			// It's a pattern right inside query
			else
			{
				// String contains ' symbol around it
				arg = arg.slice(0, -1) + "%'";
			}

			return field + " LIKE " + arg;
		},
		"endsWith": ([field, arg], params) =>
		{
			// It's a param
			if (arg[0] == ":")
			{
				const paramName = arg.slice(1);
				params[paramName] = "%" + params[paramName];
			}
			// It's a pattern right inside query
			else
			{
				arg = "'%" + arg.slice(1);
			}

			return field + " LIKE " + arg;
		},
		"includes": ([field, arg], params) =>
		{
			return arg + " IN (" + field + ")";
		},
	};

	/**
	 * Convert Expression into TypeORM compatible conditional string
	 * @param expr
	 * @param paramAliases
	 */
	static from(expr: Expression<(entity) => boolean | RegExpMatchArray> | Expression<(entity, entity2) => boolean | RegExpMatchArray>, paramAliases: ParamAliases): [string, { [key: string]: any }]
	{
		if (!isArrowFunction(expr.expression)) throw undefined;

		if (this.supportedTopLevelExpressions.indexOf(expr.expression.body.kind) != -1)
		{
			// Remove arrow function parameters from context; params override parent context variables and these params cannot be in context
			expr.expression.parameters.map(param =>
			{
				expr.context[param.name.escapedText] = undefined;
			});

			return BooleanQueryBuilder.stringify(expr.expression.body, expr.context, paramAliases);
		}

		throw new Error("Invalid expression");
	}

	/**
	 * Stringify expression
	 * @param expr
	 * @param context
	 * @param paramAliases
	 */
	private static stringify(expr: ExpressionNode | any, context: { [key: string]: any }, paramAliases: ParamAliases): [string, { [key: string]: any }]
	{
		// Number
		if (guards.isNumericLiteral(expr))
		{
			return [expr.text, {}];
		}

		// TRUE
		if (expr.kind == ExpressionKind.TrueKeyword)
		{
			return ["TRUE", {}];
		}

		// FALSE
		if (expr.kind == ExpressionKind.FalseKeyword)
		{
			return ["FALSE", {}];
		}

		// String
		if (this.stringExpressionKinds.indexOf(expr.kind) != -1)
		{
			return ["'" + expr.text + "'", {}];
		}

		if (guards.isBinaryExpression(expr))
		{
			if (expr.left.kind == ExpressionKind.NullKeyword)
			{
				const [right, rightParams] = BooleanQueryBuilder.stringify(expr.right, context, paramAliases);

				const not = expr.operatorToken.kind == ExpressionKind.ExclamationEqualsToken
				|| expr.operatorToken.kind == ExpressionKind.ExclamationEqualsEqualsToken ? " NOT" : "";

				return [right + ` IS${not} NULL`, {...rightParams}];
			}

			if (expr.right.kind == ExpressionKind.NullKeyword)
			{
				const [left, leftParams] = BooleanQueryBuilder.stringify(expr.left, context, paramAliases);

				const not = expr.operatorToken.kind == ExpressionKind.ExclamationEqualsToken
				|| expr.operatorToken.kind == ExpressionKind.ExclamationEqualsEqualsToken ? " NOT" : "";

				return [left + ` IS${not} NULL`, {...leftParams}];
			}

			const [left, leftParams] = BooleanQueryBuilder.stringify(expr.left, context, paramAliases);
			const [right, rightParams] = BooleanQueryBuilder.stringify(expr.right, context, paramAliases);
			return [left + " " + this.operatorsMap[expr.operatorToken.kind] + " " + right, {...leftParams, ...rightParams}];
		}

		if (guards.isIdentifierExpression(expr))
		{
			return [":" + expr.escapedText, {[expr.escapedText]: context[expr.escapedText]}];
		}

		if (expr.kind == ExpressionKind.ParenthesizedExpression)
		{
			const [parenthesized, parenthesizedParams] = this.stringify(expr.expression, context, paramAliases);
			return ["(" + parenthesized + ")", parenthesizedParams];
		}

		if (guards.isCallExpression(expr))
		{
			let [functionName, args, params] = this.getCall(expr, context, paramAliases);

			return [this.processFunctionCall(functionName, args, params), params];
		}

		if (guards.isPropertyAccessExpression(expr) || guards.isElementAccessExpression(expr))
		{
			return this.processPropertyAccess(this.stringifyPropertyAccess(expr, paramAliases, context), context);
		}

		if (guards.isNonNullExpression(expr))
		{
			// POZN.: Maybe some check can be generated but SQL don't need it generally
			return BooleanQueryBuilder.stringify(expr.expression, context, paramAliases);
		}

		if (guards.isPrefixUnaryExpression(expr))
		{
			if (expr.operator == ExpressionKind.ExclamationToken)
			{
				if (guards.isPrefixUnaryExpression(expr.operand) && expr.operand.operator == ExpressionKind.ExclamationToken)
				{
					const [result, params] = BooleanQueryBuilder.stringify(expr.operand.operand/*.expression*/, context, paramAliases);
					return [result + " = TRUE", params];
				}

				const [result, params] = BooleanQueryBuilder.stringify(expr.operand/*.expression*/, context, paramAliases);
				return [result + " = FALSE", params];
			}


			throw new Error(`Operator '${expr.operator}' not implemented.`);
		}
	}

	/**
	 * Process access to property; if it's context variable, change it to param
	 * @param propertyAccess
	 * @param context
	 */
	private static processPropertyAccess(propertyAccess: string, context: { [key: string]: any }): [string, { [p: string]: any }]
	{
		const [contextValue, paramName] = this.getValue(propertyAccess, context);

		// If value in context exists, it's not entity => create param
		if (contextValue)
		{
			return [":" + paramName, {[paramName]: contextValue}];
		}

		// It's entity property access => keep it as is
		return [propertyAccess, {}];
	}

	/**
	 * Convert property access into string path
	 * @param expr
	 * @param paramAliases
	 * @param context
	 */
	private static stringifyPropertyAccess(
		expr: nodes.PropertyAccessExpressionNode | nodes.IdentifierExpressionNode | nodes.NonNullExpressionNode | nodes.ElementAccessExpressionNode,
		paramAliases: ParamAliases,
		context: { [key: string]: any }
	): string
	{
		let alias, returnValue: string | undefined, mainFieldValue: string;

		// if (guards.isIdentifierExpression(expr))
		// {
		// 	alias = BooleanQueryBuilder.tryGetAlias(expr.escapedText, undefined, paramAliases);
		//
		// 	return alias
		// 		? alias
		// 		: (paramAliases[expr.escapedText] || expr.escapedText);
		// }
		// else if (guards.isPropertyAccessExpression(expr) && guards.isIdentifierExpression(expr.expression))
		// {
		// 	alias = BooleanQueryBuilder.tryGetAlias(expr.expression.escapedText, expr.name.escapedText, paramAliases);
		// }
		// else if (guards.isElementAccessExpression(expr) && guards.isIdentifierExpression(expr.expression))
		// {
		// 	alias = BooleanQueryBuilder.tryGetAlias(expr.expression.escapedText, BooleanQueryBuilder.getArgumentExpressionValueForPath(expr, context), paramAliases);
		// }
		// else if (guards.isPropertyAccessExpression(expr) && guards.isNonNullExpression(expr.expression) && guards.isIdentifierExpression(expr.expression.expression))
		// {
		// 	alias = BooleanQueryBuilder.tryGetAlias(expr.expression.expression.escapedText, expr.name.escapedText, paramAliases);
		// }


		if (guards.isIdentifierExpression(expr))
		{
			alias = BooleanQueryBuilder.tryGetAlias(expr.escapedText, undefined, paramAliases);

			return alias
				? alias
				: (paramAliases[expr.escapedText] || expr.escapedText);
		}
		else if (guards.isPropertyAccessExpression(expr))
		{
			// if (guards.isIdentifierExpression(expr.expression))
			// {
			// 	alias = BooleanQueryBuilder.tryGetAlias(expr.expression.escapedText, expr.name.escapedText, paramAliases);
			// }
			// else if (guards.isNonNullExpression(expr.expression))
			// {
			// 	if (guards.isIdentifierExpression(expr.expression.expression))
			// 	{
			// 		alias = BooleanQueryBuilder.tryGetAlias(expr.expression.expression.escapedText, expr.name.escapedText, paramAliases);
			// 	}
			// 	else
			// 	{
			// 		return this.stringifyPropertyAccess(
			// 			expr.expression.expression as nodes.PropertyAccessExpressionNode | nodes.ElementAccessExpressionNode,
			// 			paramAliases,
			// 			context
			// 		) + "." + expr.name.escapedText;
			// 	}
			// }
			mainFieldValue = expr.name.escapedText;
			({alias, returnValue} = BooleanQueryBuilder.stringifyPropertyAccessPart(expr, mainFieldValue, paramAliases, context));

			if (returnValue)
			{
				return returnValue;
			}
		}
		else if (guards.isElementAccessExpression(expr))
		{
			// if (guards.isIdentifierExpression(expr.expression))
			// {
			// 	alias = BooleanQueryBuilder.tryGetAlias(expr.expression.escapedText, BooleanQueryBuilder.getArgumentExpressionValueForPath(expr, context), paramAliases);
			// }
			// else if (guards.isNonNullExpression(expr.expression))
			// {
			// 	if (guards.isIdentifierExpression(expr.expression.expression))
			// 	{
			// 		alias = BooleanQueryBuilder.tryGetAlias(expr.expression.expression.escapedText, BooleanQueryBuilder.getArgumentExpressionValueForPath(expr, context), paramAliases);
			// 	}
			// 	else
			// 	{
			// 		return this.stringifyPropertyAccess(
			// 			expr.expression.expression as nodes.PropertyAccessExpressionNode | nodes.ElementAccessExpressionNode,
			// 			paramAliases,
			// 			context
			// 		) + "." + BooleanQueryBuilder.getArgumentExpressionValueForPath(expr, context);
			// 	}
			// }
			mainFieldValue = BooleanQueryBuilder.getElementAccessExpressionArgumentValueForPath(expr, context);
			({alias, returnValue} = BooleanQueryBuilder.stringifyPropertyAccessPart(expr, mainFieldValue, paramAliases, context));

			if (returnValue)
			{
				return returnValue;
			}
		}

		if (alias)
		{
			return alias;
		}

		return this.stringifyPropertyAccess(
			expr.expression as nodes.PropertyAccessExpressionNode | nodes.IdentifierExpressionNode | nodes.ElementAccessExpressionNode,
			paramAliases,
			context
		) + "." + mainFieldValue;
	}

	/**
	 * Process part of property access stringify
	 * @param expr
	 * @param mainField
	 * @param paramAliases
	 * @param context
	 */
	private static stringifyPropertyAccessPart(
		expr: nodes.PropertyAccessExpressionNode | nodes.ElementAccessExpressionNode,
		mainField: string,
		paramAliases: ParamAliases,
		context: { [key: string]: any }): { alias: string | false, returnValue: string | undefined }
	{
		let alias;

		if (guards.isIdentifierExpression(expr.expression))
		{
			alias = BooleanQueryBuilder.tryGetAlias(expr.expression.escapedText, mainField, paramAliases);
		}
		else if (guards.isNonNullExpression(expr.expression))
		{
			if (guards.isIdentifierExpression(expr.expression.expression))
			{
				alias = BooleanQueryBuilder.tryGetAlias(expr.expression.expression.escapedText, mainField, paramAliases);
			}
			else
			{
				return {
					alias: false,
					returnValue: this.stringifyPropertyAccess(
						expr.expression.expression as nodes.PropertyAccessExpressionNode | nodes.ElementAccessExpressionNode,
						paramAliases,
						context
					) + "." + mainField
				};
			}
		}

		return {
			alias,
			returnValue: undefined
		};
	}

	/**
	 * Return value of ElementAccessExpressionNode for property path
	 * @param expr
	 * @param context
	 */
	private static getElementAccessExpressionArgumentValueForPath(expr: nodes.ElementAccessExpressionNode, context: { [key: string]: any }): string
	{
		let value: string;
		let test = false;

		// Identifier
		if (guards.isIdentifierExpression(expr.argumentExpression))
		{
			value = context[expr.argumentExpression.escapedText] || "undefined";
			test = true;
		}

		// String
		else if (this.stringExpressionKinds.indexOf(expr.argumentExpression.kind) != -1)
		{
			value = (expr.argumentExpression as nodes.StringLiteralNode).text;
			test = true;
		}

		// Number
		else if (guards.isNumericLiteral(expr.argumentExpression))
		{
			value = expr.argumentExpression.text;
		}

		// TRUE
		else if (expr.argumentExpression.kind == ExpressionKind.TrueKeyword)
		{
			value = "true";
		}

		// FALSE
		else if (expr.argumentExpression.kind == ExpressionKind.FalseKeyword)
		{
			value = "false";
		}

		// NULL
		else if (expr.argumentExpression.kind == ExpressionKind.NullKeyword)
		{
			value = "null";
		}

		if (!value || (test && !IDENTIFIER_TEST_REGEX.test(value)))
		{
			throw new Error(`Invalid element access expression value ('${value}').`);
		}

		return value;
	}

	/**
	 * Returns name of called function, arguments (first argument is property if called via prototype) and parameters
	 * @param callExpr
	 * @param context
	 * @param paramAliases
	 * @returns [functionName: string, [property: string, ...args], params: { [key: string]: any }]
	 */
	private static getCall(callExpr: nodes.CallExpressionNode, context: { [key: string]: any }, paramAliases: ParamAliases): [string, string[], { [key: string]: any }]
	{
		let params = {};

		let args = callExpr.arguments.map(argExpression =>
		{
			let [arg, argsParams] = this.stringify(argExpression, context, paramAliases);
			params = Object.assign(argsParams, params);
			return arg;
		});

		if (guards.isIdentifierExpression(callExpr.expression))
		{
			return [callExpr.expression.escapedText, [undefined, ...args], {}];
		}

		if (guards.isPropertyAccessExpression(callExpr.expression) || guards.isElementAccessExpression(callExpr.expression))
		{
			// let path = "";
			// let expr = callExpr.expression.expression;
			//
			// while (true)
			// {
			// 	if (!expr) break;
			//
			// 	if (expr.kind == ExpressionKind.Identifier || expr.expression.kind == ExpressionKind.Identifier)
			// 	{
			// 		let alias = BooleanQueryBuilder.tryGetAlias(expr.escapedText, expr.expression?.escapedText, paramAliases);
			//
			// 		if (alias)
			// 		{
			// 			path = alias + (path ? "." + path : "");
			// 			break;
			// 		}
			// 	}
			//
			// 	path = expr.name.escapedText + (path ? "." + path : "");
			// 	expr = expr.expression;
			// }

			let [path, propParams] = this.processPropertyAccess(this.stringifyPropertyAccess(callExpr.expression.expression, paramAliases, context), context);
			params = Object.assign(propParams, params);

			return [
				guards.isPropertyAccessExpression(callExpr.expression)
					? callExpr.expression.name.escapedText
					: BooleanQueryBuilder.getElementAccessExpressionArgumentValueForPath(callExpr.expression, context),
				[path || undefined, ...args],
				params
			];
		}

		throw new Error("Not implemented expression.");
	}

	/**
	 * Returns alias or false
	 * @param identifier1
	 * @param identifier2
	 * @param paramAliases
	 */
	private static tryGetAlias(identifier1: string, identifier2: string, paramAliases: ParamAliases): string | false
	{
		let aliases = paramAliases[identifier1];

		if (aliases)
		{
			if (typeof (aliases) == "string")
			{
				return aliases + (identifier2 ? "." + identifier2 : "");
			}

			return aliases[identifier2];
		}

		return false;

		// if (paramAliases.__simpleParam && paramAliases.__simpleParam.name == identifier1)
		// {
		// 	return paramAliases.__simpleParam.alias;
		// }
		//
		// return (paramAliases[identifier1] as AliasesDescription)?.[identifier2]?.alias || false;
	}

	/**
	 * Return value from context by string patch
	 * @param path
	 * @param context
	 */
	private static getValue(path, context): [any, string]
	{
		let paths = path.split(".");
		let current = context;

		for (let i = 0; i < paths.length; i++)
		{
			if (current[paths[i]] == undefined)
			{
				return [undefined, undefined];
			}
			else
			{
				current = current[paths[i]];
			}
		}

		return [current, paths.join("_")];
	}

	/**
	 * Process function call
	 * @param functionName
	 * @param args
	 * @param params
	 */
	private static processFunctionCall(functionName: string, args: string[], params: { [key: string]: any }): string
	{
		let func = this.functionsMap[functionName];

		if (!func)
		{
			throw new Error(`Unsupported function '${functionName}' used.`);
		}

		return func(args, params);
	}
}