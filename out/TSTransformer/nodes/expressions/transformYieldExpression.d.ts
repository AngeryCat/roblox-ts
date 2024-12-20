import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../../classes/TransformState";
import ts from "typescript";
export declare function transformYieldExpression(state: TransformState, node: ts.YieldExpression): luau.None | luau.TemporaryIdentifier | luau.CallExpression;
