"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROPERTY_CALL_MACROS = void 0;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
const assert_1 = require("../../Shared/util/assert");
const convertToIndexableExpression_1 = require("../util/convertToIndexableExpression");
const isUsedAsStatement_1 = require("../util/isUsedAsStatement");
const offset_1 = require("../util/offset");
const types_1 = require("../util/types");
const valueToIdStr_1 = require("../util/valueToIdStr");
const typescript_1 = __importDefault(require("typescript"));
function makeMathMethod(operator) {
    return (state, node, expression, args) => {
        let rhs = args[0];
        if (!luau_ast_1.default.isSimple(rhs)) {
            rhs = luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ParenthesizedExpression, { expression: rhs });
        }
        return luau_ast_1.default.binary(expression, operator, rhs);
    };
}
const OPERATOR_TO_NAME_MAP = new Map([
    ["+", "add"],
    ["-", "sub"],
    ["*", "mul"],
    ["/", "div"],
    ["//", "idiv"],
]);
function makeMathSet(...operators) {
    const result = {};
    for (const operator of operators) {
        const methodName = OPERATOR_TO_NAME_MAP.get(operator);
        (0, assert_1.assert)(methodName);
        result[methodName] = makeMathMethod(operator);
    }
    return result;
}
function makeStringCallback(strCallback) {
    return (state, node, expression, args) => {
        return luau_ast_1.default.call(strCallback, [expression, ...args]);
    };
}
const STRING_CALLBACKS = {
    size: (state, node, expression) => luau_ast_1.default.unary("#", expression),
    byte: makeStringCallback(luau_ast_1.default.globals.string.byte),
    find: makeStringCallback(luau_ast_1.default.globals.string.find),
    format: makeStringCallback(luau_ast_1.default.globals.string.format),
    gmatch: makeStringCallback(luau_ast_1.default.globals.string.gmatch),
    gsub: makeStringCallback(luau_ast_1.default.globals.string.gsub),
    lower: makeStringCallback(luau_ast_1.default.globals.string.lower),
    match: makeStringCallback(luau_ast_1.default.globals.string.match),
    rep: makeStringCallback(luau_ast_1.default.globals.string.rep),
    reverse: makeStringCallback(luau_ast_1.default.globals.string.reverse),
    split: makeStringCallback(luau_ast_1.default.globals.string.split),
    sub: makeStringCallback(luau_ast_1.default.globals.string.sub),
    upper: makeStringCallback(luau_ast_1.default.globals.string.upper),
};
function makeEveryOrSomeMethod(callbackArgsListMaker, initialState) {
    return (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const resultId = state.pushToVar(luau_ast_1.default.bool(initialState), "result");
        const callbackId = state.pushToVarIfNonId(args[0], "callback");
        const keyId = luau_ast_1.default.tempId("k");
        const valueId = luau_ast_1.default.tempId("v");
        const callCallback = luau_ast_1.default.call(callbackId, callbackArgsListMaker(keyId, valueId, expression));
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            ids: luau_ast_1.default.list.make(keyId, valueId),
            expression,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
                condition: initialState ? luau_ast_1.default.unary("not", callCallback) : callCallback,
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: resultId,
                    operator: "=",
                    right: luau_ast_1.default.bool(!initialState),
                }), luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BreakStatement, {})),
                elseBody: luau_ast_1.default.list.make(),
            })),
        }));
        return resultId;
    };
}
function makeEveryMethod(callbackArgsListMaker) {
    return makeEveryOrSomeMethod(callbackArgsListMaker, true);
}
function makeSomeMethod(callbackArgsListMaker) {
    return makeEveryOrSomeMethod(callbackArgsListMaker, false);
}
function argumentsWithDefaults(state, args, defaults) {
    for (let i = 0; i < args.length; i++) {
        if (!luau_ast_1.default.isSimplePrimitive(args[i])) {
            args[i] = state.pushToVar(args[i], (0, valueToIdStr_1.valueToIdStr)(args[i]) || `arg${i}`);
            state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
                condition: luau_ast_1.default.binary(args[i], "==", luau_ast_1.default.nil()),
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: args[i],
                    operator: "=",
                    right: defaults[i],
                })),
                elseBody: luau_ast_1.default.list.make(),
            }));
        }
    }
    for (let j = args.length; j < defaults.length; j++) {
        args[j] = defaults[j];
    }
    return args;
}
const ARRAY_LIKE_METHODS = {
    size: (state, node, expression) => luau_ast_1.default.unary("#", expression),
};
const READONLY_ARRAY_METHODS = {
    isEmpty: (state, node, expression) => luau_ast_1.default.binary(luau_ast_1.default.unary("#", expression), "==", luau_ast_1.default.number(0)),
    join: (state, node, expression, args) => {
        args = argumentsWithDefaults(state, args, [luau_ast_1.default.strings[", "]]);
        const indexType = state.typeChecker.getIndexTypeOfType(state.getType(node.expression.expression), typescript_1.default.IndexKind.Number);
        if (indexType && !(0, types_1.isDefinitelyType)(indexType, types_1.isStringType, types_1.isNumberType)) {
            expression = state.pushToVarIfComplex(expression, "exp");
            const id = state.pushToVar(luau_ast_1.default.call(luau_ast_1.default.globals.table.create, [luau_ast_1.default.unary("#", expression)]), "result");
            const keyId = luau_ast_1.default.tempId("k");
            const valueId = luau_ast_1.default.tempId("v");
            state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
                ids: luau_ast_1.default.list.make(keyId, valueId),
                expression,
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                        expression: id,
                        index: keyId,
                    }),
                    operator: "=",
                    right: luau_ast_1.default.call(luau_ast_1.default.globals.tostring, [valueId]),
                })),
            }));
            expression = id;
        }
        return luau_ast_1.default.call(luau_ast_1.default.globals.table.concat, [expression, args[0]]);
    },
    move: (state, node, expression, args) => {
        const moveArgs = [expression, (0, offset_1.offset)(args[0], 1), (0, offset_1.offset)(args[1], 1), (0, offset_1.offset)(args[2], 1)];
        if (args[3]) {
            moveArgs.push(args[3]);
        }
        return luau_ast_1.default.call(luau_ast_1.default.globals.table.move, moveArgs);
    },
    includes: (state, node, expression, args) => {
        const callArgs = [expression, args[0]];
        if (args[1]) {
            callArgs.push((0, offset_1.offset)(args[1], 1));
        }
        return luau_ast_1.default.binary(luau_ast_1.default.call(luau_ast_1.default.globals.table.find, callArgs), "~=", luau_ast_1.default.nil());
    },
    indexOf: (state, node, expression, args) => {
        const findArgs = [expression, args[0]];
        if (args.length > 1) {
            findArgs.push((0, offset_1.offset)(args[1], 1));
        }
        return (0, offset_1.offset)(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BinaryExpression, {
            left: luau_ast_1.default.call(luau_ast_1.default.globals.table.find, findArgs),
            operator: "or",
            right: luau_ast_1.default.number(0),
        }), -1);
    },
    every: makeEveryMethod((keyId, valueId, expression) => [valueId, (0, offset_1.offset)(keyId, -1), expression]),
    some: makeSomeMethod((keyId, valueId, expression) => [valueId, (0, offset_1.offset)(keyId, -1), expression]),
    forEach: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const callbackId = state.pushToVarIfNonId(args[0], "callback");
        const keyId = luau_ast_1.default.tempId("k");
        const valueId = luau_ast_1.default.tempId("v");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            ids: luau_ast_1.default.list.make(keyId, valueId),
            expression,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
                expression: luau_ast_1.default.call(callbackId, [valueId, (0, offset_1.offset)(keyId, -1), expression]),
            })),
        }));
        return !(0, isUsedAsStatement_1.isUsedAsStatement)(node) ? luau_ast_1.default.nil() : luau_ast_1.default.none();
    },
    map: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const newValueId = state.pushToVar(luau_ast_1.default.call(luau_ast_1.default.globals.table.create, [luau_ast_1.default.unary("#", expression)]), "newValue");
        const callbackId = state.pushToVarIfNonId(args[0], "callback");
        const keyId = luau_ast_1.default.tempId("k");
        const valueId = luau_ast_1.default.tempId("v");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            ids: luau_ast_1.default.list.make(keyId, valueId),
            expression,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                    expression: newValueId,
                    index: keyId,
                }),
                operator: "=",
                right: luau_ast_1.default.call(callbackId, [valueId, (0, offset_1.offset)(keyId, -1), expression]),
            })),
        }));
        return newValueId;
    },
    mapFiltered: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const newValueId = state.pushToVar(luau_ast_1.default.array(), "newValue");
        const callbackId = state.pushToVarIfNonId(args[0], "callback");
        const lengthId = state.pushToVar(luau_ast_1.default.number(0), "length");
        const keyId = luau_ast_1.default.tempId("k");
        const valueId = luau_ast_1.default.tempId("v");
        const resultId = luau_ast_1.default.tempId("result");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            ids: luau_ast_1.default.list.make(keyId, valueId),
            expression,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
                left: resultId,
                right: luau_ast_1.default.call(callbackId, [valueId, (0, offset_1.offset)(keyId, -1), expression]),
            }), luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
                condition: luau_ast_1.default.binary(resultId, "~=", luau_ast_1.default.nil()),
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: lengthId,
                    operator: "+=",
                    right: luau_ast_1.default.number(1),
                }), luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                        expression: newValueId,
                        index: lengthId,
                    }),
                    operator: "=",
                    right: resultId,
                })),
                elseBody: luau_ast_1.default.list.make(),
            })),
        }));
        return newValueId;
    },
    filterUndefined: (state, node, expression) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const lengthId = state.pushToVar(luau_ast_1.default.number(0), "length");
        const indexId1 = luau_ast_1.default.tempId("i");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            ids: luau_ast_1.default.list.make(indexId1),
            expression,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
                condition: luau_ast_1.default.binary(indexId1, ">", lengthId),
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: lengthId,
                    operator: "=",
                    right: indexId1,
                })),
                elseBody: luau_ast_1.default.list.make(),
            })),
        }));
        const resultId = state.pushToVar(luau_ast_1.default.array(), "result");
        const resultLengthId = state.pushToVar(luau_ast_1.default.number(0), "resultLength");
        const indexId2 = luau_ast_1.default.tempId("i");
        const valueId = luau_ast_1.default.tempId("v");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.NumericForStatement, {
            id: indexId2,
            start: luau_ast_1.default.number(1),
            end: lengthId,
            step: undefined,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
                left: valueId,
                right: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                    expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                    index: indexId2,
                }),
            }), luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
                condition: luau_ast_1.default.binary(valueId, "~=", luau_ast_1.default.nil()),
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: resultLengthId,
                    operator: "+=",
                    right: luau_ast_1.default.number(1),
                }), luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                        expression: resultId,
                        index: resultLengthId,
                    }),
                    operator: "=",
                    right: valueId,
                })),
                elseBody: luau_ast_1.default.list.make(),
            })),
        }));
        return resultId;
    },
    filter: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const newValueId = state.pushToVar(luau_ast_1.default.array(), "newValue");
        const callbackId = state.pushToVarIfNonId(args[0], "callback");
        const lengthId = state.pushToVar(luau_ast_1.default.number(0), "length");
        const keyId = luau_ast_1.default.tempId("k");
        const valueId = luau_ast_1.default.tempId("v");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            ids: luau_ast_1.default.list.make(keyId, valueId),
            expression,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
                condition: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BinaryExpression, {
                    left: luau_ast_1.default.call(callbackId, [valueId, (0, offset_1.offset)(keyId, -1), expression]),
                    operator: "==",
                    right: luau_ast_1.default.bool(true),
                }),
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: lengthId,
                    operator: "+=",
                    right: luau_ast_1.default.number(1),
                }), luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                        expression: newValueId,
                        index: lengthId,
                    }),
                    operator: "=",
                    right: valueId,
                })),
                elseBody: luau_ast_1.default.list.make(),
            })),
        }));
        return newValueId;
    },
    reduce: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        let start = luau_ast_1.default.number(1);
        const end = luau_ast_1.default.unary("#", expression);
        const step = 1;
        const lengthExp = luau_ast_1.default.unary("#", expression);
        let resultId;
        if (args.length < 2) {
            state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
                condition: luau_ast_1.default.binary(lengthExp, "==", luau_ast_1.default.number(0)),
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
                    expression: luau_ast_1.default.call(luau_ast_1.default.globals.error, [
                        luau_ast_1.default.string("Attempted to call `ReadonlyArray.reduce()` on an empty array without an initialValue."),
                    ]),
                })),
                elseBody: luau_ast_1.default.list.make(),
            }));
            resultId = state.pushToVar(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                index: start,
            }), "result");
            start = (0, offset_1.offset)(start, step);
        }
        else {
            resultId = state.pushToVar(args[1], "result");
        }
        const callbackId = state.pushToVar(args[0], "callback");
        const iteratorId = luau_ast_1.default.tempId("i");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.NumericForStatement, {
            id: iteratorId,
            start,
            end,
            step: step === 1 ? undefined : luau_ast_1.default.number(step),
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                left: resultId,
                operator: "=",
                right: luau_ast_1.default.call(callbackId, [
                    resultId,
                    luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                        expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                        index: iteratorId,
                    }),
                    (0, offset_1.offset)(iteratorId, -1),
                    expression,
                ]),
            })),
        }));
        return resultId;
    },
    find: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const callbackId = state.pushToVarIfNonId(args[0], "callback");
        const loopId = luau_ast_1.default.tempId("i");
        const valueId = luau_ast_1.default.tempId("v");
        const resultId = state.pushToVar(undefined, "result");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            expression,
            ids: luau_ast_1.default.list.make(loopId, valueId),
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
                condition: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BinaryExpression, {
                    left: luau_ast_1.default.call(callbackId, [valueId, (0, offset_1.offset)(loopId, -1), expression]),
                    operator: "==",
                    right: luau_ast_1.default.bool(true),
                }),
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: resultId,
                    operator: "=",
                    right: valueId,
                }), luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BreakStatement, {})),
                elseBody: luau_ast_1.default.list.make(),
            })),
        }));
        return resultId;
    },
    findIndex: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const callbackId = state.pushToVarIfNonId(args[0], "callback");
        const loopId = luau_ast_1.default.tempId("i");
        const valueId = luau_ast_1.default.tempId("v");
        const resultId = state.pushToVar(luau_ast_1.default.number(-1), "result");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            expression,
            ids: luau_ast_1.default.list.make(loopId, valueId),
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
                condition: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BinaryExpression, {
                    left: luau_ast_1.default.call(callbackId, [valueId, (0, offset_1.offset)(loopId, -1), expression]),
                    operator: "==",
                    right: luau_ast_1.default.bool(true),
                }),
                statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                    left: resultId,
                    operator: "=",
                    right: (0, offset_1.offset)(loopId, -1),
                }), luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BreakStatement, {})),
                elseBody: luau_ast_1.default.list.make(),
            })),
        }));
        return resultId;
    },
};
const ARRAY_METHODS = {
    push: (state, node, expression, args) => {
        if (args.length === 0) {
            return luau_ast_1.default.unary("#", expression);
        }
        expression = state.pushToVarIfComplex(expression, "exp");
        for (let i = 0; i < args.length; i++) {
            state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
                expression: luau_ast_1.default.call(luau_ast_1.default.globals.table.insert, [expression, args[i]]),
            }));
        }
        return !(0, isUsedAsStatement_1.isUsedAsStatement)(node) ? luau_ast_1.default.unary("#", expression) : luau_ast_1.default.none();
    },
    pop: (state, node, expression) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        let lengthExp = luau_ast_1.default.unary("#", expression);
        const returnValueIsUsed = !(0, isUsedAsStatement_1.isUsedAsStatement)(node);
        let retValue;
        if (returnValueIsUsed) {
            lengthExp = state.pushToVar(lengthExp, "length");
            retValue = state.pushToVar(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                index: lengthExp,
            }), "result");
        }
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
            left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                index: lengthExp,
            }),
            operator: "=",
            right: luau_ast_1.default.nil(),
        }));
        return returnValueIsUsed ? retValue : luau_ast_1.default.none();
    },
    shift: (state, node, expression) => luau_ast_1.default.call(luau_ast_1.default.globals.table.remove, [expression, luau_ast_1.default.number(1)]),
    unshift: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        for (let i = args.length - 1; i >= 0; i--) {
            const arg = args[i];
            state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
                expression: luau_ast_1.default.call(luau_ast_1.default.globals.table.insert, [expression, luau_ast_1.default.number(1), arg]),
            }));
        }
        return !(0, isUsedAsStatement_1.isUsedAsStatement)(node) ? luau_ast_1.default.unary("#", expression) : luau_ast_1.default.none();
    },
    insert: (state, node, expression, args) => {
        return luau_ast_1.default.call(luau_ast_1.default.globals.table.insert, [expression, (0, offset_1.offset)(args[0], 1), args[1]]);
    },
    remove: (state, node, expression, args) => luau_ast_1.default.call(luau_ast_1.default.globals.table.remove, [expression, (0, offset_1.offset)(args[0], 1)]),
    unorderedRemove: (state, node, expression, args) => {
        const indexExp = state.pushToVarIfComplex((0, offset_1.offset)(args[0], 1), "index");
        expression = state.pushToVarIfComplex(expression, "exp");
        const lengthId = state.pushToVar(luau_ast_1.default.unary("#", expression), "length");
        const valueIsUsed = !(0, isUsedAsStatement_1.isUsedAsStatement)(node);
        const valueId = state.pushToVar(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
            expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
            index: indexExp,
        }), "value");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
            condition: luau_ast_1.default.binary(valueId, "~=", luau_ast_1.default.nil()),
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                    expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                    index: indexExp,
                }),
                operator: "=",
                right: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                    expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                    index: lengthId,
                }),
            }), luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                    expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                    index: lengthId,
                }),
                operator: "=",
                right: luau_ast_1.default.nil(),
            })),
            elseBody: luau_ast_1.default.list.make(),
        }));
        return valueIsUsed ? valueId : luau_ast_1.default.none();
    },
    sort: (state, node, expression, args) => {
        const valueIsUsed = !(0, isUsedAsStatement_1.isUsedAsStatement)(node);
        if (valueIsUsed) {
            expression = state.pushToVarIfComplex(expression, "exp");
        }
        args.unshift(expression);
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
            expression: luau_ast_1.default.call(luau_ast_1.default.globals.table.sort, args),
        }));
        return valueIsUsed ? expression : luau_ast_1.default.none();
    },
    clear: (state, node, expression) => {
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
            expression: luau_ast_1.default.call(luau_ast_1.default.globals.table.clear, [expression]),
        }));
        return !(0, isUsedAsStatement_1.isUsedAsStatement)(node) ? luau_ast_1.default.nil() : luau_ast_1.default.none();
    },
};
const READONLY_SET_MAP_SHARED_METHODS = {
    isEmpty: (state, node, expression) => luau_ast_1.default.binary(luau_ast_1.default.call(luau_ast_1.default.globals.next, [expression]), "==", luau_ast_1.default.nil()),
    size: (state, node, expression) => {
        const sizeId = state.pushToVar(luau_ast_1.default.number(0), "size");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            ids: luau_ast_1.default.list.make(luau_ast_1.default.tempId()),
            expression,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                left: sizeId,
                operator: "+=",
                right: luau_ast_1.default.number(1),
            })),
        }));
        return sizeId;
    },
    has: (state, node, expression, args) => {
        const left = luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
            expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
            index: args[0],
        });
        return luau_ast_1.default.binary(left, "~=", luau_ast_1.default.nil());
    },
};
const SET_MAP_SHARED_METHODS = {
    delete: (state, node, expression, args) => {
        const arg = state.pushToVarIfComplex(args[0], "value");
        const valueIsUsed = !(0, isUsedAsStatement_1.isUsedAsStatement)(node);
        let valueExistedId;
        if (valueIsUsed) {
            expression = state.pushToVarIfNonId(expression, "exp");
            valueExistedId = state.pushToVar(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BinaryExpression, {
                left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                    expression,
                    index: arg,
                }),
                operator: "~=",
                right: luau_ast_1.default.nil(),
            }), "valueExisted");
        }
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
            left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                index: arg,
            }),
            operator: "=",
            right: luau_ast_1.default.nil(),
        }));
        return valueIsUsed ? valueExistedId : luau_ast_1.default.none();
    },
    clear: (state, node, expression) => {
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
            expression: luau_ast_1.default.call(luau_ast_1.default.globals.table.clear, [expression]),
        }));
        return !(0, isUsedAsStatement_1.isUsedAsStatement)(node) ? luau_ast_1.default.nil() : luau_ast_1.default.none();
    },
};
const READONLY_SET_METHODS = {
    ...READONLY_SET_MAP_SHARED_METHODS,
    forEach: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const callbackId = state.pushToVarIfNonId(args[0], "callback");
        const valueId = luau_ast_1.default.tempId("v");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            ids: luau_ast_1.default.list.make(valueId),
            expression,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
                expression: luau_ast_1.default.call(callbackId, [valueId, valueId, expression]),
            })),
        }));
        return !(0, isUsedAsStatement_1.isUsedAsStatement)(node) ? luau_ast_1.default.nil() : luau_ast_1.default.none();
    },
};
const SET_METHODS = {
    ...SET_MAP_SHARED_METHODS,
    add: (state, node, expression, args) => {
        const valueIsUsed = !(0, isUsedAsStatement_1.isUsedAsStatement)(node);
        if (valueIsUsed) {
            expression = state.pushToVarIfComplex(expression, "exp");
        }
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
            left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                index: args[0],
            }),
            operator: "=",
            right: luau_ast_1.default.bool(true),
        }));
        return valueIsUsed ? expression : luau_ast_1.default.none();
    },
};
const READONLY_MAP_METHODS = {
    ...READONLY_SET_MAP_SHARED_METHODS,
    forEach: (state, node, expression, args) => {
        expression = state.pushToVarIfComplex(expression, "exp");
        const callbackId = state.pushToVarIfNonId(args[0], "callback");
        const keyId = luau_ast_1.default.tempId("k");
        const valueId = luau_ast_1.default.tempId("v");
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
            ids: luau_ast_1.default.list.make(keyId, valueId),
            expression,
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
                expression: luau_ast_1.default.call(callbackId, [valueId, keyId, expression]),
            })),
        }));
        return !(0, isUsedAsStatement_1.isUsedAsStatement)(node) ? luau_ast_1.default.nil() : luau_ast_1.default.none();
    },
    get: (state, node, expression, args) => luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
        expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
        index: args[0],
    }),
};
const MAP_METHODS = {
    ...SET_MAP_SHARED_METHODS,
    set: (state, node, expression, args) => {
        const [keyExp, valueExp] = args;
        const valueIsUsed = !(0, isUsedAsStatement_1.isUsedAsStatement)(node);
        if (valueIsUsed) {
            expression = state.pushToVarIfComplex(expression, "exp");
        }
        state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
            left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
                index: keyExp,
            }),
            operator: "=",
            right: valueExp,
        }));
        return valueIsUsed ? expression : luau_ast_1.default.none();
    },
};
const PROMISE_METHODS = {
    then: (state, node, expression, args) => luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.MethodCallExpression, {
        expression: (0, convertToIndexableExpression_1.convertToIndexableExpression)(expression),
        name: "andThen",
        args: luau_ast_1.default.list.make(...args),
    }),
};
exports.PROPERTY_CALL_MACROS = {
    CFrame: makeMathSet("+", "-", "*"),
    UDim: makeMathSet("+", "-"),
    UDim2: makeMathSet("+", "-"),
    Vector2: makeMathSet("+", "-", "*", "/", "//"),
    Vector2int16: makeMathSet("+", "-", "*", "/"),
    Vector3: makeMathSet("+", "-", "*", "/", "//"),
    Vector3int16: makeMathSet("+", "-", "*", "/"),
    Number: makeMathSet("//"),
    String: STRING_CALLBACKS,
    ArrayLike: ARRAY_LIKE_METHODS,
    ReadonlyArray: READONLY_ARRAY_METHODS,
    Array: ARRAY_METHODS,
    ReadonlySet: READONLY_SET_METHODS,
    Set: SET_METHODS,
    ReadonlyMap: READONLY_MAP_METHODS,
    Map: MAP_METHODS,
    Promise: PROMISE_METHODS,
};
function header(text) {
    return luau_ast_1.default.comment(` ▼ ${text} ▼`);
}
function footer(text) {
    return luau_ast_1.default.comment(` ▲ ${text} ▲`);
}
function wasExpressionPushed(statements, expression) {
    if (luau_ast_1.default.list.isNonEmpty(statements)) {
        const firstStatement = statements.head.value;
        if (luau_ast_1.default.isVariableDeclaration(firstStatement)) {
            if (!luau_ast_1.default.list.isList(firstStatement.left) && luau_ast_1.default.isTemporaryIdentifier(firstStatement.left)) {
                if (firstStatement.right === expression) {
                    return true;
                }
            }
        }
    }
    return false;
}
function wrapComments(methodName, callback) {
    return (state, callNode, callExp, args) => {
        const [expression, prereqs] = state.capture(() => callback(state, callNode, callExp, args));
        let size = luau_ast_1.default.list.size(prereqs);
        if (size > 0) {
            const wasPushed = wasExpressionPushed(prereqs, callExp);
            let pushStatement;
            if (wasPushed) {
                pushStatement = luau_ast_1.default.list.shift(prereqs);
                size--;
            }
            if (size > 1) {
                luau_ast_1.default.list.unshift(prereqs, header(methodName));
                if (wasPushed && pushStatement) {
                    luau_ast_1.default.list.unshift(prereqs, pushStatement);
                }
                luau_ast_1.default.list.push(prereqs, footer(methodName));
            }
            else {
                if (wasPushed && pushStatement) {
                    luau_ast_1.default.list.unshift(prereqs, pushStatement);
                }
            }
        }
        state.prereqList(prereqs);
        return expression;
    };
}
for (const [className, macroList] of Object.entries(exports.PROPERTY_CALL_MACROS)) {
    for (const [methodName, macro] of Object.entries(macroList)) {
        macroList[methodName] = wrapComments(`${className}.${methodName}`, macro);
    }
}
//# sourceMappingURL=propertyCallMacros.js.map