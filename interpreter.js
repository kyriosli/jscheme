function run(code) {
    var global = {
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

    return runner(code, 1, global, code.charCodeAt(0) - 48);


    function runner(code, pc, scope, exprs) {
        var ret, tailPC = 0;

        while (exprs--) {
            ret = onexpr(true);
            //console.log('ins[' + exprs + ']: ' + String.fromCharCode(ins) + ' =>', ret);
        }

        return ret;


        function onexpr(multiple) {
            var ins = code.charCodeAt(pc++), ret;
            //console.log('ins[' + exprs + ']: ' + code[pc - 1] + ' pc=' + pc);
            switch (ins) {
                case 37: // binary

                    return binaries[code[pc++]](onexpr(), onexpr());
                case 63: // ?
                    if (onexpr()) {
                        pc++
                    } else {
                        pc += num()
                    }
                    // tail call optimization
                    exprs++;
                    return;
                case 99: // call
                    var argc = num();
                    var callee = onexpr();
                    var args = [];
                    for (var i = 0; i < argc; i++) {
                        args[i] = onexpr();
                    }
                    if (callee.apply) {
                        return callee.apply(null, args)
                    } else { // call lambda
                        //console.log('>>> BEGIN call lambda', callee, args);

                        if (!multiple || exprs || scope.callee !== callee) {
                            var newScope = {
                                __proto__: callee.scope,
                                depth: callee.depth,
                                callee: callee
                            };
                            newScope['$' + newScope.depth] = newScope;
                        } else { // scope reuse
                            //console.log('scope reused', tailPC);
                            newScope = scope;
                        }
                        if (callee.argc === -1) {
                            newScope[0] = args;
                        } else {
                            for (i = 0, argc = callee.argc; i < argc; i++) {
                                newScope[i] = args[i]
                            }
                        }

                        if (!multiple || exprs) {
                            return runner(callee.code, 0, newScope, callee.exprs);
                        } else {
                            // tail call
                            //console.log('>>> tail call optimized');
                            code = callee.code;
                            tailPC || (tailPC = pc);
                            pc = 0;
                            exprs = callee.exprs;
                            scope = newScope;
                            return
                        }
                        //console.log('<<< END call lambda', ret);
                    }
                case 100: // define
                    var name = code[pc++];
                    scope[name] = onexpr();
                    //console.log('set', name, scope[name]);
                    return "'" + name;
                case 108: // lambda
                    var codeLen = num();
                    return {
                        argc: num(),
                        exprs: num(),
                        code: code.substring(pc, pc += codeLen),
                        scope: scope,
                        depth: scope.depth + 1
                    };
                //console.log('lambda', ret, pc, exprs);
                case 110: // number
                    var len = num();
                    ret = +code.substr(pc, len);
                    pc += len;
                    return ret;
                case 114: // remove
                case 115: // set!
                    var curr = scope['$' + num()];
                    name = code[pc++];
                    ret = curr[name];
                    if (ins & 1) {
                        curr[name] = onexpr();
                    } else {
                        delete curr[name];
                    }
                    return ret;
                case 116: // trace
                    var val = onexpr();
                    len = num();
                    ret = console.log('\x1b[36m[trace]\x1b[0m '
                        + require('util').inspect(val) + code.substr(pc, len));
                    pc += len;
                    return ret;
                case 117: // undefined
                    return;
                case 118: // variable
                    //console.log('variable %d:%s', code[pc], code[pc + 1]);
                    return scope['$' + num()][code[pc++]];
                case 122: // skip
                    exprs++;
                    pc += num();
            }
        }

        function num() {
            return code.charCodeAt(pc++) - 48
        }

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