import { ProjectData } from "../../shared/types";
import ts from "typescript";
export type PreEmitChecker = (data: ProjectData, sourceFile: ts.SourceFile) => Array<ts.Diagnostic>;
export declare function getCustomPreEmitDiagnostics(data: ProjectData, sourceFile: ts.SourceFile): ts.Diagnostic[];
