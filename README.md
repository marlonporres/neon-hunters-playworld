# Starlight Plaza

A small KPop Demon Hunters-inspired 3D playground for a young child. Choose Rumi, Mira, or Zoey; dance to local instrumentals, make cloud magic, step on musical pads, share bubble tea, and explore with Bouncy the tiger. Stars are an optional bonus. Activities repeat without losing, combat, scores to beat, or instructions that must be read.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5199/**. This project uses its own port so it can coexist with another game on 5173.

```sh
npm test          # Behavior, geometry budget, and local music discovery
npm run typecheck
npm run build    # Type checks and production build
npm run preview  # Production build at http://127.0.0.1:4199/
```

The contributor guide records the tablet input direction; project commands and architecture are documented here.

## Play

- Choose a character and press **PLAY**.
- Drag anywhere in the generous **lower-left joystick area** to move. Release to stop. The camera follows automatically; no camera gesture is needed. **WASD / arrows** remain available on desktop.
- Colorful activity icons guide the character along the paths. Approaching an activity welcomes the child automatically; its large button repeats the action.
- **DANCE / Space** starts a dance. **MAGIC / M** releases a swirl of stars and turns nearby sleepy clouds into sparkles.
- The concert stage opens five large song choices. Songs loop and can be replayed. The other girls dance, and stage lights pulse gently with the music.
- Stepping on six colorful floor pads makes different notes. Tea gives the character a cup, and Bouncy follows, hops, and celebrates with you.
- Trees sway when approached. Stars return after a completed round. Clouds replenish, so magic can be repeated.
- Explore the twilight plaza: the original floating three-petal star opens for MAGIC and the beginning of Golden. Costume-colored lanterns and path charms follow the selected girl's identity; nearby flowers open and tea/fountain bubbles rise. Three portrait banners, a moon gate and a giant tea cup identify the destinations without reading. The city and warm gold trim share the visual language described in `ART-DIRECTION.md`.
- Visit the purple smiling bubble stand (or its activity icon), then tap **▶**. Tap or draw a magical trail through the large friendly creatures: bubbles pop into stars, and every five captures earns a brief celebration. **←** returns to the same hub position. Golden continues throughout; the shared mute button also silences effects.
- Friends launch from below in gentle gravity-driven arcs. Seven curated patterns introduce pairs and occasional fans; inactivity brings one large glowing central friend. Five cute creature looks, a rare golden friend, rainbow bubbles and occasional touchable star showers provide variety. One swipe can bubble several friends. A brief finger demonstration appears only on the first visit in the current session.
- Movement and **DANCE / MAGIC** work with separate fingers. A canceled gesture, orientation change or focus change clears movement safely.
- Pause / **Escape** takes a break. Losing focus pauses movement and music. The grown-up menu has volume control and local song availability.

## Local music

Your supplied **Golden (Instrumental)** is installed locally as `public/audio/songs/golden-instrumental.mp3` and plays by default. Audio files are ignored by Git. Nothing is downloaded by the game.

Add other legally obtained instrumentals to `public/audio/songs/` using these basenames:

| Song | Expected file |
| --- | --- |
| Golden | `golden-instrumental.mp3` |
| How It's Done | `how-its-done-instrumental.mp3` |
| Soda Pop | `soda-pop-instrumental.mp3` |
| Your Idol | `your-idol-instrumental.mp3` |
| What It Sounds Like | `what-it-sounds-like-instrumental.mp3` |

OGG, WAV, and M4A are also supported. Vite refreshes discovery when local files change; rebuild after adding music to a production build. Missing tracks use an original synthesized playground beat and are marked in the grown-up menu. Audio streams through one looping media element, with a low default volume. A filename manifest avoids embedding or duplicating audio in JavaScript bundles. Keep these personal soundtrack files local; omit them from any shared build.

## Golden Dance Party

Visit the concert stage (or tap its activity icon), then tap the large **GOLDEN PARTY** invitation. Rumi, Mira and Zoey perform together. Tap any portrait pad at any time for a dance and colorful stage reaction; every fifth interaction celebrates together. Glowing pads invite play without timing requirements. The occasional large magic star triggers a group effect. At the natural end, tap the replay arrow or the back arrow to return to the same hub position.

The existing local Golden media element supplies the timeline clock, pause and mute. Party playback ends naturally rather than looping; hub looping is restored on exit. Missing audio still permits play with the original synthesized fallback. `src/dance-party.ts` contains the reusable timeline schema and authored timestamp invitations. Character motion continues after the track ends, so finale effects and extra taps remain animated. The activity borrows the existing three avatars, stage and 24-star pool through the single main loop.

For focused browser verification, open `/?partyqa=local` and press **RUN PARTY CHECKS**. It plays the complete local track twice at normal speed, tests natural finale/replay, touch Pointer Events, pause/mute and twelve repeated returns. `/?partyqa=short` checks responsive controls and magic without full-track playback. Pointer fixtures are synthetic; physical tablet play remains a separate check.

## Architecture and performance

- `src/simulation.ts`: deterministic movement, circle collisions, proximity, pads, and repeatable activity state.
- `src/main.ts`: one animation loop, input, camera, and adaptive pixel ratio. `navigation.ts` finds collision-aware guided routes only when an activity icon is pressed.
- `src/input.ts`: normalized keyboard/analog movement, queued actions, and a captured dynamic joystick pointer.
- `src/bubble-game.ts` / `bubble-view.ts`: velocity/gravity arcs, curated adaptive pacing, forgiving segment detection, three reusable creature slots (maximum two on narrow phones), orthographic presentation, 144 pooled sparkles and 48 fading ribbon links. Fourteen small face textures are cached and uploaded once. The selected gallery avatar is borrowed and restored without loading another character.
- `src/world.ts`: merged opaque scenery, instanced stars, a fixed spark pool, and low-poly reactions.
- `src/world-art.ts`: reference-led city/stage artwork, original emblem, cached bubble/ground-light textures and bounded flower/lantern/bubble instances; updated by the same world loop. No additional lights or postprocessing.
- `src/characters.ts` / `geometry.ts`: cached VRoid GLBs with cloned humanoid rigs and a procedural fallback. All characters use the same animation/controller interface.
- `src/music.ts`: local playback, original synthesized fallback music, and short feedback sounds.
- `src/ui.ts` / `style.css`: large icon controls, character selection, song choices, and grown-up settings.

No physics engine, dynamic shadow maps, post-processing, external textures, remote fonts, or runtime network dependency. Pixel ratio starts at at most 1.5 and decreases if sustained frame rate falls below 48 FPS. Particle pools and all world objects are reused. Movement delta is capped after stalls; switching focus clears held inputs. Reduced-motion preferences soften visual effects.

## Browser verification

Open `/?tabletqa=local` and press **RUN TOUCH CHECKS** for touch Pointer Event fixtures: selection, analog movement, simultaneous action fingers, cancellation, stage camera, tap/swipe/near-miss captures, shared audio, celebrations, twenty transitions and GPU-resource/frame timing checks. These fixtures exercise real handlers but are synthetic events; complement them with real pointer dragging and a physical tablet check.

Add `&polish=1` to observe full launch/apex/fall cycles without captures, then exercise a longer session through 32 captures, multi-target gestures, Golden/rainbow targets, star showers, idle help and exit cleanup. Tests intentionally wait for targets to become visible because new friends begin below the screen. Inspect several cycles visually too; an automated trajectory assertion is not a substitute for watching the motion.

Open `/?qa=local` and press **RUN CHECKS** to exercise selection/spawn for every character, actual keyboard events, stars, camera movement, all activities, all song buttons, local playback, repeated actions, pause/resume, errors, and real frame timing.

The final VRoid-model production preview passed 40 browser checks. This session measured about 106 FPS exploring and 109 FPS with all three girls at the concert (997 × 901 canvas, pixel ratio 1.5; p95 16.7 ms). Repeated actions held GPU resources at 89 geometries and 75 textures. See `character-work/DELIVERY.md` and `.qa/character-model-checks.txt` for evidence; these are measurements on the tested machine, not a universal hardware guarantee.

For an isolated Chrome test, run `node scripts/browser-test.mjs --local`. It uses a temporary profile separate from the user's browser and saves screenshots and JSON results under `.qa/`. Set `CHROME_PATH` for another Chrome installation, or `GAME_URL` to test the production preview. Actual browser verification must pass; unit tests alone do not establish visual correctness or laptop frame rate.

## Open on your tablet

Run `npm run dev:tablet`. It prints a URL on the computer's private Wi-Fi adapter, such as `http://192.168.1.26:5200/`. Open that URL on a tablet connected to the same Wi-Fi. Keep the server running; press Ctrl+C to stop. The script binds only that private interface and does not change firewall rules or create a public tunnel. If several private adapters exist, set `TABLET_LAN_IP` to the desired existing adapter address. Landscape is the intended layout; portrait and short phone layouts are supported. Browser emulation measures this computer, not an Android tablet's GPU.

## Character assets

The three locally created MVP models live in `public/models/characters/{rumi,mira,zoey}.glb`; their paths and portrait colors are defined in `src/simulation.ts`. Each model is about 2 world units tall, feet at Y=0, facing +Z. Rumi has purple braided hair and a yellow jacket; Mira has magenta twin ponytails, a black top and yellow skirt; Zoey has dark bangs/buns and a teal sleeveless top.

Editable `.vroid`, original `.vrm`, separate `.glb`, and `GameCharacters_Master.blend` files are saved in `C:/Users/marlo/Documents/GameCharacters/`. Repository working copies and the reference checklist live in `character-work/`. The Blender master uses `CHAR_RUMI`, `CHAR_MIRA`, and `CHAR_ZOEY` collections. `prepare_characters.py` repeats import/export; `verify_characters.py` checks six joints per rig and renders a comparison without changing the master.

The GLBs retain facial morphs and skinning (Rumi 53,724 triangles; Mira 39,680; Zoey 37,697). Textures are capped at 1024. The browser uploads only blink/happy morphs, shares model geometry/textures, and animates independent skeletons for walking/dancing/tea. No authored animation clips or hair physics are required. These are private game approximations; keep the assets and supplied songs local.
