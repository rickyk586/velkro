export class ExternalError extends Error {
	constructor(handle, message = 'Error', data) {
		super(message);
		this.name = 'ExternalError';
		this.handle = handle;
		if (data) {
			this.data = data;
		}
	}
}
