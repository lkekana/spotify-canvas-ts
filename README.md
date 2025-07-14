
# spotify-canvas-ts

*A TypeScript library to fetch lyrics from Spotify.*

Based on: [Syrics](https://github.com/akashrchandran/syrics)  
✅ Works in both Node.js & browser environments  


## 📌 Key Highlights
- **TypeScript-first** 🧱 for type safety and developer experience  
- **Spotify-powered** 🎧: Lyrics sourced directly from Spotify's API  
- **Dual module support** 🔌: CommonJS & ESM compatibility  
- **Modern tooling** 🛠️: Biome for linting/formatting  


## Important Notes
- Requires a valid Spotify account (Premium recommended)  
- Uses the `sp_dc` cookie to authenticate (explained below) 
- 🚨 **Rate limits apply**: Too many requests can result in account termination by Spotify.
- This was tested in Node v20 and should work for any version above Node v16.


## 🧩 Prerequisites
> The `sp_dc` cookie to authenticate yourself with Spotify in order to have access to the required services.

📘 Follow the [Syrics guide](https://github.com/akashrchandran/syrics/wiki/Finding-sp_dc).  
Note: The cookie expires after 1 year - refresh only when needed!  


## 📦 Installation
Install via NPM:  
```bash
npm install spotify-canvas-ts
```


## Usage / API

```typescript
import { Spotify } from 'spotify-canvas-ts';

const client = new Spotify("<YOUR_SP_DC_COOKIE>");

await client.initialize();
console.log("Session Info:", client.sessionInfo);

// Get user profile
const user = await client.getMe();
console.log("User Profile:", user);

// Get lyrics for a track, in the raw format from Spotify
client.getLyrics("6q2PbvM9UEig4r8xku7VIb").then((lyrics) => {
	if (lyrics !== null) {
		console.log("Lyrics:\n", lyrics);
	}
});

// Get lyrics for a track, in the LRC format
client.getLyricsLRC("2n9fC0A4ptmWqYeMXEVaok").then((lyrics) => {
	if (lyrics !== null) {
		console.log("Lyrics:\n", lyrics);
	}
});

// should return null as the song does not have any lyrics
const lyrics3 = await client.getLyrics("4iV5W9uYEdYUVa79Axb7Rh");
if (lyrics3 === null) {
	console.log("No lyrics found for the track.");
}
```


## 🌟 Features
- ✅ **Zero dependencies** for lightweight performance  
- 🔍 **Typed API** for seamless TypeScript integration  
- 🧹 **Biome formatted** codebase for consistent style  
- 🔄 **Auto-renewing auth** to minimize cookie management 


## 📜 License  
MIT License 📄 - See [LICENSE](https://github.com/lkekana/spotify-canvas-ts/blob/main/LICENSE) for details  


## 👤 Author  
Lesedi Kekana ([@lkekana](https://github.com/lkekana))
