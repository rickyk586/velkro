'use strict';

const request = require('supertest');
const Velkro = require('../../lib/application');

// const logMiddleware = require('../sample-app1/middleware/log');

async function abcMiddleware(ctx, next){
	ctx.ajax.setKey('abc', 'ABC');
	return next();
}

describe('app', () =>{
	const app = new Velkro({
		modulesDir: './test/sample-app/modules',
		middlewares: [
			// logMiddleware,
			abcMiddleware
		],
		jwt: {
			secret: '38rjh#U&G223id9#$^&Oj889'
		}
	})
		// .on('err', e => console.error(e));
		.on('internal-error', e => console.error(e))
		.on('unknown-error', e => console.error(e));
	
	test('basic call', async () => {
		await app.ready;
		
		const response = await request(app.httpServer).get('/');
		
		expect(response.body).toHaveProperty('data', 'Application API');
	});
	
	test('login-required endpoint - not logged in', async () =>{
		await app.ready;
		
		const response = await request(app.httpServer).get('/user/me');
		
		expect(response.body).toHaveProperty('errors');
		expect(response.body.errors[0]).toHaveProperty('handle', 'login-required');
	});
	
	test('login-required endpoint - logged in', async () => {
		await app.ready;
		
		const response1 = await request(app.httpServer)
			.post('/user/login')
			.send({
				email: 'foo@foo.com',
				password: 'bar'
			});
		
		expect(response1.body).toHaveProperty('jwt');
		
		const response2 = await request(app.httpServer)
			.get('/user/me')
			.set('Authorization', `Bearer ${response1.body.jwt}`);
		
		expect(response2.body.data).toEqual({
			email: 'foo@foo.com',
			firstname: 'bar',
		});
	});
	
	test('route - app-wide middleware', async () =>{
		await app.ready;
		
		const response = await request(app.httpServer).get('/');
		
		expect(response.body).toHaveProperty('abc', 'ABC');
	});
	
	test('route - individual middleware', async () =>{
		await app.ready;
		
		const response = await request(app.httpServer).get('/xyz');
		
		expect(response.body).toHaveProperty('data', 'xyz');
		expect(response.body).toHaveProperty('xyz', 'XYZ');
	});
	
	test('error handling', async () =>{
		await app.ready;
		
		const response = await request(app.httpServer).get('/test-error');
		
		expect(response.body).toHaveProperty('errors');
		expect(response.body.errors[0]).toHaveProperty('handle', 'external-error');
	});
	
	test('shutdown', () => {
		if(app && app.httpServer && app.httpServer.close){
			app.httpServer.close();
		}
	});
});