class CustomError extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name; // Set the error name to the class name
	}
}

export class NotValidSpDcError extends CustomError {}

export class TOTPGenerationError extends CustomError {}
