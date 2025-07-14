import { Spotify } from "./API.js";

/*
const s = new Spotify("<A Valid SP_DC Cookie>");
s.initialize().then(() => {
	console.log("Your Spotify Session Info:", s.sessionInfo);

	s.getMe().then((user) => {
		console.log("User Profile:", user);

		s.getLyrics("6q2PbvM9UEig4r8xku7VIb").then((lyrics) => {
			if (lyrics !== null) {
				console.log("Lyrics:\n", lyrics);
			}
		});

		s.getLyricsLRC("2n9fC0A4ptmWqYeMXEVaok").then((lyrics) => {
			if (lyrics !== null) {
				console.log("Lyrics:\n", lyrics);
			}
		});

		// should return null as the song does not have any lyrics
		s.getLyrics("4iV5W9uYEdYUVa79Axb7Rh").then((lyrics) => {
			if (lyrics === null) {
				console.log("No lyrics found for the track.");
			}
		});
	});
});
*/

export * from "./API.js";
export * from "./error.js";
