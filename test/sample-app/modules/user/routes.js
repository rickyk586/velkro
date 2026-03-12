import controller from './controller.js';
import loginRequired from '../../middleware/security/login-required.js';

export default [
	{
		routes: {
			get: {
				''(_ctx) {
					return 'User Module Root';
				},
			},
			post: {
				login: controller.login,
			},
		},
	},
	{
		middlewares: [loginRequired],
		routes: {
			get: {
				me: controller.getMe,
			},
		},
	},
];
