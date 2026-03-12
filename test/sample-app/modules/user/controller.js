import {ExternalError} from '../../../../lib/errors.js';
import model from './model.js';

export default {
	async login(ctx) {
		const data = ctx.request.body;

		let userId;

		try {
			userId = await model.login(data.email, data.password);
		} catch (e) {
			if (e.handle === 'incorrect-password') {
				throw new ExternalError('incorrect-password', 'The password you provided is incorrect');
			} else {
				throw e;
			}
		}

		ctx.state.user = {
			id: userId,
		};

		return userId;
	},
	async getMe(ctx) {
		const userId = ctx.state.user.id;
		const user = await model.find(userId);

		// filter user

		return user;
	},
};
