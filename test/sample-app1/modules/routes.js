'use strict';

const controller = require('./controller');

async function xyzMiddleware(ctx, next){
	await new Promise(resolve => setTimeout(resolve, 500));
	ctx.ajax.setKey('xyz', 'XYZ');
	return next();
}

module.exports = [
	{
		routes: {
			get: {
				''(ctx){
					return 'Application API';
				},
				'xyz': {
					middlewares: [xyzMiddleware],
					async handler(ctx){
						await new Promise(resolve => setTimeout(resolve, 500));
						return 'xyz';
					}
				},
				'test-error': controller.testError
			}
		}
	}
];