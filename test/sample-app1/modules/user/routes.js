'use strict';

const controller = require('./controller');

const loginRequired = require('../../middleware/security/login-required');

module.exports = [
	{
		routes: {
			post: {
				'login': controller.login,
			}
		}
	}, {
		middlewares: [loginRequired],
		routes: {
			get: {
				'me': controller.getMe,
			},
		}
	}
];