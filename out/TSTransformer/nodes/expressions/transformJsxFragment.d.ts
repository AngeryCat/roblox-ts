import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../..";
import ts from "typescript";
export declare function transformJsxFragment(state: TransformState, node: ts.JsxFragment): luau.CallExpression;
