import {ExpressionKind} from "js-expr-tree";

export function isArrowFunction(expr: ExpressionNode): expr is ArrowFunctionExpressionNode
{
	const func = expr as ArrowFunctionExpressionNode;

	if (func.kind != ExpressionKind.ArrowFunction || func.body.kind == ExpressionKind.Block)
	{
		throw new Error("Expression must be arrow function without block body.");
	}

	return true;
}

/**
 * Convert basic regex to like expression
 * @param pattern
 */
export function regexToLike(pattern): string
{
	return pattern.replace(/([^\\]|^)\.\*/g, "$1%")
		.replace(/([^\\]|^)\./g, "$1_")
		.replace(/\\\./g, ".")
}