import request from 'supertest';
import Velkro from '../../lib/application.js';

describe('JWT State cookie domain', () => {
	test('setting cookie on multiple domains', async () => {
		const app = new Velkro({
			modulesDir: './test/sample-app/modules',
			port: 0,
			jwt: {
				secret: 'test-secret',
				cookie: {
					domain: ['example.com', 'test.com'],
				},
			},
		});

		await app.ready;

		const response = await request(app.httpServer)
			.post('/user/login')
			.send({email: 'foo@foo.com', password: 'bar'});

		const cookies = response.headers['set-cookie'];
		expect(cookies).toBeDefined();
		
		// Find session cookies
		const sessionCookies = cookies.filter(c => c.startsWith('session='));
		
		// Expect two session cookies, one for each domain
		expect(sessionCookies.length).toBe(2);
		expect(sessionCookies.some(c => c.includes('domain=example.com'))).toBe(true);
		expect(sessionCookies.some(c => c.includes('domain=test.com'))).toBe(true);

		app.httpServer.close();
	});

    test('setting cookie on a single domain string', async () => {
		const app = new Velkro({
			modulesDir: './test/sample-app/modules',
			port: 0,
			jwt: {
				secret: 'test-secret',
				cookie: {
					domain: 'example.com',
				},
			},
		});

		await app.ready;

		const response = await request(app.httpServer)
			.post('/user/login')
			.send({email: 'foo@foo.com', password: 'bar'});

		const cookies = response.headers['set-cookie'];
		expect(cookies).toBeDefined();
		
		const sessionCookies = cookies.filter(c => c.startsWith('session='));
		expect(sessionCookies.length).toBe(1);
		expect(sessionCookies[0]).toContain('domain=example.com');

		app.httpServer.close();
	});
});
