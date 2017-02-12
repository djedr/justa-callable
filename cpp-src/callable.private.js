const noop = () => {};
const defaultErrorHandler = (error) => {
    throw error;
};

const setImmediate = (cb) => {
    window.setTimeout(cb, 0);
};

const parseArgs = (args) => {
    let arg0 = args[0];
    let options, scopeFn;

    if (args.length === 1) {
        if (typeof arg0 === 'object') {
            options = args[0];
            scopeFn = options.body;
        } else {
            scopeFn = arg0;
        }
    } else if (args.length === 2) {
        scopeFn = arg0;
    } else {
        throw TypeError('Arguments are: (body: (object) => Function[], options?: object)|(options: object)');
    }

    return { options, scopeFn };
};

const funWhile = (predicate) => (...body) => {
    let loopBody = fun((s) => [() => predicate()? s.advance(): s.return(), ...body], { onLast: loopBody });
    loopBody();
};

// if callbackConvention === 'nodejs'
const funTry = scope => (err, ...args) => {
    if (err) return scope.throw(err);
    // note: discards err
    scope.advance(...args);
};

const funTryThen = scope => () => {
    return funTry(scope);
};
