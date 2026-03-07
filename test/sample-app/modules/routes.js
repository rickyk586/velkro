import controller from './controller.js';

async function xyzMiddleware(ctx, next) {
	await new Promise(resolve => setTimeout(resolve, 500));
	ctx.ajax.setKey('xyz', 'XYZ');
	return next();
}

export default [
	{
		routes: {
			get: {
				''(_ctx) {
					return 'Application API';
				},
				xyz: {
					middlewares: [xyzMiddleware],
					async handler(_ctx) {
						await new Promise(resolve => setTimeout(resolve, 500));
						return 'xyz';
					},
				},
				'test-error': controller.testError,
			},
		},
	},
];
