# justa-callable
An abstraction for easy asynchrony in JavaScript. An alternative to Promises.

# Example
    const callable = require('justa-callable');
    // ...
    // define:
    const f = callable({args: 'fileName', body: c=> [
        _=> fs.readFile(c.fileName, 'utf-8', c.next),
        (err, source) => {
            if (err) throw err;
            const output = process(source);
            c.return(output);
        }
    ]});
    // ...
    // use:
    f('a-file.txt', output => console.log(output));
