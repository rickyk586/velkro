import jwtState from '../../lib/middleware/jwt-state.js';

describe('JWT State middleware', () => {
	test('jwt-state missing secret', () => {
		expect(() => jwtState()).toThrow('jwt-state: secret required');
	});
});
