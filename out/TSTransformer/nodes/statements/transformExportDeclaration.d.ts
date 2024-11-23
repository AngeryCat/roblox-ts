import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../..";
import ts from "typescript";
export declare function transformExportDeclaration(state: TransformState, node: ts.ExportDeclaration): luau.List<luau.Statement<luau.SyntaxKind>>;