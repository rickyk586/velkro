import request from 'supertest';
import Velkro from '../../lib/application.js';

describe('Application Core', () => {
	const app = new Velkro({
		modulesDir: './test/sample-app/modules',
		port: 0,
		jwt: {
			secret: '38rjh#U&G223id9#$^&Oj889',
		},
	}).on('unknown-error', e => console.error(e));

	test('basic call', async () => {
		await app.ready;

		const response = await request(app.httpServer).get('/');

		expect(response.body).toHaveProperty('data', 'Application API');
	});

	test('empty string route in module', async () => {
		await app.ready;

		const response = await request(app.httpServer).get('/user/');

		expect(response.body).toHaveProperty('data', 'User Module Root');
	});

	afterAll(() => {
		app?.httpServer?.close?.();
	});
});
