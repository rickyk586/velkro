//make sure the user is logged in

'use strict';

module.exports = (ctx, next) => {
	if(!ctx.state || !ctx.state.user || !ctx.state.user.id){
		ctx.ajax.addError('login-required', 'Login Required');
		ctx.ajax.send();
	}else{
		return next();
	}
};
