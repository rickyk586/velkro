'use strict';

const EventEmitter = require('events');
const _ = require('lodash');
const glob = require('glob');
const path = require('path');
const debug = require('debug')('velkro:application');

const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const jwt = require('koa-jwt');

const ajax = require('./middleware/ajax');
const jwtState = require('./middleware/jwt-state');
const {InternalError, ExternalError} = require('./errors');

//simple promisify
const globPromise = pattern => {
	return new Promise((resolve, reject) => {
		glob(pattern, (err, files) => {
			if(err){
				reject(err);
			}else{
				resolve(files);
			}
		})
	});
};

const configDefaults = {
	port: '8080',
	modulesDir: 'modules',
	middlewares: [],
	startHttpServer: true,
	routes: {
		filename: 'routes.js',
		base: ''
	},
	cors: {
		enabled: true,
		options: {}
	},
	jwt: {
		secret: null
	}
};

module.exports = class Application extends EventEmitter {
	/**
	 * Initialize a new 'Application'
	 *
	 * @api public
	 */
	constructor(config){
		super();
		
		this.config = _.defaultsDeep(config, configDefaults);
		
		const readyDeferred = defer();
		this.ready = readyDeferred.promise;
		
		const velkroApp = new Velkro(this.config);
		
		//port events from velkroApp to application
		portEvents([
			'middleware-added',
			'routes-loaded',
			'http-server-started',
			'external-error',
			'internal-error',
			'unknown-error',
			'error',
		], velkroApp, this);
		
		let isInitFinished = false;
		let isServerListening = false;
		
		this.ready.then(koaApp => this.emit('ready', koaApp));
		
		//signal ready only if init has finished and http server is listening
		velkroApp.on('init-finished', koaApp => {
			isInitFinished = true;
			if(!this.config.startHttpServer || isServerListening){
				readyDeferred.resolve(koaApp);
			}
		});
		velkroApp.on('http-server-started', (koaApp, httpServer) => {
			isServerListening = true;
			this.httpServer = httpServer;
			if(isInitFinished){
				readyDeferred.resolve(koaApp);
			}
		});
	}
	
	//singletons
};

class Velkro extends EventEmitter {
	constructor(config){
		super();
		
		this.config = config;
		
		this.init();
	}
	
	async init(){
		this.rootDir = process.cwd();
		this.koaApp = new Koa();
		
		this.addMiddleware();
		await this.loadRoutes();
		
		if(this.config.startHttpServer){
			this.startHttpServer();
		}
		
		this.emit('init-finished', this.koaApp);
	}
	
	addMiddleware(){
		if(this.config.cors.enabled){
			this.koaApp.use(cors(this.config.cors.options));
		}
		
		this.koaApp.use(bodyParser({
			jsonLimit: '100mb',
			textLimit: '100mb'
		}));
		
		this.koaApp.use(ajax());
		
		if(this.config.jwt.secret){
			//JWT parsing
			this.koaApp.use(jwt({
				secret: this.config.jwt.secret,
				passthrough: true
			}));
			
			//JWT setting
			this.koaApp.use(jwtState(this.config.jwt.secret));
		}
		
		this.emit('middleware-added', this.koaApp);
	}
	
	async loadRoutes(){
		this.routes = {};
		this.router = new Router();
		this.middlewares = this.config.middlewares;
		
		const startPath = path.normalize(`${this.rootDir}/${this.config.modulesDir}`);
		const routesPath = `${startPath}/**/${this.config.routes.filename}`;
		const files = await globPromise(routesPath);
		
		//sort by subroutes first so they take precedence (based on number of directory separators)
		files.sort((a, b) =>{
			return (a.match(/\//g) || []).length < (b.match(/\//g) || []).length ? 1 : -1;
		});
		
		//loop through each route file
		files.forEach(file => this.processRouteFile(startPath, file));
		
		this.koaApp
			.use(this.router.routes())
			.use(this.router.allowedMethods());
		
		this.emit('routes-loaded', this.koaApp, this.routes);
	}
	processRouteFile(startPath, file){
		//remove startPath from the beginning and config.routes.filename from the end
		const routeBase = this.config.routes.base + file.substring(startPath.length, file.length - this.config.routes.filename.length - 1);
		
		//loop through each route object
		const routeObjs = require(file);
		
		routeObjs.forEach(routeObj => this.processRouteObject(routeBase, routeObj));
	}
	
	processRouteObject(routeBase, routeObj){
		if(typeof routeObj.routes !== 'object'){
			console.warn('route object without \'routes\' param', this.routeBase, JSON.stringify(routeObj, null, 4));
			return;
		}
		
		const middlewares = typeof routeObj.middleware !== 'undefined' ? this.middlewares.concat(routeObj.middleware) : this.middlewares;
		
		//Loop through each method type (get, post...), and each route within
		const methods = Object.keys(routeObj.routes);
		methods.forEach(method => {
			method = method.toLowerCase();
			
			_.forOwn(routeObj.routes[method], (route, routePath) => this.processRoute(method, routeBase, middlewares, routePath, route));
		});
	}
	
	processRoute(method, routeBase, mainMiddlewares, path, route){
		let middlewares = mainMiddlewares.slice(0);
		
		if(path[0] === '/'){
			path = path.substr(1);
		}
		
		//find the main handler function
		let handler;
		if(typeof route === 'function'){
			handler = route;
		}
		else if(typeof route === 'object' && typeof route.handler === 'function'){
			handler = route.handler;
			
			//add middlewares if there are any
			if(typeof route.middlewares !== 'undefined'){
				middlewares = middlewares.concat(route.middlewares);
			}
		}else{
			// console.warn('missing route or handler', path, route, _routes);
			debug('missing route or handler');
			debug('routeBase', routeBase);
			debug('method', method);
			debug('path', path);
			debug('route', route);
			// debug('_routes', _routes);
			return;
		}
		
		if(typeof this.routes[routeBase] === 'undefined'){
			this.routes[routeBase] = [];
		}
		this.routes[routeBase].push(`${method.toUpperCase()} ${path}`);
		
		handler = this.getCombinedHandler(handler);
		
		const routeConstructorParams = [`${routeBase}/${path}`].concat(middlewares).concat(handler);
		
		//put it all together
		this.router[method].apply(this.router, routeConstructorParams);
	}
	
	getCombinedHandler(handler){
		return (ctx, next) => {
			const result = handler.call(handler, ctx);
			return this.postHandler(result, ctx);
		};
	}
	
	//gets called with the result of the route
	async postHandler(result, ctx){
		if(ctx.res.headersSent){
			return;
		}
		
		try{
			const data = await result;		//may or may not be a promise
			ctx.ajax.setData(data);
		}catch(error){
			//if it's an external error, send it back to the user
			if(error instanceof ExternalError){
				ctx.ajax.addError(error.handle, error.message, error.data);
				this.emit('external-error', error);
				this.emit('error', error);
			}
			else if(error instanceof InternalError){
				ctx.ajax.addError(error.handle, error.message, error.data);
				this.emit('internal-error', error);
				this.emit('error', error);
			}else{
				ctx.ajax.addError('unknown-error', 'There was an error');
				this.emit('unknown-error', error);
				this.emit('error', error);
			}
		}finally{
			if(!ctx.headersSent){
				ctx.ajax.send();
			}
		}
	}
	
	startHttpServer(){
		const httpServer = this.koaApp.listen(this.config.port, () =>{
			this.emit('http-server-started', this.koaApp, httpServer);
		});
	}
}

function portEvents(events, eventEmitterFrom, eventEmitterTo){
	events.forEach(event => {
		eventEmitterFrom.on(event, function(){
			eventEmitterTo.emit.apply(eventEmitterTo, [event].concat(Array.prototype.slice.call(arguments)));
		});
	})
}

function defer() {
    let resolve, reject;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return {
        resolve,
        reject,
        promise
    };
}