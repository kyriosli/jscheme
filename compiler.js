#!/usr/bin/env node

var types = {
    S_PROGRAM: 's_program',
    S_LIST: 's_list',
    QUOTE: 'quote',
    IDENTIFIER: 'identifier',
    STRING: 'string',
    NUMBER: 'number',
    INTEGER: 'integer'
};

var assert = require('assert');


exports.generate = function (ast) {
    var debug = false;
    var globals = {
        'global': '_',
        'this': '_',
        '.': '.',
        '+': '+',
        '-': '-',
        '*': '*',
        '/': '/',
        '&': '&',
        '|': '|',
        '^': '^',
        '%': '%',
        '<': '<',
        '>': '>',
        'eq?': '=',
        'not': '!'
    };

    var currentScope = globals, variables = 0, scopes = [];

    var keywords = {
        'define': function (expr, name, val) {
            if (arguments.length !== 3)
                throw 'ill-formed define: requires exact 2 exprs' + expr.pos;
            if (name.type !== types.IDENTIFIER)
                throw'ill-formed define: unexpected ' + name.type + name.pos;
            var arg = variables++,
                argName = arg < 10 ? '' + arg : arg < 36 ? ch(arg + 23) : ch(arg + 29);

            return 'd' + (currentScope[name.raw] = argName) + onExpr(val);
        },
        'lambda': function (expr, argNames) {
            if (arguments.length < 3)
                throw 'ill-formed lambda: requires at least 1 exprs' + expr.pos;

            // save
            var oldVars = variables, argc;
            scopes.push(currentScope);
            currentScope = {__proto__: currentScope, 'this': '$'};
            variables = 0;

            if (argNames.type === types.IDENTIFIER) { // (lambda arguments)
                argc = -1;
                currentScope[argNames.raw] = variables++;
            } else if (argNames.type === types.S_LIST) {
                for (var id of argNames.exprs) {
                    if (id.type !== types.IDENTIFIER)
                        throw 'ill-formed lambda: arguments list should be list of identifiers' + id.pos;
                    currentScope[id.raw] = variables++;
                }
                argc = variables;
            } else {
                throw 'ill-formed lambda: arguments requires s-list or identifier' + argNames.pos
            }
            var ret = '';
            for (var i = 2; i < arguments.length; i++) {
                ret += onExpr(arguments[i], true);
            }
            currentScope = scopes.pop();
            variables = oldVars;

            //console.log('lambda args %d, exprs %d, code %s', argc, arguments.length - 2, ret);
            return 'l' + ch(argc) + ch(arguments.length - 2) + ch(ret.length) + ret;
        },
        'set!': function (expr, name, val) {
            if (arguments.length === 1 || arguments.length > 3)
                throw 'ill-formed set!: one or two arguments is expected' + expr.pos;
            var isDelete = arguments.length === 2;
            if (name.type === types.IDENTIFIER) {
                var arg = onExpr(name), isCurrent = arg[0] === 'w';
                arg = arg.substr(1);
                if (isCurrent) { // is current
                    if (isDelete) {
                        delete currentScope[arg];
                        return 'p' + arg
                    } else {
                        return 'q' + arg + onExpr(val)
                    }
                } else { // not current
                    var variable = arg[1]; // 0-9A-Fa-f
                    if (/^\d$/.test(variable)) { // 0-9 => B-K
                        variable = ch(+variable + 18)
                    } else if (/A-O/.test(variable)) { // 10~24
                        variable = ch(num(variable) + 11);
                    } else {
                        variable = '$1' + variable;
                    }
                    var ref = 'e' + arg[0] + variable;
                    if (isDelete) {
                        var scopeIdx = num(arg),
                            scope = scopeIdx === scopes.length ? currentScope : scopes[scopeIdx];
                        delete scope[arg[1]];
                        return 'r' + ref
                    } else {
                        return 's' + ref + onExpr(val)
                    }
                }

            } else if (name.type === types.S_LIST) {
                var refCode = onExpr(name);
                if (refCode[0] === '$') {
                    refCode = refCode.substr(2);
                    if (isDelete) {
                        return 'r' + refCode
                    } else {
                        return 's' + refCode + onExpr(val)
                    }
                }
            }
            throw 'ill-formed set!: an identifier or ref is expected' + name.pos;

        },
        'trace': function (expr, subject) {
            if (arguments.length !== 2)
                throw 'trace accepts an expr' + expr.pos;
            return 't' + onExpr(subject) + ch(expr.pos.length) + expr.pos;
        },
        'if': function (expr, cond, t, f) {
            var lambda = expr.lambda;
            if (arguments.length === 2)
                throw 'ill-formed if: condition is expected' + expr.pos;
            if (arguments.length < 3 || arguments.length > 4)
                throw 'ill-formed if: one or two arguments is expected' + expr.pos;
            var cond1 = onExpr(t, lambda), cond2 = arguments.length === 4 ? onExpr(f, lambda) : 'u';
            return (lambda ? '?' : '@') + onExpr(cond) + ch(cond2.length + 3) + cond2 + 'k' + ch(cond1.length + 1) + cond1;
        },
        'call': function (expr, target, callee) {
            if (arguments.length < 3)
                throw 'ill-formed call: callee and target is expected' + expr.pos;

            var argc = arguments.length - 3;
            var ret = 'a' + onExpr(target) + onExpr(callee) + ch(argc);
            for (var i = 0; i < argc; i++) {
                ret += onExpr(arguments[3 + i]);
            }
            return ret;
        },
        'invoke': function (expr, target, method) {
            if (arguments.length < 3)
                throw 'ill-formed call: target and method is expected' + expr.pos;

            var argc = arguments.length - 3;
            var ret = 'i' + onExpr(method) + onExpr(target) + ch(argc);
            for (var i = 0; i < argc; i++) {
                ret += onExpr(arguments[3 + i]);
            }
            return ret;
        },
        'method': function (expr, lambda) {
            if (arguments.length !== 2)
                throw 'ill-formed method: one argument is expected' + expr.pos;
            return 'm' + onExpr(lambda)
        },
        'ref': function (expr, obj, key) {
            if (arguments.length !== 3)
                throw 'ill-formed ref: two arguments is expected' + expr.pos;

            if (expr.lambda) {
                return 'u';
            }
            // an expression
            var ret = onExpr(obj) + onExpr(key);
            return '$' + ch(ret.length) + ret
        }
    };

    var exprs = ast.type === types.S_PROGRAM ? ast.exprs : [ast];
    return ch(exprs.length) + onExprs(exprs, true);

    function onExprs(exprs, lambda) {
        var ret = '';
        for (var expr of exprs) {
            ret += onExpr(expr, lambda);
        }
        return ret;
    }

    function onExpr(expr, lambda) {
        debug && console.log('onExpr', expr);
        switch (expr.type) {
            case types.S_LIST:
                return onSList(expr.exprs, lambda);
            case types.INTEGER:
                if (expr.value >= -1 && expr.value <= 24) {
                    return ch(expr.value + 18)
                }
            case types.NUMBER:
                var str = expr.value + '';
                if (str.length > expr.raw.length)
                    str = expr.raw;
                return 'n' + ch(str.length) + str;
            case types.STRING:
                return '$' + ch(expr.value.length) + expr.value;
            case types.IDENTIFIER:
                var name = expr.raw;
                if (name in currentScope) { // determine which scope to use
                    if (currentScope.hasOwnProperty(name)) {
                        return 'w' + currentScope[name];
                    }
                    var curr = currentScope, n = scopes.length;
                    while (!curr.hasOwnProperty(name)) curr = scopes[--n];
                    //console.log('name %s is variable %s in scope %d', name, curr[name], n);
                    return 'v' + ch(n) + curr[name]
                } else if (name === 'undefined') {
                    return 'u'
                } else if (name === 'null') {
                    return 'z'
                } else {
                    throw 'unbound variable: ' + name + expr.pos
                }
            //ret += 'c'+ch(expr.exprs.length-)
        }
    }

    function onSList(exprs, lambda) {
        if (exprs.length === 0) { // TODO an empty list
            return 'u';
        }
        var callee = exprs[0];
        if (callee.type === types.IDENTIFIER) {
            var identifier = callee.raw;
            if (!(identifier in currentScope) && (identifier in keywords)) {
                callee.lambda = lambda;
                return keywords[identifier].apply(null, exprs)
            }
        }
        // a call
        var ret = (lambda ? 'b' : 'c') + onExpr(callee) + ch(exprs.length - 1);
        for (var i = 1; i < exprs.length; i++) {
            ret += onExpr(exprs[i]);
        }
        if (/^cv0[+\-*/&^%|=<>.]2/.test(ret)) {// shorthand
            ret = '%' + ret[3] + ret.substr(5);
        }
        return ret;
    }

    function ch(num) {
        return String.fromCharCode(num + 48);
    }

    function num(ch) {
        return ch.charCodeAt(0) - 48
    }

};

exports.parse = function (input, filename) {
    var reg = /^\s*(;.*?(?:\r?\n|$)|'|\(|\)|"(?:[^\r\n\t\\"]|\\[rnt0-7"'\\]|\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4})*"|[^\s"\(\)]+|$)/;

    var tokens = [];
    var remained = input;
    while (remained) {
        //console.log('parse', input);
        var m = reg.exec(remained);
        if (!m)
            throw 'unexpected token ' + remained[0] + getPos(0);

        tokens.push({token: m[1], pos: getPos(m[0].length - m[1].length)});
        remained = remained.substr(m[0].length);
    }
    if (tokens[tokens.length - 1].token !== '') {
        tokens.push({token: ''})
    }
    //console.log('tokens', tokens);

    var ret = {
        type: types.S_PROGRAM,
        exprs: getExprs()
    };

    var last = tokens[0];

    if (last.token !== '')
        throw  'unexpected token ' + last.token + last.pos;

    return ret;

    function getPos(extra) {
        var passed = input.substr(0, input.length - remained.length + extra).split('\n');
        return '\n    at ' + (filename ? filename + ':' : '') + passed.length + ':' + (passed[passed.length - 1].length + 1)
    }

    function getExpr() {
        for (; ;) {
            var curr = tokens[0], token = curr.token;
            if (!token || token === ')') {
                return null;
            }
            tokens.shift();
            if (token[0] === ';') continue;
            if (token === '\'') {
                return {
                    type: types.QUOTE,
                    expr: getExpr(),
                    pos: curr.pos
                }
            }
            if (token === '(') {
                var ret = {
                    type: types.S_LIST,
                    exprs: getExprs(),
                    pos: curr.pos
                };
                curr = tokens.shift();
                token = curr.token;
                if (token !== ')')
                    'unexpected end of file';

                return ret;
            }
            if (token[0] === '"') {
                return {
                    type: types.STRING,
                    value: JSON.parse(token),
                    raw: token,
                    pos: curr.pos
                }
            }
            var num = Number(token);
            if (!isNaN(num)) {
                return {
                    type: (num | 0) === num ? types.INTEGER : types.NUMBER,
                    value: num,
                    raw: token,
                    pos: curr.pos
                }
            }
            return {
                type: types.IDENTIFIER,
                raw: token,
                pos: curr.pos
            }
        }
    }

    function getExprs() {
        //console.log('call getExprs', tokens.slice(0, 2));
        var ret = [], expr;
        while (expr = getExpr()) ret.push(expr);
        return ret;
    }
};

if (process.mainModule === module) {
    var _fs = require('fs');

    var inputFile = process.argv[2];
    var input = _fs.readFileSync(inputFile, 'utf8');

    var ast = exports.parse(input, process.argv[2]);
    // console.log(require('util').inspect(ast, {depth: 99}));
    _fs.writeFileSync(process.argv[3], exports.generate(ast), 'utf8');
}