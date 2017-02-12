const callable = require('../callable-js');
const cppjs = require('../cpp-js/cpp.js');

let self = callable({ args: 'cb', body: c=> [
    _ => cppjs({
        input: 'cpp-src/callable.js',
        output: 'src/callable.js'
    }, c.cb)
]});

if (require.main === module) {
    const args = JSON.parse('[' + process.argv.slice(2).join(' ') + ']');
    self(...args);
}

module.exports = self;
