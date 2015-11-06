javascript implemention of Scheme

### usage

#### compiler

You can install jscheme globally

```sh
sudo npm install -g kyriosli/jscheme
```

And then compiles the file like this:

```sh
jscmc input.scm output.txt
```

Or you can just load and call the compiler inside your program:

```js
var compiler = require('jscheme/compiler');
var ast = compiler.parse(require('fs').readFileSync('input.scm', 'utf8'));
var code = compiler.generate(ast);
require('fs').writeFileSync('output.txt', code)
```

#### interpreter

You can install jscheme globally as mentioned, and call the interpreter like this:

```sh
jscm output.txt
```

Or you can just load and call the interpreter inside your program:

```js
var interpreter = require('jscheme');
var code = require('fs').readFileSync('output.txt', 'utf8');
var result = interpreter(code)
```