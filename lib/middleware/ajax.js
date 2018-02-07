/*!
 * AJAX Middleware
 * Provides a standard JSON object structure to pass back to the client
 * Required: bodyparser json middleware to be used
 * 
 * Full AJAX object structure (the final object may contain any number of these properties)
 * {
 *   actions: [],		//array of strings
 *   errors: [{
 *   	msg: '',
 *   	handle: ''	
 *   }]
 *   notices: []		//array of strings
 *   data: {}
 * }
 * 
 * Usage:
 * ctx.ajax.send({foo: 'bar'});
 * ctx.ajax.addData({foo: 'bar'}).send();
 * ctx.ajax.addMessage('I am a standard message').send();
 * ctx.ajax.addSuccess('User Created Successfully').send();
 * ctx.ajax.addError('A user already exists with this email').send();
 * ctx.ajax.addMessage('success', 'User Created Successfully').send();
 */

'use strict';

module.exports = () => {
	return (ctx, next) => {
		ctx.ajax = new Ajax(ctx);
		return next();
	};
};

function Ajax(ctx){
	this.ctx = ctx;
	this.obj = {
		data: null
	};
}

/**
 * Sets the data to be returned
 *
 * @param {*} data - Can be any type that body-parser json accepts
 */
Ajax.prototype.setData = function(data){
	this.obj.data = data;
	
	return this;
};

/**
 * Adds an action for the client to perform
 *
 * @param {string} action
 */
Ajax.prototype.addAction = function(action){
	if(typeof this.obj.actions === 'undefined'){
		this.obj.actions = [];
	}
	
	this.obj.actions.push(action);
	
	return this;
};

/**
 * Adds a message for the client to show
 * @param {string} notice
 */
Ajax.prototype.addNotice = function(notice){
	if(typeof this.obj.notices === 'undefined'){
		this.obj.notices = [];
	}
	
	this.obj.notices.push(notice);
	
	return this;
};

/**
 * Adds an error message for the client to show
 * @param {string} handle - error identifier that the frontend would know
 * @param {string} message - error message to display if not handled by frontend
 * @param {object} data - any extra data to go along with the error
 */
Ajax.prototype.addError = function(handle, message, data){
	if(typeof this.obj.errors === 'undefined'){
		this.obj.errors = [];
	}
	
	let errorObj = {
		handle,
		message
	};
	
	if(data){
		errorObj.data = data;
	}
	
	this.obj.errors.push(errorObj);
	
	return this;
};

/**
 * sets the json web token value to jwt
 * @param {string} token
 */
Ajax.prototype.setJWT = function(token){
	this.obj.jwt = token;
	
	return this;
};

/**
 * sets the json web token value to jwt
 * @param {string} key
 * @param {*} value
 */
Ajax.prototype.setKey = function(key, value){
	this.obj[key] = value;
	
	return this;
};

/**
 * Send the constructed AJAX object to the client
 * Shorthand for res.ajax.setData(...).send()
 *
 * @param {*} [data]
 */
Ajax.prototype.send = function(data){
	if(typeof data !== 'undefined'){
		this.setData(data);
	}
	
	this.ctx.body = this.obj;
};