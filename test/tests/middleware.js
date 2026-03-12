import request from 'supertest';
import Velkro from '../../lib/application.js';

async function abcMiddleware(ctx, next) {
	ctx.ajax.setKey('abc', 'ABC');
	return next();
}

describe('Middleware Integration', () => {
	const app = new Velkro({
		modulesDir: './test/sample-app/modules',
		middlewares: [abcMiddleware],
		port: 0,
		jwt: {
			secret: '38rjh#U&G223id9#$^&Oj889',
		},
	});

	test('route - app-wide middleware', async () => {
		await app.ready;

		const response = await request(app.httpServer).get('/');

		expect(response.body).toHaveProperty('abc', 'ABC');
	});

	test('route - individual middleware', async () => {
		await app.ready;

		const response = await request(app.httpServer).get('/xyz');

		expect(response.body).toHaveProperty('data', 'xyz');
		expect(response.body).toHaveProperty('xyz', 'XYZ');
	});

	afterAll(() => {
		app?.httpServer?.close?.();
	});
});
