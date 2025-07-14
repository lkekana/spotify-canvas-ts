/*
thanks to
- https://github.com/akashrchandran/syrics/blob/main/syrics/totp.py
- https://github.com/glomatico/votify/blob/main/votify/totp.py
*/

const SECRET = new TextEncoder().encode(
	"55601029510267381196079975060119874370686866",
);
export const VERSION = 14;
export const PERIOD = 30;
export const DIGITS = 6;

export async function generate(timestamp: number): Promise<string> {
	const counter = Math.floor(timestamp / 1000 / PERIOD);
	const counterBuffer = new ArrayBuffer(8);
	const view = new DataView(counterBuffer);
	view.setBigUint64(0, BigInt(counter), false);

	const key = await crypto.subtle.importKey(
		"raw",
		SECRET,
		{ name: "HMAC", hash: { name: "SHA-1" } },
		false,
		["sign"],
	);

	const hmacResult = new Uint8Array(
		await crypto.subtle.sign("HMAC", key, counterBuffer),
	);

	if (!hmacResult || hmacResult === undefined) {
		throw new Error("Failed to generate HMAC");
	}

	let offset = hmacResult[hmacResult.length - 1];
	if (!offset || offset === undefined) {
		throw new Error("Invalid offset in HMAC result");
	}
	offset = offset & 0x0f;

	const firstByte = hmacResult[offset];
	if (firstByte === undefined) {
		throw new Error("Invalid first byte in HMAC result");
	}

	const secondByte = hmacResult[offset + 1];
	if (secondByte === undefined) {
		throw new Error("Invalid second byte in HMAC result");
	}

	const thirdByte = hmacResult[offset + 2];
	if (thirdByte === undefined) {
		throw new Error("Invalid third byte in HMAC result");
	}

	const fourthByte = hmacResult[offset + 3];
	if (fourthByte === undefined) {
		throw new Error("Invalid fourth byte in HMAC result");
	}

	const binary =
		((firstByte & 0x7f) << 24) |
		((secondByte & 0xff) << 16) |
		((thirdByte & 0xff) << 8) |
		(fourthByte & 0xff);

	return (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}
