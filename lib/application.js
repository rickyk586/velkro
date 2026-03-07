import EventEmitter from 'events';
import _ from 'lodash-es';
import { glob } from 'glob';
import path from 'path';
import createDebug from 'debug';

import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import bodyParser from '@koa/bodyparser';
import jwt from 'koa-jwt';

import ajax from './middleware/ajax.js';
import jwtState from './middleware/jwt-state.js';
import { ExternalError } from './errors.js';
export { ExternalError };

const debug = createDebug('velkro:application');

const configDefaults = {
	port: '8080',
	modulesDir: 'modules',
	middlewares: [],
	startHttpServer: true,
	routes: {
		filename: 'routes.js',
		base: '',
	},
	cors: {
		enabled: true,
		options: {},
	},
	jwt: {
		secret: null,
	},
	errors: {
		unknownError: {
			handle: 'unknown-error',
			message: 'An internal error occurred',
			data: null,
		},
	},
};

export default class Application extends EventEmitter {
	/**
	 * Initialize a new 'Application'
	 *
	 * @api public
	 */
	constructor(config) {
		super();

		this.config = _.defaultsDeep(config, configDefaults);

		// make sure that the routes base has a '/' prefix
		if (this.config.routes.base !== '' && this.config.routes.base[0] !== '/') {
			this.config.routes.base = `/${this.config.routes.base}`;
		}

		const { promise, resolve } = Promise.withResolvers();
		this.ready = promise;

		const velkroApp = new Velkro(this.config);

		// port events from velkroApp to application
		portEvents(
			['middleware-added', 'routes-loaded', 'http-server-started', 'external-error', 'unknown-error', 'err'],
			velkroApp,
			this,
		);

		let isInitFinished = false;
		let isServerListening = false;

		this.ready.then(koaApp => this.emit('ready', koaApp));

		// signal ready only if init has finished and http server is listening
		velkroApp.on('init-finished', koaApp => {
			isInitFinished = true;
			if (!this.config.startHttpServer || isServerListening) {
				resolve(koaApp);
			}
		});
		velkroApp.on('http-server-started', (koaApp, httpServer) => {
			isServerListening = true;
			this.httpServer = httpServer;
			if (isInitFinished) {
				resolve(koaApp);
			}
		});
	}
}

class Velkro extends EventEmitter {
	constructor(config) {
		super();

		this.config = config;

		this.init();
	}

	async init() {
		this.rootDir = process.cwd();
		this.koaApp = new Koa();

		this.addMiddleware();
		await this.loadRoutes();

		if (this.config.startHttpServer) {
			this.startHttpServer();
		}

		this.emit('init-finished', this.koaApp);
	}

	addMiddleware() {
		if (this.config.cors.enabled) {
			this.koaApp.use(cors(this.config.cors.options));
		}

		this.koaApp.use(
			bodyParser({
				jsonLimit: '100mb',
				textLimit: '100mb',
			}),
		);

		this.koaApp.use(ajax());

		if (this.config.jwt.secret) {
			// JWT parsing
			this.koaApp.use(
				jwt({
					secret: this.config.jwt.secret,
					passthrough: true,
					cookie: 'session',
				}),
			);

			// JWT setting
			this.koaApp.use(jwtState(this.config.jwt.secret));
		}

		this.emit('middleware-added', this.koaApp);
	}

	async loadRoutes() {
		this.routes = {};
		this.router = new Router();
		this.middlewares = this.config.middlewares;

		const startPath = path.normalize(`${this.rootDir}/${this.config.modulesDir}`).replace(/\\/g, '/');
		const routesPath = `${startPath}/**/${this.config.routes.filename}`;
		const files = await glob(routesPath);

		// sort by subroutes first so they take precedence (based on number of directory separators)
		files.sort((a, b) => {
			const aCount = a.match(/[/\\]/g)?.length ?? 0;
			const bCount = b.match(/[/\\]/g)?.length ?? 0;
			return aCount < bCount ? 1 : -1;
		});

		// loop through each route file
		for (const file of files) {
			await this.processRouteFile(startPath, file.replace(/\\/g, '/'));
		}

		this.koaApp.use(this.router.routes()).use(this.router.allowedMethods());

		this.emit('routes-loaded', this.koaApp, this.routes);
	}

	async processRouteFile(startPath, file) {
		// remove startPath from the beginning and config.routes.filename from the end
		const routeBase = (
			this.config.routes.base + file.substring(startPath.length, file.length - this.config.routes.filename.length - 1)
		).replace(/\\/g, '/');

		// loop through each route object
		const module = await import(`file://${file}`);
		const routeObjs = module.default || module;

		routeObjs.forEach(routeObj => this.processRouteObject(routeBase, routeObj));
	}

	processRouteObject(routeBase, routeObj) {
		if (typeof routeObj.routes !== 'object') {
			console.warn("route object without 'routes' param", routeBase, JSON.stringify(routeObj, null, 4));
			return;
		}

		const middlewares =
			typeof routeObj.middlewares !== 'undefined' ? this.middlewares.concat(routeObj.middlewares) : this.middlewares;

		// Loop through each method type (get, post...), and each route within
		const methods = Object.keys(routeObj.routes);
		methods.forEach(method => {
			method = method.toLowerCase();

			_.forOwn(routeObj.routes[method], (route, routePath) =>
				this.processRoute(method, routeBase, middlewares, routePath, route),
			);
		});
	}

	processRoute(method, routeBase, mainMiddlewares, path, route) {
		let middlewares = mainMiddlewares.slice(0);

		if (path[0] === '/') {
			path = path.substring(1);
		}

		// find the main handler function
		let handler;
		if (typeof route === 'function') {
			handler = route;
		} else if (typeof route === 'object' && typeof route.handler === 'function') {
			handler = route.handler;

			// add middlewares if there are any
			if (typeof route.middlewares !== 'undefined') {
				middlewares = middlewares.concat(route.middlewares);
			}
		} else {
			debug('missing route or handler');
			debug('routeBase', routeBase);
			debug('method', method);
			debug('path', path);
			debug('route', route);
			return;
		}

		if (typeof this.routes[routeBase] === 'undefined') {
			this.routes[routeBase] = [];
		}
		this.routes[routeBase].push(`${method.toUpperCase()} ${path}`);

		handler = this.getCombinedHandler(handler);

		const routeConstructorParams = [`${routeBase}/${path}`].concat(middlewares).concat(handler);

		// put it all together
		this.router[method](...routeConstructorParams);
	}

	getCombinedHandler(handler) {
		return ctx => {
			const result = handler.call(handler, ctx);
			return this.postHandler(result, ctx);
		};
	}

	// gets called with the result of the route
	async postHandler(result, ctx) {
		if (ctx.res.headersSent) {
			return;
		}

		try {
			const data = await result; // may or may not be a promise
			ctx.ajax.setData(data);
		} catch (error) {
			// if it's an external error, send it back to the user
			if (error instanceof ExternalError) {
				ctx.ajax.addError(error.handle, error.message, error.data);
				this.emit('external-error', error);
			} else {
				const { handle, message, data } = this.config.errors.unknownError;
				ctx.ajax.addError(handle, message, data);
				this.emit('unknown-error', error);
			}
			this.emit('err', error);
		} finally {
			if (!ctx.headersSent) {
				ctx.ajax.send();
			}
		}
	}

	startHttpServer() {
		const httpServer = this.koaApp.listen(this.config.port, () => {
			this.emit('http-server-started', this.koaApp, httpServer);
		});
	}
}

function portEvents(events, eventEmitterFrom, eventEmitterTo) {
	events.forEach(event => {
		eventEmitterFrom.on(event, (...args) => {
			eventEmitterTo.emit(event, ...args);
		});
	});
}
