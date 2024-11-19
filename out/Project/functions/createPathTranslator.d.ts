import { PathTranslator } from "@roblox-ts/path-translator";
import { ProjectData } from "../../shared/types";
import ts from "typescript";
export declare function createPathTranslator(program: ts.BuilderProgram, data: ProjectData): PathTranslator;
