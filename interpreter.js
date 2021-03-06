#!/usr/bin/env node

var global_proto = {
    depth: 0,
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

var news = [], calls = [];

var binaries = function () {
    var buf = 'return {".":function(x,y){return x[y]}';

    for (var i = 0, names = '+-*/&^%|<>'; i < names.length; i++) {
        buf += binary(names[i], names[i]);
    }
    var map = {'=': '===', '(': '<<', ')': '>>', '}': '>>>'};
    for (var k in map) {
        buf += binary(k, map[k])
    }
    return Function(buf + '}')();

    function binary(name, op) {
        return ',"' + name + '":function(x,y){return x' + op + 'y}'
    }
}();

function run(code) {
    var global = {__proto__: global_proto};
    global._ = this;
    global.$0 = global;
    return runner(1, global, code.charCodeAt(0) - 48);

    function runner(pc, scope, exprs) {
        var ret;

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
                        exprs = callee.exprs;
                        scope = val;
                        pc = callee.pc;
                        return
                    }
                    return runner(callee.pc, val, callee.exprs);

                case 118: // variable ### HOT ###
                    return scope['$' + num()][code[pc++]];
                case 119: // current scope variable ### HOT ###
                    return scope[code[pc++]];
                // NOT HOT
                case 40: // stmt begin
                    return exprs += num();
                case 41: // expr begin
                    return readList().pop();
                case 42: // new
                    if (!(val = news[len = (i = readList()).length - 1])) {
                        arg = 'e';
                        while (len--) arg += ',e' + len;
                        val = news[i.length - 1] = Function(arg, 'return new e(' + arg.substr(2) + ')')
                    }
                    return val.apply(null, i);
                case 59: // try: expr holder
                    arg = [code[pc++]];
                case 58: // try: expr
                    return tryCatch(i & 1, num() + pc, arg);
                case 97: // call
                    if (!(val = calls[len = (i = readList()).length - 2])) {
                        arg = 'e,t';
                        while (len--) arg += ',e' + len;
                        val = calls[i.length - 2] = Function(arg, 'return e[t](' + arg.substr(4) + ')')
                    }
                    return val.apply(null, i);
                case 101: // scope
                    return scope['$' + code[pc++]];
                case 105: // invoke: argc,...args,method,target
                    return onexpr().apply(onexpr(), readList());
                case 107: // skip
                    exprs++;
                    pc += num();
                    return;
                case 108: // lambda
                    ret = {
                        argc: num(),
                        exprs: num(),
                        pc: pc + 1,
                        scope: scope
                    };
                    pc += num() + 1;
                    return ret;
                case 109: // method
                    return method(onexpr());
                //console.log('lambda', ret, pc, exprs);
                case 110: // number
                    return +str();
                case 112: // remove current
                case 113: // set! current
                    ret = scope[arg = code[pc++]];
                    scope[arg] = i & 1 ? onexpr() : void 0;
                    return ret;
                case 115: // set!
                    ret = (val = onexpr())[arg = onexpr()];
                    val[arg] = onexpr();
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

        function tryCatch(i, len, arg) {
            try {
                var val = onexpr();
                ret = true
            } catch (e) {
                pc = len; // fix right pc
                val = e;
                ret = false;
            }
            if (i) {
                scope[arg] = val;
            }
            return ret;
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
            return runner(lambda.pc, scope, lambda.exprs)
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