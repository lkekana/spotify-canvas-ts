import {
	SpotifyApi,
	type AccessToken,
	type Album,
	type ItemTypes,
	type PlaybackState,
	type Playlist,
	type Track,
	type UserProfile,
} from "@spotify/web-api-ts-sdk";
import { generate, VERSION } from "./TOTP.js";
import {
	NotValidSpDcError,
	TOTPGenerationError,
} from "./error.js";
import { formatLrc } from "./formatting.js";

const TOKEN_URL = "https://open.spotify.com/api/token";
const SERVER_TIME_URL = "https://open.spotify.com/api/server-time";
const SPOTIFY_HOME_PAGE_URL = "https://open.spotify.com/";
const CLIENT_VERSION = "1.2.46.25.g7f189073";
const CID = "d8a5ed958d274c2e8ee717e6a4b0971d";

const HEADERS = {
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

export type Session = {
	clientId: string;
	accessToken: string;
	accessTokenExpirationTimestampMs: number;
	isAnonymous: boolean;
	_notes: string;
	totpVerExpired: string;
	totpValidUntil: string;
};

export class Spotify {
	private token: string | undefined = undefined;
	private sp: SpotifyApi | undefined = undefined;
	private dcToken: string;
	public sessionInfo: Session | undefined = undefined;

	constructor(dcToken: string) {
		this.dcToken = dcToken;
	}

	async initialize(): Promise<void> {
		await this.login();
		this.sp = SpotifyApi.withAccessToken(CID, {
			access_token: this.token,
		} as AccessToken);
	}

	private async fetchWithHeaders(
		url: string,
		options: RequestInit = {},
		includeBearer = false,
	): Promise<Response> {
		let headers = {
			...HEADERS,
			Cookie: `sp_dc=${this.dcToken}`,
			...(options.headers || {}),
		};

		if (includeBearer) {
			if (!this.token) {
				throw new Error(
					"Token is not initialized. Call login() first.",
				);
			}
			const newHeaders = {
				...headers,
				Authorization: `Bearer ${this.token}`,
			};
			headers = newHeaders;
		}

		return fetch(url, { ...options, headers });
	}

	private async login(): Promise<Session> {
		try {
			const serverTimeResponse =
				await this.fetchWithHeaders(SERVER_TIME_URL);
			const serverTime =
				1e3 * (await serverTimeResponse.json()).serverTime;
			const totp = await generate(serverTime);

			const params = new URLSearchParams({
				reason: "init",
				productType: "web-player",
				totp: totp,
				totpVer: VERSION.toString(),
				ts: serverTime.toString(),
			});

			const tokenResponse = await this.fetchWithHeaders(
				`${TOKEN_URL}?${params.toString()}`,
			);
			const tokenData: Session = (await tokenResponse.json()) as Session;
			this.sessionInfo = tokenData;
			this.token = tokenData.accessToken;
			return tokenData;
		} catch (error) {
			if (error instanceof Error && error.message.includes("TOTP")) {
				throw new TOTPGenerationError(
					"Error generating TOTP, please retry!",
				);
			}
			throw new NotValidSpDcError(
				"sp_dc provided is invalid, please check it again!",
			);
		}
	}

	// refresh session if needed
	public async refreshSession(): Promise<Session> {
		if (
			!this.sessionInfo ||
			Date.now() >= this.sessionInfo.accessTokenExpirationTimestampMs
		) {
			try {
				this.sessionInfo = await this.login();
			} catch (error) {
				if (
					error instanceof NotValidSpDcError ||
					error instanceof TOTPGenerationError
				) {
					throw error;
				}
				throw new Error(
					"An unexpected error occurred while refreshing the session.",
				);
			}
		}
		return this.sessionInfo;
	}

	async getMe(): Promise<UserProfile> {
		if (!this.sp) {
			throw new Error(
				"Spotify API client is not initialized. Call initialize() first.",
			);
		}
		await this.refreshSession();
		try {
			return await this.sp.currentUser.profile();
		} catch (error) {
			throw new NotValidSpDcError(
				"sp_dc provided is invalid, please check it again!",
			);
		}
	}

	async getLyrics(trackId: string): Promise<LyricsResponse | null> {
		const params = "format=json&market=from_token";
		await this.refreshSession();
		try {
			const response = await this.fetchWithHeaders(
				`https://spclient.wg.spotify.com/color-lyrics/v2/track/${trackId}?${params}`,
				{},
				true,
			);
			if (response.status === 200) {
				return await response.json();
			}
			return null;
		} catch {
			return null;
		}
	}

	async getLyricsLRC(trackId: string): Promise<string | null> {
		if (!this.sp) {
			throw new Error(
				"Spotify API client is not initialized. Call initialize() first.",
			);
		}
		const lyricsResponse = await this.getLyrics(trackId);
		if (lyricsResponse === null) {
			console.warn(`No lyrics found for track ID: ${trackId}`);
			return null;
		}
		const trackData = await this.sp.tracks.get(trackId);
		return formatLrc(lyricsResponse, trackData);
	}
}
