'use strict';

const {ExternalError} = require('../../../../lib/errors');

const model = require('./model');

module.exports = {
	async login(ctx){
		const data = ctx.request.body;
		
		let userId;
		
		try{
			userId = await model.login(data.email, data.password);
		}catch(e){
			if(e.handle === 'incorrect-password'){
				throw ExternalError('incorrect-password', 'The password you provided is incorrect');
			}else{
				throw e;
			}
		}
		
		ctx.state.user = {
			id: userId
		};
		
		return userId;
	},
	async getMe(ctx){
		const userId = ctx.state.user.id;
		let user = await model.find(userId);
		
		//filter user
		
		return user;
	},
};