// if it exists, takes ctx.state.user and makes a jwt cookie for it
// requires the ajax middleware to be added beforehand

//NOTE: during multiple simultaneous requests, updates can be overwritten

'use strict';

const jwt = require('jsonwebtoken');


module.exports = secret => {
	if(!secret){
		throw Error('jwt-state: secret required');
	}
	
	return (ctx, next) => {
		//override ajax.send method
		const sendOrg = ctx.ajax.send;
		ctx.ajax.send = function(){
			if(typeof ctx.state.user === 'object'){
				const token = jwt.sign(ctx.state.user, secret);
				ctx.ajax.setJWT(token);
			}
			
			sendOrg.apply(this, Array.prototype.slice.call(arguments));
		};
		
		return next();
	}
};