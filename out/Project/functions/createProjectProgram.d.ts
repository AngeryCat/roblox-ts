import { ProjectData } from "../../shared/types";
import ts from "typescript";
export declare function createProjectProgram(data: ProjectData, host?: ts.CompilerHost): ts.EmitAndSemanticDiagnosticsBuilderProgram;
