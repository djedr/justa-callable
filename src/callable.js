const oneOff = (f) => {
    let called = false;
    return (...args) => {
        if (called === false) {
            called = true;
            return f(...args);
        } else throw Error('This is a one-off function and it was already called once!');
    };
};
const callablePrivate = oneOff(() => Object.freeze({
    noop: () => {},
    defaultErrorHandler: (error) => {
        throw error;
    },
    setImmediate: (cb) => {
        window.setTimeout(cb, 0);
    }
}));
const callable = (() => {
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
const funTry = scope => (err, ...args) => {
    if (err) return scope.throw(err);
    scope.advance(...args);
};
const funTryThen = scope => () => {
    return funTry(scope);
};
    let fun = (...args) => {
        let options = args[0];
        let scopeFn = options.body;
        let argString = options.args;
        let body;
        const scope = {
            error: defaultErrorHandler,
            onCancel: noop,
            onReturn: noop,
            onLast: noop,
            onThrow: noop,
            onCatch: noop,
            nextIndex: 0,
            setImmediate,
            completed: noop,
            callbackConvention: 'nodejs',
            checkErrorsImplicitly: false,
            then: () => body[++scope.nextIndex],
            advance: (...args) => {
                let next = scope.next;
                setImmediate(() => next(...args));
            },
            documentation: {
                message: 'use onError hook to set up a custom error handler; use x for y',
                url: 'https://example.com/doc'
            }
        };
        body = [...scopeFn(scope), noop];
        body = body.map((f, i) => {
            return (...args) => {
                scope.next = body[i + 1];
                return f(...args);
            };
        });
        scope.cancel = () => {
            scope.onCancel();
            scope.nextIndex = body.length - 2;
        };
        scope.return = (...args) => {
            scope.onReturn(...args);
            scope.nextIndex = body.length - 2;
        };
        scope.throw = (error) => {S
            scope.onThrow(error);
        };
        scope.argNames = argString? argString.split(/,| /).filter((a) => a.length > 0).map((a) => a.trim()): [];
        const retFun = (...args) => {
            scope.argNames.forEach((arg, i) => {
                scope[arg] = args[i];
            });
            scope.args = args;
            let lastArg = args[args.length - 1];
            let options;
            if (typeof lastArg === 'object') {
                options = lastArg;
                scope.return = lastArg.onReturn;
                scope.onCancel = lastArg.onCancel;
            } else {
                scope.return = lastArg;
            }
            scope.nextIndex = 0;
            body[0](...args);
            return {
                return: scope.return,
                throw: scope.throw,
                subscribe: (observer) => {
                },
                next: (value) => {
                    return {
                        value: undefined,
                        done: true
                    }
                },
            }
        };
        retFun.documentation = {
            message: fun.doc(`
                args should be a string, which specifies argument names;
                these should be separated by spaces and/or commas.
                Superfluous spaces or commas are ignored.
                For example these are equivalent ways of specifying arguments with names 'x', 'y' and 'z':
                    'x y z'
                    'x, y, z'
                    'x  y  z'
                    'x, y z'
                    'x,,  y, ,z'`),
            url: ''
        };
        return retFun;
    };
    fun.create = fun;
    fun.doc = (str) => {
        let lines = str.split('\n');
        let indent = '';
        for (let ch of lines[1]) {
            if (/\s/.test(ch)) indent += ch;
            else break;
        }
        let length = indent.length;
        return lines.map((line) => {
            return line.slice(length);
        }).join('\n');
    };
    fun.throttle = (c, ms) => {
        let lastCallTime = 0;
        return (...args) => {
            let currentTime = performance.now();
            if (currentTime - lastCallTime >= ms) {
                lastCallTime = currentTime;
                c.next(...args);
            }
        };
    };
    fun.throttleOr = (c, ms, cb) => {
        let lastCallTime = 0;
        return (...args) => {
            let currentTime = performance.now();
            if (currentTime - lastCallTime >= ms) {
                lastCallTime = currentTime;
                c.next(...args);
            } else or(...args);
        };
    };
    fun.debounce = (c, ms) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => c.next(...args), ms);
        };
    };
    fun.setImmediate = (cb) => {
        window.setTimeout(cb, 0);
    };
    fun.noop = () => {};
    fun.doDebounce = (c, ms) => {
        let timeoutId;
        return (...args) => {
            let next = c.next, trail = noop;
            if (!timeoutId) fun.setImmediate(() => next(...args));
            else trail = next;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => { timeoutId = null; trail(...args) }, ms);
        };
    };
    fun.xDebounceX = (c, ms, first = false, last = true) => {
        let timeoutId;
        return (...args) => {
            let next = c.next, trail = noop;
            if (!timeoutId && first) fun.setImmediate(() => next(...args));
            else if (last) trail = next;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => { timeoutId = null; trail(...args) }, ms);
        };
    };
    fun.debounceDynamicMacro = (c, ms, first = false, last = true, throttleMs) => {
        let timeoutId;
        let ifLast = last? ((trail) => { if (last) trail = next; }): fun.noop;
        let ifFirst = first? ((next, args) => fun.setImmediate(() => next(...args))): fun.noop;
        let debounce = (...args) => {
            let next = c.next, trail = noop;
            if (!timeoutId) ifFirst(next, args);
            else ifLast(trail);
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => { timeoutId = null; trail(...args) }, ms);
        };
        if (throttleMs !== undefined) {
            return fun.throttleOr(c, ms, debounce);
        } else {
            return debounce;
        }
    };
    return fun;
})();
module.exports = callable;
