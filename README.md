# Neon Hunters Playworld

A lightweight 3D K-pop fantasy playground built with **TypeScript, Three.js, and Vite**.

The project started as a personal game for my 3-year-old daughter, designed around a simple question:

> Can a 3D browser game feel colorful, musical and interactive without requiring a young child to read instructions, master complex controls, or deal with failure states?

The result is a small interactive world focused on exploration, music, character interaction, touch-friendly controls and immediate visual feedback.

---

## About the Project

Neon Hunters Playworld is a browser-based 3D game inspired by the colorful visual language of K-pop fantasy animation.

The game is intentionally designed for a very young player.

Instead of traditional objectives such as combat, lives, timers or scoring pressure, the world encourages experimentation.

Players can:

- explore a compact 3D plaza
- select between three distinct characters
- interact with the environment
- use Dance and Magic actions
- play a friendly bubble-catching minigame
- visit interactive activity areas
- perform on a music stage
- participate in a touch-friendly Dance Party
- replay activities without penalties or fail states

The design philosophy is:

**simple interaction + strong feedback + good performance**

rather than mechanical complexity.

---

## Golden Dance Party

One of the main activities is an interactive concert experience.

During the performance:

- all three characters appear together
- large touch-friendly character pads trigger reactions
- characters dance and celebrate
- stage elements react to interaction
- special Magic Moments appear during the song
- every five interactions trigger a group celebration
- the player can replay the activity immediately
- there are no missed notes or penalties

It deliberately avoids becoming a traditional rhythm game.

Timing suggestions are invitations rather than requirements, allowing a young child to interact freely.

---

## Bubble Minigame

The game also includes a simple touch-first bubble activity.

Friendly creatures appear as large targets and can be captured with a single tap or forgiving swipe.

Captured targets:

1. enter a magical bubble
2. pop
3. generate stars and confetti
4. contribute toward a celebration every five captures

There are:

- no lives
- no timer
- no penalties
- no game-over state

---

## Child-Friendly UX

The interface was designed around a player who may not yet be able to read.

Key principles include:

- large touch targets
- icon-first controls
- forgiving hit detection
- automatic third-person camera
- minimal precision requirements
- no mandatory mouse-camera control
- no failure states
- immediate audiovisual feedback
- phone and tablet support
- reusable activities
- simple navigation

Keyboard controls are also supported for desktop testing.

---

## Technology

- **TypeScript**
- **Three.js**
- **Vite**
- WebGL
- HTML/CSS UI overlays
- GLB/GLTF character assets
- HTML Audio / Web Audio integration
- Pointer Events for unified mouse/touch input

The game intentionally avoids a heavy game engine or physics framework.

---

## Engineering Goals

A major part of the project was keeping the game lightweight while progressively increasing visual quality.

The runtime architecture uses:

- one authoritative render loop
- cached character and environment assets
- bounded particle pools
- lightweight proximity interactions
- simple collision and walkable-surface logic
- reusable character definitions
- centralized music handling
- controlled device pixel ratio
- resource cleanup between activities

The project avoids unnecessary:

- physics simulation
- volumetric effects
- multiple rendering loops
- excessive dynamic lighting
- large post-processing chains
- high-resolution textures where they provide little visible benefit

---

## Performance

The project has been regression-tested in Chrome across desktop, phone and tablet-sized viewports.

Example measurements from development hardware:

| Scenario | Approx. Performance |
| --- | --- |
| Hub exploration | 60+ FPS |
| Concert / Dance Party | 60+ FPS |
| Bubble minigame | 60+ FPS |

During repeated activity transitions, geometry and texture counts remained stable, helping detect resource leaks during development.

Performance varies depending on hardware and browser.

---

## Testing

The project contains automated and browser-level verification for gameplay behavior.

Current verification covers areas such as:

- character loading
- character selection
- movement
- walkable surfaces
- camera behavior
- touch joystick
- simultaneous movement/actions
- music controls
- Dance and Magic
- bubble interactions
- concert interactions
- replay behavior
- phone layouts
- tablet layouts
- repeated activity transitions
- resource stability

The project also uses browser-based regression testing to catch issues that unit tests alone cannot detect.

---

## Character System

Characters use data-driven definitions so models can be replaced without rewriting gameplay systems.

Conceptually:

```ts
interface CharacterDefinition {
  id: string;
  name: string;
  modelPath: string;
  scale: number;
  groundOffset: number;
  themeColor: string;
}
