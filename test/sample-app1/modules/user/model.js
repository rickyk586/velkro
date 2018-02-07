'use strict';

const mockDB = {
	'123': {
		email: 'foo',
		firstname: 'bar',
	}
};

module.exports = {
	async find(userId){
		await new Promise(resolve => setTimeout(resolve, 50));
		return mockDB[userId];
	}
};