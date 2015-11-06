process.chdir(__dirname);

var compiler = require('../compiler'),
    interpreter = require('../interpreter');

// test sum
console.time('js: sum(3e5)');
var result1 = 0;
for (var i = 3e5; i; i--) {
    result1 += i;
}
console.timeEnd('js: sum(3e5)');

var code = compile('tail_sum.scm');
console.time('scm: sum(3e5)');
var result = interpreter(code);
console.timeEnd('scm: sum(3e5)');

console.log('\x1b[36msum(3e5)\x1b[0m:', result, result1);

// test fibnacci
function fib(n) {
    return n < 2 ? 1 : fib(n - 1) + fib(n - 2);
}
console.time('js: fib(23)');
result1 = fib(23);
console.timeEnd('js: fib(23)');

code = compile('recursive_fib.scm');
console.time('scm: fib(23)');
result = interpreter(code);
console.timeEnd('scm: fib(23)');

console.log('\x1b[36mfib(23)\x1b[0m:', result, result1);


function fib2(n) {
    return tmp(n, 1, 1);
    function tmp(n, a, b) {
        return n < 2 ? b : tmp(n - 1, b, a + b)
    }
}
console.time('js: fib2(1e3)');
result1 = fib2(1e3);
console.timeEnd('js: fib2(1e3)');

code = compile('tail_fib.scm');
console.time('scm: fib2(1e3)');
result = interpreter(code);
console.timeEnd('scm: fib2(1e3)');

console.log('\x1b[36mfib2(1e3)\x1b[0m:', result, result1);

function compile(file) {
    var code = require('fs').readFileSync(file, 'utf8');
    var ast = compiler.parse(code, file);
    return compiler.generate(ast);
}