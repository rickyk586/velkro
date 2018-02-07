'use strict';

module.exports = (ctx, next) => {
	console.log('URL:', ctx.url, 'Params:', ctx.params);
	return next();
};
