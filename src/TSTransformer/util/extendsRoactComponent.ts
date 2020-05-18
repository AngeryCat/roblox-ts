import ts from "byots";
import { TransformState } from "TSTransformer";
import { getExtendsNode } from "TSTransformer/util/getExtendsNode";

export function extendsRoactComponent(state: TransformState, node: ts.ClassLikeDeclaration) {
	const extendsNode = getExtendsNode(node);
	if (extendsNode) {
		const aliasSymbol = state.typeChecker.getSymbolAtLocation(extendsNode.expression);
		if (aliasSymbol) {
			const originalSymbol = ts.skipAlias(aliasSymbol, state.typeChecker);
			return (
				originalSymbol === state.roactSymbolManager.componentSymbol ||
				originalSymbol === state.roactSymbolManager.pureComponentSymbol
			);
		}
	}
	return false;
}