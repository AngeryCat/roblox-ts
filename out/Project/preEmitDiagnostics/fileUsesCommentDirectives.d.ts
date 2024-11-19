import { ProjectData } from "../../shared/types";
import ts from "typescript";
export declare function fileUsesCommentDirectives(data: ProjectData, sourceFile: ts.SourceFile): ts.Diagnostic[];
