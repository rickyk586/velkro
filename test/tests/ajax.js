import ajaxMiddleware from '../../lib/middleware/ajax.js';

describe('Ajax middleware', () => {
	test('Ajax addAction, addNotice, setKey, and send(data)', async () => {
		const middleware = ajaxMiddleware();

		const ctx = {
			body: null,
		};
		const next = () => Promise.resolve();

		await middleware(ctx, next);

		expect(ctx.ajax).toBeDefined();

		ctx.ajax
			.addAction('test-action')
			.addNotice('test-notice')
			.setKey('customKey', 'customValue')
			.addError('test-handle', 'test-message')
			.addError('test-handle-data', 'test-message-data', {foo: 'bar'})
			.send({baz: 'qux'});

		expect(ctx.body).toMatchObject({
			actions: ['test-action'],
			notices: ['test-notice'],
			customKey: 'customValue',
			errors: [
				{handle: 'test-handle', message: 'test-message'},
				{handle: 'test-handle-data', message: 'test-message-data', data: {foo: 'bar'}},
			],
			data: {baz: 'qux'},
		});

		// Test send() without data
		ctx.ajax.send();
		expect(ctx.body.data).toEqual({baz: 'qux'}); // data remains the same
	});

	test('Ajax class additional methods', async () => {
		// We can test this by adding a custom middleware or route that uses these methods
		// But it's easier to just test the Ajax class if we can import it,
		// however it's not exported. So we use a custom route.
	});
});
