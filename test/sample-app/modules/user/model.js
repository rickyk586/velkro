const mockDB = {
	123: {
		email: 'foo@foo.com',
		firstname: 'bar',
	},
};

export default {
	async find(userId) {
		await new Promise(resolve => setTimeout(resolve, 50));
		return mockDB[userId];
	},
	async login(email, password) {
		// mock login
		await new Promise(resolve => setTimeout(resolve, 50));
		if (email === mockDB[123].email && password === 'bar') {
			return 123;
		} else {
			const error = new Error('incorrect-password');
			error.handle = 'incorrect-password';
			throw error;
		}
	},
};
