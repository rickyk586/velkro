'use strict';

const model = require('./model');

module.exports = {
	login(ctx){
		//mock login
		ctx.state.user = {
			id: 123
		};
		
		return true;
	},
	async getMe(ctx){
		const userId = ctx.state.user.id;
		let user = await model.find(userId);
		
		//filter user
		
		return user;
	},
};