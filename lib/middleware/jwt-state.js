// if it exists, takes ctx.state.user and makes a jwt cookie for it

//NOTE: during multiple simultaneous requests, updates can be overwritten

import jwt from 'jsonwebtoken';

export default (secret, options = {}) => {
	if (!secret) {
		throw Error('jwt-state: secret required');
	}

	const cookieOptions = {
		httpOnly: true,
		sameSite: 'strict',
		...options,
	};

	return (ctx, next) => {
		// override ajax.send method
		const sendOrg = ctx.ajax.send;
		ctx.ajax.send = function (...args) {
			if (typeof ctx.state.user === 'object') {
				const token = jwt.sign(ctx.state.user, secret);

				const setCookie = opts => {
					ctx.cookies.set('session', token, {
						...cookieOptions,
						...opts,
						secure: ctx.secure,
					});
				};

				if (Array.isArray(cookieOptions.domain)) {
					cookieOptions.domain.forEach(domain => {
						setCookie({domain});
					});
				} else {
					setCookie();
				}
			}

			sendOrg.apply(this, args);
		};

		return next();
	};
};
