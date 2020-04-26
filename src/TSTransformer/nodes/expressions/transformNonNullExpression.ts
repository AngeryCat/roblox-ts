import { transformExpression } from "TSTransformer/nodes/expressions/transformExpression";
import { TransformState } from "TSTransformer/TransformState";
import ts from "typescript";

export function transformNonNullExpression(state: TransformState, node: ts.NonNullExpression) {
	return transformExpression(state, node.expression);
}
