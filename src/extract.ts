// directly based on github.com/Aran404/SpotAPI

import { Buffer } from "node:buffer";

export type TextDirection = "ltr" | "rtl";
export const SPOTIFY_HOME_PAGE_URL = "https://open.spotify.com/";
export const TOKEN_URL = "https://open.spotify.com/api/token";
export const SERVER_TIME_URL = "https://open.spotify.com/api/server-time";
const CLIENT_VERSION = "1.2.83.117.g3a8e4785";
const API_HEADERS = {
	accept: "application/json",
	"accept-language": "en-US",
	"content-type": "application/json",
	origin: SPOTIFY_HOME_PAGE_URL,
	priority: "u=1, i",
	referer: SPOTIFY_HOME_PAGE_URL,
	"sec-ch-ua":
		'"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
	"sec-ch-ua-mobile": "?0",
	"sec-ch-ua-platform": '"Windows"',
	"sec-fetch-dest": "empty",
	"sec-fetch-mode": "cors",
	"sec-fetch-site": "same-site",
	"user-agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
	"spotify-app-version": CLIENT_VERSION,
	"app-platform": "WebPlayer",
};
const SIMPLE_HEADERS = {
	"accept-language": "en-US",
	"content-type": "application/json",
	origin: SPOTIFY_HOME_PAGE_URL,
	referer: SPOTIFY_HOME_PAGE_URL,
	"sec-ch-ua":
		'"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
	"sec-ch-ua-mobile": "?0",
	"sec-ch-ua-platform": '"Windows"',
	"sec-fetch-dest": "empty",
	"sec-fetch-mode": "cors",
	"sec-fetch-site": "same-site",
	"user-agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
};

function combineChunks(
	nameMap: Record<number, string>,
	hashMap: Record<number, string>,
): string[] {
	const combined: string[] = [];
	for (const keyStr of Object.keys(nameMap)) {
		const key = Number(keyStr);
		if (Number.isNaN(key)) continue;
		if (Object.hasOwn(hashMap, key)) {
			const fileName = `${nameMap[key]}.${hashMap[key]}.js`;
			combined.push(fileName);
		}
	}
	return combined;
}

function extractMappings(
	jsCode: string,
): [Record<number, string>, Record<number, string>] {
	const pattern = /\{\d+:"[^"]+"(?:,\d+:"[^"]+")*\}/g;
	const matches = jsCode.match(pattern) ?? [];

	if (matches.length < 5) {
		throw new Error("Could not find mappings in the JS code.");
	}

	// Convert numeric keys to quoted strings so we can JSON.parse
	const toJsonObject = (objLiteral: string) =>
		objLiteral.replace(/(\d+):/g, '"$1":');

	if (matches[3] === undefined || matches[4] === undefined) {
		throw new Error("Could not find the required mappings in the JS code.");
	}

	const hashMapping = JSON.parse(toJsonObject(matches[3])) as Record<
		string,
		string
	>;
	const nameMapping = JSON.parse(toJsonObject(matches[4])) as Record<
		string,
		string
	>;

	// Convert string keys back to number keys
	const toNumberKeyRecord = (
		m: Record<string, string>,
	): Record<number, string> =>
		Object.fromEntries(Object.entries(m).map(([k, v]) => [Number(k), v]));

	return [toNumberKeyRecord(hashMapping), toNumberKeyRecord(nameMapping)];
}

function extractJSLinks(htmlContent: string): string[] {
	const jsLinks: string[] = [];
	const scriptTagPattern =
		/<script\s+[^>]*src=["']([^"']+\.js)["'][^>]*><\/script>/g;

	let match: RegExpExecArray | null = scriptTagPattern.exec(htmlContent);
	while (match !== null) {
		if (match[1]) jsLinks.push(match[1]);
		match = scriptTagPattern.exec(htmlContent);
	}
	return jsLinks;
}

export class SpotifyClient {
	private rawHashes: string | undefined = undefined;
	// private requestHashes: {
	//     name: string;
	//     type: "query" | "mutation";
	//     hash: string;
	// }[] = [];
	private jsPack: string | undefined = undefined;
	private serverConfig:
		| {
				appName: string;
				market: string;
				locale: {
					locale: string;
					rtl: boolean;
					textDirection: TextDirection;
				};
				userCountry: string;
				isPremium: boolean;
				correlationId: string;
				isAnonymous: boolean;
				gtmId: string;
				optimizeId: string;
				pipResources: {
					scripts: string[];
					styles: string[];
				};
				retargetingPixels: unknown | null;
				recaptchaWebPlayerFraudSiteKey: string;
				serverTime: number;
				clientVersion: string;
				buildVersion: string;
				buildDate: string; // ISO date string e.g. "2026-01-27"
		  }
		| undefined = undefined;

	async getClientVersion(useLatest = false): Promise<string> {
		if (!useLatest) return CLIENT_VERSION;

		if (this.serverConfig === undefined) {
			await this.getSession();
		}

		if (this.serverConfig === undefined) {
			// Fallback to default client version
			return CLIENT_VERSION;
		}

		return this.serverConfig.clientVersion;
	}

	async getAPIHeaders(useLatest = false): Promise<Record<string, string>> {
		if (!useLatest) return API_HEADERS;
		const clientVersion = await this.getClientVersion();
		return {
			...API_HEADERS,
			"spotify-app-version": clientVersion,
		};
	}

	fetchWithHeaders(
		url: string,
		options: RequestInit = {},
	): Promise<Response> {
		const headers = {
			...SIMPLE_HEADERS,
			...(options.headers || {}),
		};

		return fetch(url, {
			...options,
			headers,
		});
	}

	async getSha256Hash(): Promise<void> {
		if (this.jsPack === undefined) {
			await this.getSession();
		}

		if (this.jsPack === undefined) {
			throw new Error("Could not get JS pack");
		}

		const jsPackResp = await this.fetchWithHeaders(this.jsPack);
		if (!jsPackResp.ok) {
			console.error(
				`Failed to fetch JS pack: ${jsPackResp.status} ${jsPackResp.statusText}`,
			);
			throw new Error("Could not fetch JS pack");
		}
		console.log("Fetched JS pack");

		this.rawHashes = await jsPackResp.text();
		console.log("Extracted raw hashes from JS pack");
		const [hashMapping, strMapping] = extractMappings(this.rawHashes);
		const urls = combineChunks(strMapping, hashMapping).map(
			(s) => `https://open.spotifycdn.com/cdn/build/web-player/${s}`,
		);
		console.log(`Constructed ${urls.length} chunk URLs`);

		for (const url of urls) {
			const resp = await this.fetchWithHeaders(url, {
				headers: {
					accept: "*/*",
					accept_encoding: "gzip, deflate, br, zstd",
					accept_language: "en-US,en;q=0.9",
					referer: "https://open.spotify.com/",
				},
			});
			if (!resp.ok) {
				console.error(
					`Failed to fetch chunk: ${resp.status} ${resp.statusText}`,
				);
				continue;
			}
			const chunkText = await resp.text();
			this.rawHashes += chunkText;
		}

		// P.S. you can get all query hashes for all GQL requests by uncommenting this :)
		// const hashPattern = /"([a-zA-Z0-9_]+)","(query|mutation)","([a-f0-9]{64})"/g;
		// let match: RegExpExecArray | null = hashPattern.exec(this.rawHashes);
		// while (match !== null) {
		//     const [, name, type, hash] = match;
		//     if (name && type && hash)
		//         requestHashes.push({ name, type: type as "query" | "mutation", hash });
		//     match = hashPattern.exec(this.rawHashes);
		// }
		// console.log(`Extracted ${requestHashes.length} request hashes:`);
		// console.log(JSON.stringify(requestHashes));
	}

	async partHash(name: string): Promise<string> {
		if (this.rawHashes === undefined) {
			await this.getSha256Hash();
		}

		if (this.rawHashes === undefined) {
			throw new Error("Could not get Spotify hashes");
		}
		try {
			// return this.rawHashes.split(`"${name}","query","`)[1].split('"')[0] || "";
			const parts = this.rawHashes.split(`"${name}","query","`);
			if (parts.length < 2) {
				throw new Error("Not found in query");
			}
			if (parts[1] === undefined) {
				throw new Error("Not found in query part");
			}
			const result = parts[1].split('"')[0];
			if (result === undefined) {
				throw new Error("Not found in query result");
			}
			console.log(`Found hash for ${name} in query: ${result}`);
			return result;
		} catch (error) {
			// return this.rawHashes.split(`"${name}","mutation","`)[1].split('"')[0];
			const parts = this.rawHashes.split(`"${name}","mutation","`);
			if (parts.length < 2) {
				throw new Error("Not found in mutation");
			}
			if (parts[1] === undefined) {
				throw new Error("Not found in mutation part");
			}
			const result = parts[1].split('"')[0];
			if (result === undefined) {
				throw new Error("Not found in mutation result");
			}
			return result;
		}
	}

	async getSession() {
		const resp = await this.fetchWithHeaders("https://open.spotify.com");
		if (!resp.ok) {
			throw new Error(
				`Failed to fetch Spotify homepage: ${resp.status} ${resp.statusText}`,
			);
		}
		const respText = await resp.text();
		console.log("Fetched Spotify homepage");

		const allJSPacks = extractJSLinks(respText);
		console.log(`Found ${allJSPacks.length} JS packs`);
		console.log(JSON.stringify(allJSPacks));
		this.jsPack = allJSPacks.find(
			(link) =>
				link.includes("web-player/web-player") && link.endsWith(".js"),
		);
		console.log(`Using JS pack: ${this.jsPack}`);

		const rawAppServerConfig = respText
			.split('<script id="appServerConfig" type="text/plain">')[1]
			?.split("</script>")[0];
		console.log("Extracted raw app server config");
		console.log(rawAppServerConfig);
		if (rawAppServerConfig) {
			const decodedConfig = Buffer.from(
				rawAppServerConfig,
				"base64",
			).toString("utf-8");
			this.serverConfig = JSON.parse(decodedConfig);
			console.log("Parsed server config:");
			console.log(JSON.stringify(this.serverConfig, null, 2));
		}
		// CLIENT_VERSION = this.serverConfig?.clientVersion || CLIENT_VERSION;
	}
}
// console.log(await new SpotifyClient().partHash("getTrack"));
