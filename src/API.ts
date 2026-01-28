import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { generate } from "./TOTP.js";
import { NotValidSpDcError, TOTPGenerationError } from "./error.js";
import {
	type CanvasRequest,
	CanvasRequestSchema,
	type CanvasRequest_Track,
	type CanvasResponse,
	CanvasResponseSchema,
} from "./proto/canvas_pb.js";
import type { ProfileAttributes, Session } from "./types.js";
import { SERVER_TIME_URL, SpotifyClient, TOKEN_URL } from "./extract.js";

const CANVASES_URL = "https://spclient.wg.spotify.com/canvaz-cache/v0/canvases";
const profileAttributesHash =
	"53bcb064f6cd18c23f752bc324a791194d20df612d8e1239c735144ab0399ced";

export class Spotify {
	private token: string | undefined = undefined;
	private dcToken: string;
	private useLatestClientInfo: boolean;
	private client: SpotifyClient;
	public sessionInfo: Session | undefined = undefined;

	constructor(dcToken: string, useLatestClientInfo = false) {
		this.dcToken = dcToken;
		this.useLatestClientInfo = useLatestClientInfo;
		this.client = new SpotifyClient();
	}

	async initialize(): Promise<void> {
		await this.login();
		if (this.useLatestClientInfo) {
			await this.client.getSession();
		}
	}

	private async fetchWithHeaders(
		url: string,
		options: RequestInit = {},
		includeBearer = false,
	): Promise<Response> {
		const apiHeaders = await this.client.getAPIHeaders(
			this.useLatestClientInfo,
		);
		let headers = {
			...apiHeaders,
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
			console.log(`server time: ${serverTime}`);
			const {
				totp,
				VERSION: version,
			}: { totp: string; VERSION: number } = await generate(serverTime);
			console.log(`totp: ${totp}, version: ${version}`);

			const params = new URLSearchParams({
				reason: "init",
				productType: "web-player",
				totp: totp,
				totpVer: version.toString(),
				ts: serverTime.toString(),
			});

			const tokenResponse = await this.fetchWithHeaders(
				`${TOKEN_URL}?${params.toString()}`,
			);
			const tokenResponseJSON = await tokenResponse.json();
			console.log(`token response: ${tokenResponseJSON}`);
			const tokenData: Session = tokenResponseJSON as Session;
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

	async getMe(): Promise<ProfileAttributes> {
		await this.refreshSession();
		const resp = await this.fetchWithHeaders(
			"https://api-partner.spotify.com/pathfinder/v2/query",
			{
				method: "POST",
				body: JSON.stringify({
					operationName: "profileAttributes",
					variables: {},
					extensions: {
						persistedQuery: {
							version: 1,
							sha256Hash: this.useLatestClientInfo
								? await this.client.partHash(
										"profileAttributes",
									)
								: profileAttributesHash,
						},
					},
				}),
			},
			true,
		);
		if (!resp.ok) {
			throw new Error(`HTTP error! status: ${resp.status}`);
		}
		const respObj: ProfileAttributes = await resp.json();
		return respObj;
	}

	async getCanvases(trackIDs: string[]): Promise<CanvasResponse> {
		await this.refreshSession();
		if (!this.token) {
			throw new Error("Token is not initialized. Call login() first.");
		}
		try {
			return await this.fetchCanvases(trackIDs, this.token);
		} catch (error) {
			throw new NotValidSpDcError(
				"sp_dc provided is invalid, please check it again!",
			);
		}
	}

	/**
	 * Fetches canvas data for a list of tracks using Protobuf encoding/decoding.
	 * @param tracks - List of track objects with `uri` property.
	 * @param accessToken - Spotify access token for authorization.
	 * @returns Decoded CanvasResponse object.
	 */
	private async fetchCanvases(
		tracks: string[],
		accessToken: string,
	): Promise<CanvasResponse> {
		// Build CanvasRequest Protobuf message
		const canvasRequest: CanvasRequest = create(CanvasRequestSchema, {
			tracks: tracks.map(
				(trackUri) =>
					({
						trackUri, // Set track URI
						etag: "", // Optional: Set etag if available
					}) as CanvasRequest_Track,
			),
		});

		// Serialize the request to binary format
		const requestBytes = toBinary(
			CanvasRequestSchema,
			create(CanvasRequestSchema, canvasRequest),
		);

		try {
			// Send POST request to Spotify API using fetch
			const response = await this.fetchWithHeaders(
				CANVASES_URL,
				{
					method: "POST",
					headers: {
						accept: "application/protobuf",
						"content-type": "application/x-protobuf",
						Authorization: `Bearer ${accessToken}`,
					},
					body: requestBytes,
				},
				true,
			);

			if (!response.ok) {
				console.error(
					`ERROR ${CANVASES_URL}: ${response.status} ${response.statusText}`,
				);
				throw new Error(response.statusText);
			}

			// Read the binary response
			const responseBuffer = await response.arrayBuffer();

			// Deserialize the binary response into a CanvasResponse object
			const canvasResponse = fromBinary(
				CanvasResponseSchema,
				new Uint8Array(responseBuffer),
			);
			return canvasResponse;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error(`ERROR ${CANVASES_URL}: ${errorMessage}`);
			throw error;
		}
	}
}
