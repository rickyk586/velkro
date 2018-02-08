'use strict';

const {InternalError} = require('../../../lib/errors');

module.exports = {
	async testError(){
		throw InternalError('internal-error');
	}
};