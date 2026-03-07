export default {
	async testError() {
		throw new Error('internal-error');
	},
};
