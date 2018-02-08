'use strict';

const {ExternalError} = require('../../../lib/errors');

const model = require('./model');

module.exports = {
	async testError(ctx){
		try{
			await model.testError();
		}catch(e){
			if(e.handle === 'internal-error'){
				throw ExternalError('external-error', 'An ExternalError has occurred');
			}else{
				throw e;
			}
		}
		
		return 'no error';
	}
};