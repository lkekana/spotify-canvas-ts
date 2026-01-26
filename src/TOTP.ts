/*
thanks to
- https://github.com/akashrchandran/syrics/blob/main/syrics/totp.py
- https://github.com/glomatico/votify/blob/main/votify/totp.py
*/
import { Buffer } from "node:buffer";

const SECRET_1_B64_LINK = "aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3h5bG9mbGFrZS9zcG90LXNlY3JldHMtZ28vcmVmcy9oZWFkcy9tYWluL3NlY3JldHMvc2VjcmV0RGljdC5qc29u";
const SECRET_2_B64_LINK = "aHR0cHM6Ly9jb2RlLnRoZXRhZGV2LmRlL1RoZXRhRGV2L3Nwb3RpZnktc2VjcmV0cy9yYXcvYnJhbmNoL21haW4vc2VjcmV0cy9zZWNyZXREaWN0Lmpzb24=";
const SECRET_3_B64_LINK = "aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2JpbmltdW0vb3Blbi1zcG90aWZ5LWFwaS9kMmYyMWU5YzBlY2ViZWQyZWRlNDY0NTkyMzNmM2MyZTJkMjI5OGUxL3NjcmlwdHMvc2VjcmV0RGljdC5qc29u";
export const PERIOD = 30;
export const DIGITS = 6;


// somewhat based on this: https://github.com/Brianmartinezsebas/spoticanvas-py/blob/main/spotify_auth_service.py
function deriveSecretBytes(data: number[]): Uint8Array {
	const mapped = data.map((value, index) => value ^ ((index % 33) + 9));
	const decimalJoined = mapped.join(""); // string of digits
	const hex = Buffer.from(decimalJoined, "utf8").toString("hex");
	const hexBytes = Buffer.from(hex, "hex");
	return new Uint8Array(hexBytes);
}

export async function generate(timestamp: number): Promise<{
	totp: string;
	VERSION: number;
}> {
	const counter = Math.floor(timestamp / 1000 / PERIOD);
	const counterBuffer = new ArrayBuffer(8);
	const view = new DataView(counterBuffer);
	view.setBigUint64(0, BigInt(counter), false);

	const { secret: SECRET, version: VERSION } =
		await getNewestSecretAndVersion();
	console.log(`${new Date().toISOString()} Using TOTP secret version: ${VERSION}`);
	console.log(`${new Date().toISOString()} Using TOTP secret: ${Buffer.from(SECRET).toString("hex")}`);

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

		const totp: string = (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0");
		return {
			totp,
			VERSION,
		}
}

// thanks to @xyloflake
const getLatestSecrets1 = (): Promise<Record<string, number[]>> => {
	const decodedLink = Buffer.from(SECRET_1_B64_LINK, "base64").toString("utf-8");
	console.log(`Fetching secrets from: ${decodedLink}`);
	return fetch(decodedLink).then((res) => res.json());
};

// thanks to @ThetaDev
const getLatestSecrets2 = (): Promise<Record<string, number[]>> => {
	const decodedLink = Buffer.from(SECRET_2_B64_LINK, "base64").toString("utf-8");
	console.log(`Fetching secrets from: ${decodedLink}`);
	return fetch(decodedLink).then((res) => res.json());
};

// thanks to @binimum
const getLatestSecrets3 = (): Promise<Record<string, number[]>> => {
	const decodedLink = Buffer.from(SECRET_3_B64_LINK, "base64").toString("utf-8");
	console.log(`Fetching secrets from: ${decodedLink}`);
	return fetch(decodedLink).then((res) => res.json());
};

const getNewestSecretAndVersion = async (): Promise<{
	secret: Uint8Array;
	version: number;
}> => {
	const results = await Promise.allSettled([
		getLatestSecrets1(),
		getLatestSecrets2(),
		getLatestSecrets3(),
	]);

	const combinedSecrets: Record<string, number[]> = {};

	for (const result of results) {
		if (result.status === "fulfilled") {
			Object.assign(combinedSecrets, result.value);
		}
	}

	if (Object.keys(combinedSecrets).length === 0) {
		throw new Error("No valid secrets found from any source.");
	}

	let newestVersion = -1;
	for (const versionStr of Object.keys(combinedSecrets)) {
		const versionNum = Number.parseInt(versionStr, 10);
		if (versionNum > newestVersion) {
			newestVersion = versionNum;
		}
	}

	if (newestVersion === -1) {
		throw new Error("No valid secrets found.");
	}

	const secretArray = combinedSecrets[newestVersion.toString()];
	if (!secretArray) {
		throw new Error("Secret for the newest version not found.");
	}

	return {
		secret: new Uint8Array(deriveSecretBytes(secretArray)),
		version: newestVersion,
	};
};