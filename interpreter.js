#!/usr/bin/env node

function run(code) {
    var global = {
        _: this,
        "+": function (ret) {
            ret = +ret;
            for (var i = 1; i < arguments.length; i++)
                ret += +arguments[i]
            return ret;
        }, '=': function (a, b) {
            return a === b
        }, '-': function (ret) {
            for (var i = 1; i < arguments.length; i++)
                ret -= arguments[i]
            return ret;
        }, '*': function (ret) {
            for (var i = 1; i < arguments.length; i++)
                ret *= arguments[i]
            return ret;
        }, '/': function (ret) {
            for (var i = 1; i < arguments.length; i++)
                ret /= arguments[i]
            return ret;
        }, '.': function (ret) {
            for (var i = 1; i < arguments.length; i++)
                ret = ret[arguments[i]]
            return ret;
        }, '!': function (ret) {
            return !ret
        }
    };
    global.$0 = global;
    global.depth = 0;
    var binaries = {
        '=': binary('==='),
        '.': function (x, y) {
            return x[y]
        }
    };
    for (var i = 0, names = '+-*/&^%|<>'; i < names.length; i++) {
        binaries[names[i]] = binary(names[i]);
    }

    function binary(op) {
        return Function('x,y', 'return x' + op + 'y')
    }

    return runner(code.substr(1), global, code.charCodeAt(0) - 48);

    function runner(code, scope, exprs) {
        var ret, pc = 0;

        while (exprs--) {
            ret = onexpr();
            //console.log('ins[' + exprs + ']: ' + String.fromCharCode(ins) + ' =>', ret);
        }
        return ret;

        function onexpr() {
            var val, len, ret, arg, callee, i;

            switch (i = code.charCodeAt(pc++)) {
                case 36: // string
                    return str();
                case 37: // binary ### HOT ###
                    return binaries[code[pc++]](onexpr(), onexpr());
                case 63: // ? ### HOT ###
                    if (onexpr()) {
                        pc += num();
                    } else {
                        pc++;
                    }
                    exprs++;
                    return;
                case 64:
                    if (onexpr()) { // true
                        pc += num();
                        return onexpr();
                    } else { // false
                        pc++;
                        val = onexpr();
                        pc++;
                        pc += num();
                        return val;
                    }
                case 99: // call ### HOT ###
                case 98:
                    callee = onexpr();
                    arg = readList();
                    if (callee.apply) {
                        return callee.apply(null, arg)
                    }
                    // call lambda
                    ret = i === 98 && !exprs;
                    if (ret && scope.callee === callee) { // scope reuse
                        //console.log('scope reused', tailPC);
                        val = scope;
                    } else {
                        val = mkScope(callee); // new scope
                    }
                    if ((len = callee.argc) > -1) {
                        for (i = 0; i < len; i++) {
                            val[i] = arg[i]
                        }
                    } else {
                        val[0] = arg;
                    }

                    if (ret) { // tail call
                        //console.log('>>> tail call optimized');
                        code = callee.code;
                        exprs = callee.exprs;
                        scope = val;
                        pc = 0;
                        return
                    }
                    return runner(callee.code, val, callee.exprs);

                case 118: // variable ### HOT ###
                    return scope['$' + num()][code[pc++]];
                case 119: // current scope variable ### HOT ###
                    return scope[code[pc++]];
                case 100: // define
                    scope[code[pc++]] = onexpr();
                    //console.log('set', name, scope[name]);
                    return;
                case 105: // invoke: argc,...args,method,target
                    return onexpr().apply(onexpr(), readList());
                case 107: // skip
                    exprs++;
                    pc += num();
                    return;
                case 108: // lambda
                    return {
                        argc: num(),
                        exprs: num(),
                        code: str(),
                        scope: scope
                    };
                case 109: // method
                    return method(onexpr());
                //console.log('lambda', ret, pc, exprs);
                case 110: // number
                    return +str();
                case 112:
                case 113:
                case 114: // remove
                case 115: // set!
                    val = i & 2 ? scope['$' + num()] : scope; // scope
                    arg = code[pc++];
                    ret = val[arg];
                    if (i & 1) {
                        val[arg] = onexpr();
                    } else {
                        delete val[arg];
                    }
                    return ret;
                case 122: // z
                    return null;
                case 116: // trace
                    return console.log('\x1b[36m[trace]\x1b[0m '
                        + require('util').inspect(onexpr()) + str());
                case 117: // undefined
                    return;
                default:
                    return i - 66;
            }
        }

        function str() {
            return code.substring(pc + 1, pc += num() + 1)
        }

        function readList() {
            for (var i = 0, len = num(), ret = []; i < len; i++) {
                ret[i] = onexpr();
            }
            return ret;
        }

        function num() {
            return code.charCodeAt(pc++) - 48
        }

    }

    function method(lambda) {
        return function () {
            var scope = mkScope(lambda);
            scope.$ = this;
            for (var i = 0; i < lambda.argc; i++) {
                scope[i] = arguments[i];
            }
            return runner(lambda.code, scope, lambda.exprs)
        };
    }

    function mkScope(lambda) {
        var depth = lambda.scope.depth + 1, scope = {
            depth: depth,
            callee: lambda
        };
        scope['$' + depth] = scope;
        while (depth--)
            scope['$' + depth] = lambda.scope['$' + depth];
        return scope;
    }

}

if (typeof module === 'object') {
    module.exports = run;

    if (typeof process === 'object' && process.mainModule === module) {
        var _fs = require('fs');

        var inputFile = process.argv[2];
        var input = _fs.readFileSync(inputFile, 'utf8');

        console.log('result:', run(input));
    }
}