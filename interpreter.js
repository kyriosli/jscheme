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
            ret = onexpr(true);
            //console.log('ins[' + exprs + ']: ' + String.fromCharCode(ins) + ' =>', ret);
        }
        return ret;


        function onexpr(multiple) {
            var ins = code.charCodeAt(pc++), val, len, ret, args, callee, i;
            //console.log('ins[' + exprs + ']: ' + code[pc - 1] + ' pc=' + pc);
            switch (ins) {
                case 36: // string
                    return code.substring(pc + 1, pc += num() + 1);
                case 37: // binary
                    return binaries[code[pc++]](onexpr(), onexpr());
                case 63: // ?
                    if (i = onexpr()) {
                        pc++;
                    } else {
                        pc += num();
                    }
                    if (multiple) {
                        exprs++;
                    } else {
                        val = onexpr();
                        if (i) {
                            pc++;
                            pc += num();
                        }
                    }
                    return val;
                case 99: // call
                    callee = onexpr();
                    args = readList();
                    if (callee.apply) {
                        return callee.apply(null, args)
                    } else { // call lambda
                        //console.log('>>> BEGIN call lambda', callee, args);

                        if (!multiple || exprs || scope.callee !== callee) {
                            val = mkScope(callee); // new scope
                        } else { // scope reuse
                            //console.log('scope reused', tailPC);
                            val = scope;
                        }
                        if (callee.argc === -1) {
                            val[0] = args;
                        } else {
                            for (i = 0, len = callee.argc; i < len; i++) {
                                val[i] = args[i]
                            }
                        }

                        if (!multiple || exprs) {
                            return runner(callee.code, val, callee.exprs);
                        } else {
                            // tail call
                            //console.log('>>> tail call optimized');
                            code = callee.code;
                            pc = 0;
                            exprs = callee.exprs;
                            scope = val;
                            return
                        }
                        //console.log('<<< END call lambda', ret);
                    }
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
                        code: code.substring(pc + 1, pc += num() + 1),
                        scope: scope,
                        depth: scope.depth + 1
                    };
                case 109: // method
                    return method(onexpr());
                //console.log('lambda', ret, pc, exprs);
                case 110: // number
                    return +code.substring(pc + 1, pc += num() + 1);
                case 114: // remove
                case 115: // set!
                    val = scope['$' + num()]; // scope
                    i = code[pc++];
                    ret = val[i];
                    if (ins & 1) {
                        val[i] = onexpr();
                    } else {
                        delete val[i];
                    }
                    return ret;
                case 116: // trace
                    return console.log('\x1b[36m[trace]\x1b[0m '
                        + require('util').inspect(onexpr()) + code.substring(pc + 1, pc += num() + 1));
                case 118: // variable
                    //console.log('variable %d:%s', code[pc], code[pc + 1]);
                    return scope['$' + num()][code[pc++]];
                case 122: // z
                    return null;
                //case 117: // undefined
                //    return;
            }
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
        var scope = {
            depth: lambda.depth,
            callee: lambda
        };
        for (var i = scope.depth; i--;) {
            scope['$' + i] = lambda.scope['$' + i]
        }
        return scope['$' + scope.depth] = scope;
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