import { Spotify } from "./API.js";

const s = new Spotify("<A Valid SP_DC Cookie>");
s.initialize().then(() => {
	console.log("Your Spotify Session Info:", s.sessionInfo);

	s.getMe().then((user) => {
		console.log("User Profile:", user);

		s.getCanvases([
			"spotify:track:6x3sun3UqxP4g0Juw7ZXx4",
			"spotify:track:7jdNolHsTx18e2QVoDm1uf",
		]).then((canvases) => {
			console.log("Canvases:", canvases);
		});
	});
});

export * from "./API.js";
export * from "./error.js";
