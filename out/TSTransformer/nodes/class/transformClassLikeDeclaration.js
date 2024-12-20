"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformClassLikeDeclaration = transformClassLikeDeclaration;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
const diagnostics_1 = require("../../../Shared/diagnostics");
const assert_1 = require("../../../Shared/util/assert");
const DiagnosticService_1 = require("../../classes/DiagnosticService");
const transformClassConstructor_1 = require("./transformClassConstructor");
const transformDecorators_1 = require("./transformDecorators");
const transformPropertyDeclaration_1 = require("./transformPropertyDeclaration");
const transformExpression_1 = require("../expressions/transformExpression");
const transformIdentifier_1 = require("../expressions/transformIdentifier");
const transformBlock_1 = require("../statements/transformBlock");
const transformMethodDeclaration_1 = require("../transformMethodDeclaration");
const findConstructor_1 = require("../../util/findConstructor");
const getExtendsNode_1 = require("../../util/getExtendsNode");
const getKindName_1 = require("../../util/getKindName");
const validateIdentifier_1 = require("../../util/validateIdentifier");
const validateMethodAssignment_1 = require("../../util/validateMethodAssignment");
const typescript_1 = __importDefault(require("typescript"));
const MAGIC_TO_STRING_METHOD = "toString";
function createNameFunction(name) {
    return luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.FunctionExpression, {
        statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ReturnStatement, {
            expression: luau_ast_1.default.string(name),
        })),
        parameters: luau_ast_1.default.list.make(),
        hasDotDotDot: false,
    });
}
function createBoilerplate(state, node, className, isClassExpression) {
    const isAbstract = typescript_1.default.hasAbstractModifier(node);
    const statements = luau_ast_1.default.list.make();
    const extendsNode = (0, getExtendsNode_1.getExtendsNode)(node);
    if (isAbstract && !extendsNode) {
        luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
            left: className,
            operator: "=",
            right: luau_ast_1.default.map(),
        }));
    }
    else {
        const metatableFields = luau_ast_1.default.list.make();
        luau_ast_1.default.list.push(metatableFields, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.MapField, {
            index: luau_ast_1.default.strings.__tostring,
            value: createNameFunction(luau_ast_1.default.isTemporaryIdentifier(className) ? "Anonymous" : className.name),
        }));
        if (extendsNode) {
            const [extendsExp, extendsExpPrereqs] = state.capture(() => (0, transformExpression_1.transformExpression)(state, extendsNode.expression));
            const superId = luau_ast_1.default.id("super");
            luau_ast_1.default.list.pushList(statements, extendsExpPrereqs);
            luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
                left: superId,
                right: extendsExp,
            }));
            luau_ast_1.default.list.push(metatableFields, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.MapField, {
                index: luau_ast_1.default.strings.__index,
                value: superId,
            }));
        }
        const metatable = luau_ast_1.default.call(luau_ast_1.default.globals.setmetatable, [
            luau_ast_1.default.map(),
            luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Map, { fields: metatableFields }),
        ]);
        if (isClassExpression && node.name) {
            luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
                left: (0, transformIdentifier_1.transformIdentifierDefined)(state, node.name),
                right: metatable,
            }));
        }
        else {
            luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                left: className,
                operator: "=",
                right: metatable,
            }));
        }
        luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
            left: luau_ast_1.default.property(className, "__index"),
            operator: "=",
            right: className,
        }));
    }
    if (!isAbstract) {
        const statementsInner = luau_ast_1.default.list.make();
        luau_ast_1.default.list.push(statementsInner, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
            left: luau_ast_1.default.globals.self,
            right: luau_ast_1.default.call(luau_ast_1.default.globals.setmetatable, [luau_ast_1.default.map(), className]),
        }));
        luau_ast_1.default.list.push(statementsInner, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ReturnStatement, {
            expression: luau_ast_1.default.binary(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.MethodCallExpression, {
                expression: luau_ast_1.default.globals.self,
                name: "constructor",
                args: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VarArgsLiteral, {})),
            }), "or", luau_ast_1.default.globals.self),
        }));
        luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.FunctionDeclaration, {
            name: luau_ast_1.default.property(className, "new"),
            parameters: luau_ast_1.default.list.make(),
            hasDotDotDot: true,
            statements: statementsInner,
            localize: false,
        }));
    }
    return statements;
}
function isClassHoisted(state, node) {
    if (node.name) {
        const symbol = state.typeChecker.getSymbolAtLocation(node.name);
        (0, assert_1.assert)(symbol);
        return state.isHoisted.get(symbol) === true;
    }
    return false;
}
function transformClassLikeDeclaration(state, node) {
    const isClassExpression = typescript_1.default.isClassExpression(node);
    const statements = luau_ast_1.default.list.make();
    const isExportDefault = typescript_1.default.hasSyntacticModifier(node, typescript_1.default.ModifierFlags.ExportDefault);
    if (node.name) {
        (0, validateIdentifier_1.validateIdentifier)(state, node.name);
    }
    const shouldUseInternalName = isClassExpression && node.name !== undefined;
    let returnVar;
    if (shouldUseInternalName) {
        returnVar = luau_ast_1.default.tempId("class");
    }
    else if (node.name) {
        returnVar = (0, transformIdentifier_1.transformIdentifierDefined)(state, node.name);
    }
    else if (isExportDefault) {
        returnVar = luau_ast_1.default.id("default");
    }
    else {
        returnVar = luau_ast_1.default.tempId("class");
    }
    let internalName;
    if (shouldUseInternalName) {
        internalName = (0, transformIdentifier_1.transformIdentifierDefined)(state, node.name);
    }
    else {
        internalName = returnVar;
    }
    state.classIdentifierMap.set(node, internalName);
    if (!isClassHoisted(state, node)) {
        luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
            left: returnVar,
            right: undefined,
        }));
    }
    const statementsInner = luau_ast_1.default.list.make();
    luau_ast_1.default.list.pushList(statementsInner, createBoilerplate(state, node, internalName, isClassExpression));
    const constructor = (0, findConstructor_1.findConstructor)(node);
    if (constructor) {
        luau_ast_1.default.list.pushList(statementsInner, (0, transformClassConstructor_1.transformClassConstructor)(state, constructor, internalName));
    }
    else {
        luau_ast_1.default.list.pushList(statementsInner, (0, transformClassConstructor_1.transformImplicitClassConstructor)(state, node, internalName));
    }
    for (const member of node.members) {
        if ((typescript_1.default.isPropertyDeclaration(member) || typescript_1.default.isMethodDeclaration(member)) &&
            (typescript_1.default.isIdentifier(member.name) || typescript_1.default.isStringLiteral(member.name)) &&
            luau_ast_1.default.isReservedClassField(member.name.text)) {
            DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noReservedClassFields(member.name));
        }
        if (typescript_1.default.isAutoAccessorPropertyDeclaration(member)) {
            const keyword = typescript_1.default.getModifiers(member).find(m => m.kind === typescript_1.default.SyntaxKind.AccessorKeyword);
            DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noAutoAccessorModifiers(keyword));
        }
    }
    const methods = new Array();
    const staticDeclarations = new Array();
    for (const member of node.members) {
        (0, validateMethodAssignment_1.validateMethodAssignment)(state, member);
        if (typescript_1.default.isConstructorDeclaration(member) ||
            typescript_1.default.isIndexSignatureDeclaration(member) ||
            typescript_1.default.isSemicolonClassElement(member)) {
            continue;
        }
        else if (typescript_1.default.isMethodDeclaration(member)) {
            methods.push(member);
        }
        else if (typescript_1.default.isPropertyDeclaration(member)) {
            if (!typescript_1.default.hasStaticModifier(member)) {
                continue;
            }
            staticDeclarations.push(member);
        }
        else if (typescript_1.default.isAccessor(member)) {
            DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noGetterSetter(member));
        }
        else if (typescript_1.default.isClassStaticBlockDeclaration(member)) {
            staticDeclarations.push(member);
        }
        else {
            (0, assert_1.assert)(false, `ClassMember kind not implemented: ${(0, getKindName_1.getKindName)(member.kind)}`);
        }
    }
    const classType = state.typeChecker.getTypeOfSymbolAtLocation(node.symbol, node);
    const instanceType = state.typeChecker.getDeclaredTypeOfSymbol(node.symbol);
    for (const method of methods) {
        if (typescript_1.default.isIdentifier(method.name) || typescript_1.default.isStringLiteral(method.name)) {
            if (luau_ast_1.default.isMetamethod(method.name.text)) {
                DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noClassMetamethods(method.name));
            }
            if (typescript_1.default.hasStaticModifier(method)) {
                if (instanceType.getProperty(method.name.text) !== undefined) {
                    DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noInstanceMethodCollisions(method));
                }
            }
            else {
                if (classType.getProperty(method.name.text) !== undefined) {
                    DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noStaticMethodCollisions(method));
                }
            }
        }
        const [statements, prereqs] = state.capture(() => (0, transformMethodDeclaration_1.transformMethodDeclaration)(state, method, { name: "name", value: internalName }));
        luau_ast_1.default.list.pushList(statementsInner, prereqs);
        luau_ast_1.default.list.pushList(statementsInner, statements);
    }
    const toStringProperty = instanceType.getProperty(MAGIC_TO_STRING_METHOD);
    if (toStringProperty && !!(toStringProperty.flags & typescript_1.default.SymbolFlags.Method)) {
        luau_ast_1.default.list.push(statementsInner, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.MethodDeclaration, {
            expression: internalName,
            name: "__tostring",
            hasDotDotDot: false,
            parameters: luau_ast_1.default.list.make(),
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ReturnStatement, {
                expression: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.MethodCallExpression, {
                    expression: luau_ast_1.default.globals.self,
                    name: MAGIC_TO_STRING_METHOD,
                    args: luau_ast_1.default.list.make(),
                }),
            })),
        }));
    }
    for (const declaration of staticDeclarations) {
        if (typescript_1.default.isClassStaticBlockDeclaration(declaration)) {
            luau_ast_1.default.list.pushList(statementsInner, (0, transformBlock_1.transformBlock)(state, declaration.body));
        }
        else {
            const [statements, prereqs] = state.capture(() => (0, transformPropertyDeclaration_1.transformPropertyDeclaration)(state, declaration, internalName));
            luau_ast_1.default.list.pushList(statementsInner, prereqs);
            luau_ast_1.default.list.pushList(statementsInner, statements);
        }
    }
    if (shouldUseInternalName) {
        luau_ast_1.default.list.push(statementsInner, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
            left: returnVar,
            operator: "=",
            right: internalName,
        }));
    }
    luau_ast_1.default.list.pushList(statementsInner, (0, transformDecorators_1.transformDecorators)(state, node, returnVar));
    luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.DoStatement, {
        statements: statementsInner,
    }));
    return { statements, name: returnVar };
}
//# sourceMappingURL=transformClassLikeDeclaration.js.map