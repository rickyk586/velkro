// if it exists, takes ctx.state.user and makes a jwt cookie for it

//NOTE: during multiple simultaneous requests, updates can be overwritten

import jwt from 'jsonwebtoken';

export default secret => {
	if (!secret) {
		throw Error('jwt-state: secret required');
	}

	return (ctx, next) => {
		// override ajax.send method
		const sendOrg = ctx.ajax.send;
		ctx.ajax.send = function (...args) {
			if (typeof ctx.state.user === 'object') {
				const token = jwt.sign(ctx.state.user, secret);
				ctx.cookies.set('session', token, {
					httpOnly: true,
					secure: ctx.secure,
					sameSite: 'strict',
				});
			}

			sendOrg.apply(this, args);
		};

		return next();
	};
};
