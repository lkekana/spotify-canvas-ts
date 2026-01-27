# spotify-canvas-ts

*A TypeScript library to fetch Canvas links from Spotify.*

✅ Works in both Node.js & browser environments  

## What are Canvas videos?
<img src="https://github.com/lkekana/spotify-canvas-ts/blob/9bb3715fdfb575c26e85b7659bc5d773a9f37c69/assets/ScreenRecording_07-15-2025%2013-32-02_1.gif" alt="A Spotify Canvas for 'Everything is Different (To Me)' by quickly, quickly" width="500" height="1082">

Spotify allows artists to upload short looping videos (called [Canvas](https://artists.spotify.com/canvas)) that play in the background while a song is playing, like the beautiful one above.
There are many projects that help can help users download them, but no simple Typescript interface for it. This library provides a simple way to fetch the links for Canvas artworks for any track on Spotify.

## 📌 Key Highlights
- **TypeScript-first** 🧱 for type safety and developer experience  
- **Spotify-powered** 🎧: Artworks sourced directly from Spotify's API  
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

// Get Canvas artworks for some songs
const artworks = await client.getCanvases([
	"spotify:track:6x3sun3UqxP4g0Juw7ZXx4",
	"spotify:track:7jdNolHsTx18e2QVoDm1uf",
]);
console.log("Canvases:", artworks);
```

## 🌟 Features
- ✅ **Zero dependencies** for lightweight performance  
- 🔍 **Typed API** for seamless TypeScript integration  
- 🧹 **Biome formatted** codebase for consistent style  
- 🔄 **Auto-renewing auth** to minimize cookie management

## Note
The `proto/canvas_pb.ts` file is generated using the  [protobuf-es/buf project](https://github.com/bufbuild/protobuf-es) using the `pnpm buf generate` command using the schema in `proto/canvas.proto` and config file `buf.gen.yaml`.

## Special Thanks
- [protobuf-es](https://github.com/bufbuild/protobuf-es)
- [Spicetify-Canvas](https://github.com/itsmeow/Spicetify-Canvas)
- [syrics](https://github.com/akashrchandran/syrics)
- [Librespot](https://github.com/librespot-org)
- Various Spotify Canvas downloaders: [spotify-canvas-downloader](https://github.com/Delitefully/spotify-canvas-downloader), [my-spotify-canvas](https://github.com/bartleyg/my-spotify-canvas), [spoticanvas-py](https://github.com/Brianmartinezsebas/spoticanvas-py), [Spotify-Canvas-API](https://github.com/Paxsenix0/Spotify-Canvas-API)

## 📜 License  
MIT License 📄 - See [LICENSE](https://github.com/lkekana/spotify-canvas-ts/blob/main/LICENSE) for details  


## 👤 Author  
Lesedi Kekana ([@lkekana](https://github.com/lkekana))
