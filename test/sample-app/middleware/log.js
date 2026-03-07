export default (ctx, next) => {
	console.log('URL:', ctx.url, 'Params:', ctx.params);
	return next();
};
