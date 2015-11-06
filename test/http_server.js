var compiler = require('../compiler');

var code = require('fs').readFileSync(require('path').join(__dirname, 'http_server.scm'), 'utf8');
var ast = compiler.parse(code);
code = compiler.generate(ast);

console.log('compiled', code);

var interpreter = require('../interpreter');

console.log(interpreter(code));
//interpreter(code);

