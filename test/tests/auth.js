import request from 'supertest';
import Velkro from '../../lib/application.js';

describe('Authentication', () => {
	const app = new Velkro({
		modulesDir: './test/sample-app/modules',
		port: 0,
		jwt: {
			secret: '38rjh#U&G223id9#$^&Oj889',
		},
	});

	test('login-required endpoint - not logged in', async () => {
		await app.ready;

		const response = await request(app.httpServer).get('/user/me');

		expect(response.body).toHaveProperty('errors');
		expect(response.body.errors[0]).toHaveProperty('handle', 'login-required');
	});

	test('login-required endpoint - logged in', async () => {
		await app.ready;

		const response1 = await request(app.httpServer).post('/user/login').send({
			email: 'foo@foo.com',
			password: 'bar',
		});

		const cookies = response1.headers['set-cookie'];
		const sessionCookie = cookies.find(c => c.startsWith('session='));

		const response2 = await request(app.httpServer).get('/user/me').set('Cookie', sessionCookie);

		expect(response2.body.data).toEqual({
			email: 'foo@foo.com',
			firstname: 'bar',
		});
	});

	afterAll(() => {
		app?.httpServer?.close?.();
	});
});
