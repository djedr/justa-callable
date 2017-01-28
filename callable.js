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
	
	// if callbackConvention === 'nodejs'
	const funTry = scope => (err, ...args) => {
		if (err) return scope.throw(err);
		// note: discards err
		scope.advance(...args);
	};
	
	const funTryThen = scope => () => {
		return funTry(scope);
	};
	
	let fun = (...args) => {		
		//let { options, scopeFn } = parseArgs(args, options, scopeFn);
		
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
			//get next() { console.log('next'); return body[++scope.nextIndex]; },
			advance: (...args) => {
				let next = scope.next;
				setImmediate(() => next(...args));
			},
			documentation: {
				message: 'use onError hook to set up a custom error handler; use x for y',
				url: 'https://example.com/doc'
			}
		};
		
		// last noop is for cancel
		body = [...scopeFn(scope), noop];
		
		body = body.map((f, i) => {
			return (...args) => {
				scope.next = body[i + 1];
				return f(...args);
			};
		});
		
		// after user substituted cancel, we patch it again to ensure nothing more is executed after cancel
		scope.cancel = () => {
			scope.onCancel();
			// the next call to scope.then will call noop
			scope.nextIndex = body.length - 2;
		};
		
		scope.return = (...args) => {
			scope.onReturn(...args);
			// the next call to scope.then will call noop
			scope.nextIndex = body.length - 2;
		};
		
		scope.throw = (error) => {S
			scope.onThrow(error);
			// TODO
		};
		
		// TODO: allow argNames to be passed directly as an alternative to argString
		scope.argNames = argString? argString.split(/,| /).filter((a) => a.length > 0).map((a) => a.trim()): [];
		
		const retFun = (...args) => {
			// FIXME: scope should probably be recreated for each call (instance)
			// or at least non-static parts of it
			// currently it is shared between instances and modifications of it are visible to all
			// this is undesirable
			// after the call finishes/returns, the scope should be destroyed
			
			// bind args to scope
			scope.argNames.forEach((arg, i) => {
				scope[arg] = args[i];
			});
			
			scope.args = args;
			// the last arg is the return callback
			let lastArg = args[args.length - 1];
			let options;
			if (typeof lastArg === 'object') {
				options = lastArg;
				scope.return = lastArg.onReturn;
				scope.onCancel = lastArg.onCancel;
			} else {
				scope.return = lastArg;
			}
			
			// reset "instruction pointer"; here more like "function pointer"
			scope.nextIndex = 0;
			
			// call the first function in body to initiate the fun
			body[0](...args);
			
			// return an object, which represents the running fun
			// its execution can be controlled with this object
			return {
				return: scope.return,
				throw: scope.throw,
				subscribe: (observer) => {
					// TODO
				},
				// TODO:
				next: (value) => {
					return {
						value: undefined,
						done: true
					}
				},
			}
		};
		
		// this documentation object should be shared by all functions
		// it should be a property of fun/callable
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
	
	// performs dedent; second line in str determines the indentation level
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
	
	// doDebounce, doDebounceDo, debounceDo, debounce = noop, maxDelay
	
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
	
	// these booleans and throttleMs should be static (macro-expansion time)
	fun.debounceDynamicMacro = (c, ms, first = false, last = true, throttleMs) => {
		let timeoutId;
		
		// these should be macros
		let ifLast = last? ((trail) => { if (last) trail = next; }): fun.noop;
		let ifFirst = first? ((next, args) => fun.setImmediate(() => next(...args))): fun.noop;
		
		let debounce = (...args) => {
			// no references to trail should be needed if last is false
			let next = c.next, trail = noop;
			
			if (!timeoutId) ifFirst(next, args);
			else ifLast(trail);
			
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => { timeoutId = null; trail(...args) }, ms);
		};
		
		// this if should be static (macro-time)
		if (throttleMs !== undefined) {
			return fun.throttleOr(c, ms, debounce);
		} else {
			return debounce;
		}
	};
	
	return fun;
})();

// TODO:
// scope.cancel should be read-only; scope.onCancel should be writable instead
// perhaps scope.cancel should be merged into scope.return
// perhaps scope.error should be merged into scope.throw
// or scope.error should be merged into scope.catch

// what to do if the last function in body doesn't return or call anything in scope?
