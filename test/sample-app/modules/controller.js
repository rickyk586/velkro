import {ExternalError} from '../../../lib/errors.js';
import model from './model.js';

export default {
	async testError(_ctx) {
		try {
			await model.testError();
		} catch (e) {
			if (e.message === 'internal-error') {
				throw new ExternalError('external-error', 'An ExternalError has occurred');
			} else {
				throw e;
			}
		}

		return 'no error';
	},
};
