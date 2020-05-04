import {ExpressionKind}               from "js-expr-tree";
import {isArrowFunction, regexToLike} from "./Helpers";

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
	static from(expr: Expression<(entity) => boolean | RegExpMatchArray>, paramAliases: { [key: string]: any }): [string, { [key: string]: any }]
	{
		if (!isArrowFunction(expr.expression)) return;

		if (this.supportedTopLevelExpressions.indexOf(expr.expression.body.kind) != -1)
		{
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
	private static stringify(expr: ExpressionNode | any, context: { [key: string]: any }, paramAliases: { [key: string]: any }): [string, { [key: string]: any }]
	{
		if (expr.kind == ExpressionKind.NumericLiteral)
		{
			return [expr.text, {}];
		}

		if (expr.kind == ExpressionKind.TrueKeyword)
		{
			return ["TRUE", {}];
		}

		if (expr.kind == ExpressionKind.FalseKeyword)
		{
			return ["FALSE", {}];
		}

		if (this.stringExpressionKinds.indexOf(expr.kind) != -1)
		{
			return ["'" + expr.text + "'", {}];
		}

		if (expr.kind == ExpressionKind.BinaryExpression)
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

		if (expr.kind == ExpressionKind.Identifier)
		{
			return [":" + expr.escapedText, {[expr.escapedText]: context[expr.escapedText]}];
		}

		if (expr.kind == ExpressionKind.ParenthesizedExpression)
		{
			const [parenthesized, parenthesizedParams] = this.stringify(expr.expression, context, paramAliases);
			return ["(" + parenthesized + ")", parenthesizedParams];
		}

		if (expr.kind == ExpressionKind.CallExpression)
		{
			let [functionName, args, params] = this.getCall(expr, context, paramAliases);

			return [this.processFunctionCall(functionName, args, params), params];
		}

		if (expr.kind == ExpressionKind.PropertyAccessExpression)
		{
			return this.processPropertyAccess(this.stringifyPropertyAccess(expr, paramAliases), context);
		}

		if (expr.kind == ExpressionKind.NonNullExpression)
		{
			// POZN.: Maybe some check can be generated but SQL don't need it generally
			return this.stringify(expr.expression, context, paramAliases);
		}

		if (expr.kind == ExpressionKind.PrefixUnaryExpression)
		{
			if (expr.operator == ExpressionKind.ExclamationToken)
			{
				if (expr.operand.kind == ExpressionKind.PrefixUnaryExpression && expr.operand.operator == ExpressionKind.ExclamationToken)
				{
					const [result, params] = this.stringify(expr.operand.expression, context, paramAliases);
					return [result + " = TRUE", params];
				}

				const [result, params] = this.stringify(expr.expression, context, paramAliases);
				return [result + " = FALSE", params];
			}


			throw new Error(`Operator '${expr.operator}' not implemented.`);
		}
	}

	/**
	 * Zpracuje přístup k property
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
	 */
	private static stringifyPropertyAccess(expr: ExpressionNode | any, paramAliases: { [key: string]: any }): string
	{
		if (expr.kind == ExpressionKind.Identifier)
		{
			return paramAliases[expr.escapedText] || expr.escapedText;
		}

		return this.stringifyPropertyAccess(expr.expression, paramAliases) + "." + expr.name.escapedText;
	}

	/**
	 * Returns name of called function, arguments (first argument is property if called via prototype) and parameters
	 * @param callExpr
	 * @param context
	 * @param paramAliases
	 * @returns [functionName: string, [property: string, ...args], params: { [key: string]: any }]
	 */
	private static getCall(callExpr: ExpressionNode | any, context: { [key: string]: any }, paramAliases: { [key: string]: any }): [string, string[], { [key: string]: any }]
	{
		let params = {};

		let args = callExpr.arguments.map(argExpression =>
		{
			let [arg, argsParams] = this.stringify(argExpression, context, paramAliases);
			params = Object.assign(argsParams, params);
			return arg;
		});

		if (callExpr.expression.kind == ExpressionKind.Identifier)
		{
			return [callExpr.expression.escapedText, [undefined, ...args], {}];
		}

		if (callExpr.expression.kind == ExpressionKind.PropertyAccessExpression)
		{

			let path = "";
			let expr = callExpr.expression.expression;

			while (expr && expr.kind != ExpressionKind.Identifier)
			{
				path = expr.name.escapedText + (path ? "." + path : "");
				expr = expr.expression;
			}

			path = (paramAliases[expr.escapedText] || expr.escapedText) + "." + path;

			let propParams;
			[path, propParams] = this.processPropertyAccess(path, context);
			params = Object.assign(propParams, params);

			return [callExpr.expression.name.escapedText, [path || undefined, ...args], params];
		}

		throw new Error("Not implemented expression.");
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