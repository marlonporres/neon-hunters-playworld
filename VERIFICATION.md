# Browser Verification

**Current Golden Dance Party:** [.qa/GOLDEN-PARTY.md](.qa/GOLDEN-PARTY.md) records the interactive trio concert, two complete Golden playbacks, natural finale/replay, touch controls, preserved world regressions and bounded resources.

**Current world art pass:** [.qa/WORLD-ART.md](.qa/WORLD-ART.md) records the reference-led twilight plaza, original emblem, character accents, environmental reactions and regression/performance evidence. The concise visual specification is [ART-DIRECTION.md](ART-DIRECTION.md).

**Current bubble gameplay polish:** [.qa/BUBBLE-POLISH.md](.qa/BUBBLE-POLISH.md) documents the launched arcs, 21 tests, 35 extended touch checks, preserved world regressions and controlled before/after performance comparison.

**Current tablet-first implementation:** see [.qa/TABLET-VERIFICATION.md](.qa/TABLET-VERIFICATION.md) for the 15 tests, 40 world regression checks, 26 touch checks at three viewport sizes, local-network access and current model/performance evidence. The report below describes the earlier procedural-character implementation.

Verified October 4, 2026 with the connected desktop in-app browser. Both the Vite development server and the production preview passed all 35 integration checks. Results and screenshots are saved locally in `.qa/`.

## Results

- All three characters select and spawn correctly.
- WASD, arrow movement, collision-aware activity guidance, and the follow camera work.
- Dance, magic, musical pads, stars, concert song selection, Hunter clouds, bubble tea, and the following companion work together.
- The supplied Golden instrumental was discovered and actually played, with its media clock advancing. Four missing songs use original synthesized beats and show their missing-file status.
- Repeated actions keep GPU resources at 85 geometries and 3 textures after first-use uploads. Pause, resume, mute, and continued exploration pass.
- No JavaScript errors or unhandled exceptions occurred during either successful run.
- Ten automated behavior/geometry/manifest tests pass. TypeScript checking and the production build pass.

## Measured rendering

Production preview at a 1920 × 1080 drawing buffer, pixel ratio 1.5: approximately **110 FPS**, 8.3 ms median frame interval, 16.7 ms 95th percentile, 69 draw calls, and 27,294 triangles. Development run: approximately 103 FPS. These measurements describe this connected browser, not a guarantee for every laptop. Adaptive resolution supports slower hardware.

The initial hidden Chrome run was throttled to roughly one frame per second. Visible in-app browser runs resolved that testing limitation. An initial resource check measured before a hidden companion heart was first uploaded; warming the effect before comparing repeated actions confirmed stable counts.

## Reproduce

Run `npm test`, `npm run build`, and `npm run preview`. Open `http://127.0.0.1:4199/?qa=local` and press **RUN CHECKS**. Keep the browser visible during the frame profile. Ordinary play has no QA overlay at `http://127.0.0.1:4199/`.

The girls use recognizable procedural fallback hair and outfits. Licensed character models can replace them using the asset interface documented in `README.md`. A child's willingness to play for 15–30 minutes needs a supervised play session; automated checks establish the complete repeatable loop, not that subjective outcome.
