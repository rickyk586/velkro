//make sure the user is logged in

export default (ctx, next) => {
	if (!ctx.state?.user?.id) {
		ctx.ajax.addError('login-required', 'Login Required');
		ctx.ajax.send();
	} else {
		return next();
	}
};
