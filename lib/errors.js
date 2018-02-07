function InternalError(handle, message = 'internal error', data){
	if(!(this instanceof InternalError)){
		return new InternalError(handle, message, data);
	}
	
	const error = Error.call(this, message);
	this.stack = error.stack;
	this.message = error.message;
	
	if(data){
		this.data = data;
	}
	
	this.name = 'InternalError';
	this.handle = handle;
}
InternalError.prototype = Object.create(Error.prototype);
InternalError.prototype.constructor = InternalError;

function ExternalError(handle, message = 'Error', data){
	if(!(this instanceof ExternalError)){
		return new ExternalError(...arguments);
	}
	
	const error = Error.call(this, message);
	this.stack = error.stack;
	this.message = error.message;
	
	if(data){
		this.data = data;
	}
	
	this.name = 'ExternalError';
	this.handle = handle;
}
ExternalError.prototype = Object.create(Error.prototype);
ExternalError.prototype.constructor = ExternalError;


module.exports = {
	InternalError,
	ExternalError,
};