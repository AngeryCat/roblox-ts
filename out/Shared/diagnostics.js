"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnings = exports.errors = void 0;
exports.getDiagnosticId = getDiagnosticId;
const kleur_1 = __importDefault(require("kleur"));
const createDiagnosticWithLocation_1 = require("./util/createDiagnosticWithLocation");
const createGithubLink_1 = require("./util/createGithubLink");
const createTextDiagnostic_1 = require("./util/createTextDiagnostic");
const typescript_1 = __importDefault(require("typescript"));
function suggestion(text) {
    return "Suggestion: " + kleur_1.default.yellow(text);
}
let id = 0;
function diagnostic(category, ...messages) {
    return diagnosticWithContext(category, undefined, ...messages);
}
function diagnosticWithContext(category, contextFormatter, ...messages) {
    const result = (node, ...context) => {
        if (category === typescript_1.default.DiagnosticCategory.Error) {
            debugger;
        }
        if (contextFormatter) {
            messages.push(...contextFormatter(...context));
        }
        return (0, createDiagnosticWithLocation_1.createDiagnosticWithLocation)(result.id, messages.filter(v => v !== false).join("\n"), category, node);
    };
    result.id = id++;
    return result;
}
function diagnosticText(category, ...messages) {
    return (0, createTextDiagnostic_1.createTextDiagnostic)(messages.filter(v => v !== false).join("\n"), category);
}
function error(...messages) {
    return diagnostic(typescript_1.default.DiagnosticCategory.Error, ...messages);
}
function errorWithContext(contextFormatter, ...messages) {
    return diagnosticWithContext(typescript_1.default.DiagnosticCategory.Error, contextFormatter, ...messages);
}
function errorText(...messages) {
    return diagnosticText(typescript_1.default.DiagnosticCategory.Error, ...messages);
}
function warning(...messages) {
    return diagnostic(typescript_1.default.DiagnosticCategory.Warning, ...messages);
}
function warningText(...messages) {
    return diagnosticText(typescript_1.default.DiagnosticCategory.Warning, ...messages);
}
function getDiagnosticId(diagnostic) {
    return diagnostic.id;
}
exports.errors = {
    noInvalidIdentifier: error("Invalid Luau identifier!", "Luau identifiers must start with a letter and only contain letters, numbers, and underscores.", "Reserved Luau keywords cannot be used as identifiers."),
    noReservedIdentifier: error("Cannot use identifier reserved for compiler internal usage."),
    noReservedClassFields: error("Cannot use class field reserved for compiler internal usage."),
    noClassMetamethods: error("Metamethods cannot be used in class definitions!"),
    noForInStatement: error("for-in loop statements are not supported!"),
    noLabeledStatement: error("labels are not supported!"),
    noDebuggerStatement: error("`debugger` is not supported!"),
    noNullLiteral: error("`null` is not supported!", suggestion("Use `undefined` instead.")),
    noPrivateIdentifier: error("Private identifiers are not supported!"),
    noTypeOfExpression: error("`typeof` operator is not supported!", suggestion("Use `typeIs(value, type)` or `typeOf(value)` instead.")),
    noRegex: error("Regular expressions are not supported!"),
    noBigInt: error("BigInt literals are not supported!"),
    noAny: error("Using values of type `any` is not supported!", suggestion("Use `unknown` instead.")),
    noVar: error("`var` keyword is not supported!", suggestion("Use `let` or `const` instead.")),
    noGetterSetter: error("Getters and Setters are not supported!", (0, createGithubLink_1.issue)(457)),
    noAutoAccessorModifiers: error("Getters and Setters are not supported!", "The `accessor` keyword requires generating get/set accessors", (0, createGithubLink_1.issue)(457)),
    noEqualsEquals: error("operator `==` is not supported!", suggestion("Use `===` instead.")),
    noExclamationEquals: error("operator `!=` is not supported!", suggestion("Use `!==` instead.")),
    noEnumMerging: error("Enum merging is not supported!"),
    noNamespaceMerging: error("Namespace merging is not supported!"),
    noSpreadDestructuring: error("Operator `...` is not supported for destructuring!"),
    noFunctionExpressionName: error("Function expression names are not supported!"),
    noPrecedingSpreadElement: error("Spread element must come last in a list of arguments!"),
    noLuaTupleDestructureAssignmentExpression: error("Cannot destructure LuaTuple<T> expression outside of an ExpressionStatement!"),
    noExportAssignmentLet: error("Cannot use `export =` on a `let` variable!", suggestion("Use `const` instead.")),
    noGlobalThis: error("`globalThis` is not supported!"),
    noArguments: error("`arguments` is not supported!"),
    noPrototype: error("`prototype` is not supported!"),
    noRobloxSymbolInstanceof: error("The `instanceof` operator can only be used on roblox-ts classes!", suggestion('Use `typeIs(myThing, "TypeToCheck") instead')),
    noNonNumberStringRelationOperator: error("Relation operators can only be used on number or string types!"),
    noInstanceMethodCollisions: error("Static methods cannot use the same name as instance methods!"),
    noStaticMethodCollisions: error("Instance methods cannot use the same name as static methods!"),
    noUnaryPlus: error("Unary `+` is not supported!", suggestion("Use `tonumber(x)` instead.")),
    noNonNumberUnaryMinus: error("Unary `-` is only supported for number types!"),
    noAwaitForOf: error("`await` is not supported in for-of loops!"),
    noAsyncGeneratorFunctions: error("Async generator functions are not supported!"),
    noNonStringModuleSpecifier: error("Module specifiers must be a string literal."),
    noIterableIteration: error("Iterating on Iterable<T> is not supported! You must use a more specific type."),
    noMixedTypeCall: error("Attempted to call a function with mixed types! All definitions must either be a method or a callback."),
    noIndexWithoutCall: error("Cannot index a method without calling it!", suggestion("Use the form `() => a.b()` instead of `a.b`.")),
    noCommentDirectives: error("Usage of `@ts-ignore`, `@ts-expect-error`, and `@ts-nocheck` are not supported!", "roblox-ts needs type and symbol info to compile correctly.", suggestion("Consider using type assertions or `declare` statements.")),
    noOptionalMacroCall: error("Macro methods can not be optionally called!", suggestion("Macros always exist. Use a normal call.")),
    noConstructorMacroWithoutNew: error("Cannot index a constructor macro without using the `new` operator!"),
    noMacroExtends: error("Cannot extend from a macro class!", suggestion("Store an instance of the macro class in a property.")),
    noMacroUnion: error("Macro cannot be applied to a union type!"),
    noMacroObjectSpread: error("Macro classes cannot be used in an object spread!", suggestion("Did you mean to use an array spread? `[ ...exp ]`")),
    noVarArgsMacroSpread: error("Macros which use variadic arguments do not support spread expressions!", (0, createGithubLink_1.issue)(1149)),
    noRangeMacroOutsideForOf: error("$range() macro is only valid as an expression of a for-of loop!"),
    noTupleMacroOutsideReturn: error("$tuple() macro is only valid as an expression of a return statement!"),
    noModuleSpecifierFile: error("Could not find file for import. Did you forget to `npm install`?"),
    noInvalidModule: error("You can only use npm scopes that are listed in your typeRoots."),
    noUnscopedModule: error("You cannot use modules directly under node_modules."),
    noNonModuleImport: error("Cannot import a non-ModuleScript!"),
    noIsolatedImport: error("Attempted to import a file inside of an isolated container from outside!"),
    noServerImport: error("Cannot import a server file from a shared or client location!", suggestion("Move the file you want to import to a shared location.")),
    noPrecedingJsxSpreadElement: error("JSX spread expression must come last in children!"),
    expectedMethodGotFunction: error("Attempted to assign non-method where method was expected."),
    expectedFunctionGotMethod: error("Attempted to assign method where non-method was expected."),
    noRojoData: errorWithContext((path, isPackage) => [
        `Could not find Rojo data. There is no $path in your Rojo config that covers ${path}`,
        isPackage && suggestion(`Did you forget to add a custom npm scope to your default.project.json?`),
    ]),
    noPackageImportWithoutScope: errorWithContext((path, rbxPath) => [
        `Imported package Roblox path is missing an npm scope!`,
        `Package path: ${path}`,
        `Roblox path: ${rbxPath.join(".")}`,
        suggestion(`You might need to update your "node_modules" in default.project.json to match:
"node_modules": {
	"$className": "Folder",
	"@rbxts": {
		"$path": "node_modules/@rbxts"
	}
}`),
    ]),
    incorrectFileName: (originalFileName, suggestedFileName, fullPath) => errorText(`Incorrect file name: \`${originalFileName}\`!`, `Full path: ${fullPath}`, suggestion(`Change \`${originalFileName}\` to \`${suggestedFileName}\`.`)),
    rojoPathInSrc: (partitionPath, suggestedPath) => errorText(`Invalid Rojo configuration. $path fields should be relative to out directory.`, suggestion(`Change the value of $path from "${partitionPath}" to "${suggestedPath}".`)),
};
exports.warnings = {
    truthyChange: (checksStr) => warning(`Value will be checked against ${checksStr}`),
    stringOffsetChange: (text) => warning(`String macros no longer offset inputs: ${text}`),
    transformerNotFound: (name, err) => warningText(`Transformer \`${name}\` was not found!`, "More info: " + err, suggestion("Did you forget to install the package?")),
    runtimeLibUsedInReplicatedFirst: warning("This statement would generate a call to the runtime library. The runtime library should not be used from ReplicatedFirst."),
};
//# sourceMappingURL=diagnostics.js.map