export interface Point { x: number; y: number }
export interface Demon extends Point {
  phase: 'hidden' | 'float' | 'bubble'; age: number; radius: number; variant: number;
  vx: number; vy: number; gravity: number; size: number; launchId: number;
  kind: 'normal' | 'golden' | 'rainbow'; assist: boolean;
}
export function segmentDistance(point: Point, from: Point, to: Point) {
  const dx = to.x - from.x; const dy = to.y - from.y; const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / length)) : 0;
  return Math.hypot(point.x - from.x - dx * t, point.y - from.y - dy * t);
}
// Curated start/end positions along the bottom, staggered launches, and apex heights.
const PATTERNS = [
  { name: 'single', arcs: [[0, 0.12, 0, 1.4]] },
  { name: 'friend-pair', arcs: [[-0.65, -0.2, 0, 1.5], [0.65, 0.2, 0.8, 1.8]] },
  { name: 'double-arc', arcs: [[-0.7, 0.55, 0, 1.8], [0.7, -0.55, 0.65, 1.4]] },
  { name: 'three-friends', arcs: [[-0.65, -0.4, 0, 1.2], [0, 0.15, 0.6, 2.1], [0.65, 0.4, 1.2, 1.5]] },
  { name: 'high-float', arcs: [[0.2, -0.2, 0, 2.2]] },
  { name: 'little-parade', arcs: [[-0.6, 0.25, 0, 1.3], [-0.45, 0.55, 0.7, 1.8]] },
  { name: 'surprise-sides', arcs: [[-0.7, -0.1, 0, 1.6], [0.7, 0.15, 1, 1.5]] },
] as const;

// Three permanent slots; no failure state, miss count, or competitive pressure.
export class BubbleGame {
  active = false; captures = 0; normalCaptures = 0; celebration = 0; reaction = 0;
  elapsed = 0; halfWidth = 7.2; lastCapture = 0; shower = 0; specialPulse = 0;
  safeTop = 2.2;
  pattern = 'single'; patternSerial = 0; launched = 0; goldenCaptures = 0; rainbowCaptures = 0;
  readonly demons: Demon[] = Array.from({ length: 3 }, (_, variant) => ({ phase: 'hidden', age: 0, x: 0, y: -5.7, radius: 1.12, variant, vx: 0, vy: 0, gravity: -8, size: 1.9, launchId: 0, kind: 'normal', assist: false }));
  private random: () => number;
  private plan: number = 0; private event = 0; private patternStarted = 0;
  private nextPattern = 0; private nextGolden = 10; private nextRainbow = 16;
  constructor(random = Math.random) { this.random = random; }
  enter() {
    this.active = true; this.captures = this.normalCaptures = this.elapsed = this.lastCapture = 0;
    this.celebration = this.reaction = this.shower = this.specialPulse = 0;
    this.patternSerial = this.launched = this.goldenCaptures = this.rainbowCaptures = 0;
    this.plan = this.event = this.patternStarted = this.nextPattern = 0;
    this.nextGolden = 10; this.nextRainbow = 16; this.pattern = 'single';
    this.demons.forEach(d => { d.phase = 'hidden'; d.age = 0; });
  }
  exit() { this.active = false; this.celebration = this.reaction = this.shower = this.specialPulse = 0; this.demons.forEach(d => { d.phase = 'hidden'; }); }
  resize(halfWidth: number, safeTop = 2.2) {
    const ratio = halfWidth / this.halfWidth; this.halfWidth = halfWidth;
    this.safeTop = safeTop;
    this.demons.forEach(d => { d.x *= ratio; d.vx *= ratio; });
    if (halfWidth < 3.2) this.demons[2].phase = 'hidden';
  }
  hit(from: Point, to = from) {
    if (!this.active) return [];
    const caught: number[] = [];
    this.demons.forEach((d, i) => {
      if (d.phase !== 'float' || d.y < -4.2 || segmentDistance(d, from, to) > d.radius) return;
      d.phase = 'bubble'; d.age = 0; caught.push(i); this.captures++; this.lastCapture = this.elapsed; this.reaction = 1.2;
      if (d.kind === 'normal') this.normalCaptures++;
      else { this.specialPulse = this.celebration = 1.5; if (d.kind === 'golden') this.goldenCaptures++; else this.rainbowCaptures++; }
      if (this.captures % 5 === 0) { this.celebration = 1.7; if (this.captures % 15 === 0) this.shower = 1.9; }
    });
    return caught;
  }
  private beginPattern() {
    const idle = this.elapsed - this.lastCapture >= 5;
    const choices = this.captures < 5 ? [0, 4, 0, 1] : this.captures < 10 ? [1, 0, 2, 4, 6] : [2, 5, 0, 3, 6, 4, 1];
    this.plan = idle ? 0 : choices[this.patternSerial % choices.length];
    this.pattern = idle ? 'gentle-assist' : PATTERNS[this.plan].name;
    this.patternSerial++; this.event = 0; this.patternStarted = this.elapsed;
  }
  private launch(d: Demon, arc: readonly number[]) {
    const assist = this.elapsed - this.lastCapture >= 5;
    if (assist) this.pattern = 'gentle-assist';
    const golden = this.normalCaptures >= this.nextGolden;
    const rainbow = !golden && this.captures >= this.nextRainbow;
    d.kind = golden ? 'golden' : rainbow ? 'rainbow' : 'normal';
    if (golden) this.nextGolden = this.normalCaptures + 8 + Math.floor(this.random() * 7);
    if (rainbow) this.nextRainbow = this.captures + 13;
    d.size = golden ? 2.15 : assist || this.captures < 5 ? 2.05 : 1.85 + this.random() * 0.15;
    d.radius = d.size * 0.64; d.assist = assist;
    d.variant = golden ? 5 : rainbow ? 6 : this.launched % 5;
    d.gravity = golden || assist || this.plan === 4 ? -6.6 : -8.6;
    // Highest sprite edge stays below header controls (world Y approximately 3.4).
    const apex = Math.min(this.safeTop, assist ? 1.4 : arc[3]);
    d.y = -5.7; d.vy = Math.sqrt(2 * -d.gravity * (apex - d.y));
    const travelTime = 2 * d.vy / -d.gravity;
    const spread = Math.max(0.45, this.halfWidth - 1.5);
    d.x = (assist ? 0 : arc[0]) * spread;
    d.vx = ((assist ? 0.1 : arc[1]) * spread - d.x) / travelTime;
    d.phase = 'float'; d.age = 0; d.launchId = ++this.launched;
  }
  step(elapsed: number) {
    if (!this.active) return [];
    const dt = Math.max(0, Math.min(0.05, elapsed)); this.elapsed += dt;
    this.celebration = Math.max(0, this.celebration - dt); this.reaction = Math.max(0, this.reaction - dt);
    this.shower = Math.max(0, this.shower - dt); this.specialPulse = Math.max(0, this.specialPulse - dt);
    const popped: (Point & {kind: Demon['kind']})[] = [];
    for (let i = 0; i < this.demons.length; i++) {
      const d = this.demons[i]; if (d.phase === 'hidden') continue; d.age += dt;
      if (d.phase === 'float') {
        d.x += d.vx * dt; d.y += d.vy * dt + d.gravity * dt * dt / 2; d.vy += d.gravity * dt;
        if (d.y < -5.8 && d.vy < 0) d.phase = 'hidden';
      } else if (d.age >= 0.4) { popped.push({x:d.x,y:d.y,kind:d.kind}); d.phase = 'hidden'; }
    }
    if (this.elapsed >= this.nextPattern && this.event >= PATTERNS[this.plan].arcs.length) this.beginPattern();
    const arcs = PATTERNS[this.plan].arcs;
    const max = this.halfWidth < 3.2 || this.plan !== 3 ? 2 : 3;
    const idle = this.elapsed - this.lastCapture >= 5;
    // Introduce the central helper while the last old arc falls away, then keep
    // only one helper. Waiting for every old arc would delay assistance.
    const hasHelper = this.demons.some(d => d.phase !== 'hidden' && d.assist);
    const limit = idle ? (hasHelper ? 1 : 2) : max;
    if (this.event < arcs.length && this.elapsed - this.patternStarted >= arcs[this.event][2]) {
      const occupied = this.demons.filter(d => d.phase !== 'hidden').length;
      const slot = this.demons.find(d => d.phase === 'hidden');
      if (slot && occupied < limit) {
        this.launch(slot, arcs[this.event]); this.event++;
        if (this.event === arcs.length) this.nextPattern = this.elapsed + (this.launched === 1 ? 2.6 : 0.65 + this.random() * 0.5);
      }
    }
    return popped;
  }
  snapshot() { return { active: this.active, captures: this.captures, celebration: this.celebration, shower: this.shower, specialPulse: this.specialPulse, pattern: this.pattern, launched: this.launched, goldenCaptures: this.goldenCaptures, rainbowCaptures: this.rainbowCaptures, demons: this.demons.map(d => ({ ...d })), capacity: 3 }; }
}
