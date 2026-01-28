export type Image = {
	url: string;
	height: number;
	width: number;
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

export type ProfileAttributes = {
	data: {
		me: {
			profile: {
				avatar: { sources: Image[] };
				avatarBackgroundColor: number;
				name: string;
				uri: string;
				username: string;
			};
		};
	};
};
