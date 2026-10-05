# Neon Hunters Playworld

A lightweight 3D K-pop fantasy game built with **TypeScript, Three.js and Vite**.

I originally created this project for my 3-year-old daughter, with the goal of building a colorful and interactive game that she could enjoy without needing to read instructions or learn complicated controls.

## Features

- 3D character selection
- Three playable characters
- Third-person movement
- Automatic follow camera
- Keyboard and touch controls
- Dance and Magic actions
- Interactive 3D world
- Golden Dance Party
- Bubble-catching minigame
- Music and visual effects
- Phone and tablet support
- No lives, timers or fail states

## Tech Stack

- TypeScript
- Three.js
- Vite
- WebGL
- HTML / CSS
- GLB / GLTF models

## Performance

The game is designed to remain lightweight and currently targets smooth gameplay around **60 FPS** on modern hardware.

The project uses:

- One main render loop
- Cached 3D assets
- Bounded particle effects
- Lightweight collision and interaction systems
- Responsive touch controls

## Testing

The project includes automated and browser-level tests for:

- Movement
- Character loading
- Touch controls
- Minigames
- Music interactions
- Phone and tablet layouts
- Resource stability

## Running locally

```bash
npm install
npm run dev
