import Velkro from '../../lib/application.js';

describe('Application Routing', () => {
	test('application processRoute missing handler', async () => {
		// This test uses the newly created invalid module.
		// It should log a debug message and not add the route.
		const localApp = new Velkro({
			modulesDir: './test/sample-app/modules/invalid',
			startHttpServer: false,
		});
		await localApp.ready;
		// If it didn't crash and ready promise resolved, it's good.
	});

	test('application processRoute with object handler and middlewares', async () => {
		const localApp = new Velkro({
			modulesDir: './test/sample-app/modules/obj-handler',
			startHttpServer: false,
		});
		await localApp.ready;
	});

	test('application route registration with / prefix', async () => {
		const localApp = new Velkro({
			modulesDir: './test/sample-app/modules/slash',
			startHttpServer: false,
		});
		await localApp.ready;
	});

	test('application config routes base / prefix', async () => {
		const localApp = new Velkro({
			modulesDir: './test/sample-app/modules/invalid',
			startHttpServer: false,
			routes: {
				base: 'api',
			},
		});
		expect(localApp.config.routes.base).toBe('/api');
		await localApp.ready;
	});
});
