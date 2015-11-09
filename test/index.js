process.chdir(__dirname);

var assert = require('assert');

var compiler = require('../compiler'),
    interpreter = require('../interpreter');

var starts = {};
var hrtime = process.hrtime;
var time = function (label) {
    starts[label] = hrtime();
};

var timeEnd = function (label) {
    var now = hrtime(), old = starts[label];
    if (delete starts[label]) {
        var diff = (now[0] - old[0]) * 1e6 + (now[1] - old[1]) / 1e3;
        console.log('\x1b[32m%s\x1b[0m: %dms', label, Math.round(diff) / 1e3)
    }
};

// test sum
time('js: sum(5e5)');
var result1 = 0;
for (var i = 5e5; i; i--) {
    result1 += i;
}
timeEnd('js: sum(5e5)');

var code = compile('tail_sum.scm');
time('scm: sum(5e5)');
var result = interpreter(code);
timeEnd('scm: sum(5e5)');

assert.strictEqual(result, result1);
console.log('\x1b[36msum(5e5)\x1b[0m:', result, result1);


// test fibnacci
function fib(n) {
    return n < 2 ? 1 : fib(n - 1) + fib(n - 2);
}
time('js: fib(24)');
result1 = fib(24);
timeEnd('js: fib(24)');

code = compile('recursive_fib.scm');
time('scm: fib(24)');
result = interpreter(code);
timeEnd('scm: fib(24)');

assert.strictEqual(result, result1);
console.log('\x1b[36mfib(24)\x1b[0m:', result, result1);


function fib2(n) {
    return tmp(n, 1, 1);
    function tmp(n, a, b) {
        return n < 2 ? b : tmp(n - 1, b, a + b)
    }
}
time('js: fib2(1e3)');
result1 = fib2(1e3);
timeEnd('js: fib2(1e3)');

code = compile('tail_fib.scm');
time('scm: fib2(1e3)');
result = interpreter(code);
timeEnd('scm: fib2(1e3)');

assert.strictEqual(result, result1);
console.log('\x1b[36mfib2(1e3)\x1b[0m:', result, result1);

code = compile('test.scm');
result = interpreter(code);
assert.strictEqual(result, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');


function compile(file) {
    var code = require('fs').readFileSync(file, 'utf8');
    var ast = compiler.parse(code, file);
    return compiler.generate(ast);
}