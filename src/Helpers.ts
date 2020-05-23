import {ExpressionKind, nodes, guards} from "js-expr-tree";

export function isArrowFunction(expr: ExpressionNode): expr is nodes.ArrowFunctionExpressionNode
{
	const func = expr as nodes.ArrowFunctionExpressionNode;

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
	/*
		Standard SQL support two wildcards: 
		% - the percent sign represents zero or one and more characters,
		_ - the underscore represents a single character
	 */
	return pattern
		// Change not escaped .* for %
		.replace(/([^\\]|^)\.\*/g, "$1%")
		// and not escaped . for "_"
		.replace(/([^\\]|^)\./g, "$1_")
		// and replace possible escapes of . and *
		.replace(/\\\./g, ".")
		.replace(/\\\*/g, "*")
	;
}