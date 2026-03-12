import request from 'supertest';
import {ExternalError} from '../../lib/errors.js';
import Velkro from '../../lib/application.js';

describe('Errors', () => {
	test('ExternalError without data', () => {
		const error = new ExternalError('handle', 'message');
		expect(error.handle).toBe('handle');
		expect(error.message).toBe('message');
		expect(error.data).toBeUndefined();
	});

	test('ExternalError with data', () => {
		const error = new ExternalError('handle', 'message', {some: 'data'});
		expect(error.handle).toBe('handle');
		expect(error.message).toBe('message');
		expect(error.data).toEqual({some: 'data'});
	});

	test('error handling', async () => {
		const app = new Velkro({
			modulesDir: './test/sample-app/modules',
			port: 0,
			jwt: {
				secret: '38rjh#U&G223id9#$^&Oj889',
			},
		});

		await app.ready;

		const response = await request(app.httpServer).get('/test-error');

		expect(response.body).toHaveProperty('errors');
		expect(response.body.errors[0]).toHaveProperty('handle', 'external-error');

		app.httpServer.close();
	});
});
