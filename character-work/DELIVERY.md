# Character MVP delivery

All three characters were created from the supplied references using one VRoid base workflow. Rumi's user-approved appearance was preserved. Mira has magenta twin ponytails, a black tee and yellow skirt; Zoey has dark straight bangs/twin buns, a teal sleeveless top and dark trousers.

## Delivered files

The requested folders under `C:/Users/marlo/Documents/GameCharacters/` contain:

- `vroid/{Rumi,Mira,Zoey}_MVP.vroid`: editable VRoid projects.
- `vrm/{Rumi,Mira,Zoey}_MVP.vrm`: original rigged VRM exports.
- `blender/GameCharacters_Master.blend`: three separate character collections, common scale and orientation.
- `exports/{rumi,mira,zoey}.glb`: separate web-ready models.
- `blender/comparison.png`, `model-report.json`, and `rig-verification.json`: comparison and verification evidence.

Game copies in `public/models/characters/` match the delivered GLBs. Definitions in `src/simulation.ts` point to these files. The existing player controller remains shared; cached model resources and independent cloned rigs support all three characters.

## Verification

- TypeScript and production build pass; all 10 automated behavior tests pass.
- All 40 browser integration checks pass in the production preview, including character selection/loading, grounded feet, consistent scale, movement, dancing, music, magic, tea, companion and repeated actions.
- Blender deformation checks pass for head, shoulder, upper arm, hips, thigh and lower leg on each rig. Side-by-side native Blender inspection and a rendered comparison were completed.
- Measured browser profile: 106 FPS exploration, 109 FPS concert; p95 16.7 ms, pixel ratio 1.5, 997 × 901 canvas. GPU resources stayed at 89 geometries / 75 textures during repeated actions. These measurements describe this machine/session.
- Proof: `.qa/character-model-checks.txt`, `character-model-selection.png`, and `character-model-concert.png`.

## MVP boundaries

Mira's tee is longer than the reference crop, and Zoey's side buns are higher than the reference. No film-detail refinement, hair physics or authored animation clips were added. Full facial morphs remain in the GLBs; the browser uses blink/happy morphs. Textures are capped at 1024. Reference images and the existing `AGENTS.md` were not modified.
