export type PartyCue = { at: number; kind: 'pulse' | 'look' | 'magic' | 'cheer'; pad?: number; duration?: number };
export interface PartyTimeline { song: string; demoDuration: number; cues: readonly PartyCue[] }

// Authored phrase starts and invitations, in seconds. These are playful prompts,
// never notes to hit. No waveform analysis or audio-clock replacement is used.
const phrases = [0, 15.6, 31.2, 46.8, 62.4, 78, 93.6, 109.2, 124.8, 140.4, 156, 171.6, 187.2, 202.8, 218.4];
export const GOLDEN_TIMELINE: PartyTimeline = {
  song: 'golden', demoDuration: 204,
  cues: [
    ...phrases.flatMap((at, phrase): PartyCue[] => [
      { at, kind: 'look', pad: phrase % 3 },
      ...[1.5, 5.4, 9.3, 13.2].map((offset, i): PartyCue => ({ at: at + offset, kind: 'pulse', pad: (phrase + i) % 3, duration: 1.7 })),
    ]),
    ...[18, 51, 86, 120, 156, 185, 216].map((at): PartyCue => ({ at, kind: 'magic', duration: 10 })),
    ...[31.2, 62.4, 93.6, 124.8, 156, 187.2].map((at): PartyCue => ({ at, kind: 'cheer', duration: 1.6 })),
  ].sort((a, b) => a.at - b.at),
};

export class DanceParty {
  active = false;
  finished = false;
  seconds = 0;
  motionTime = 0;
  interactions = 0;
  celebrations = 0;
  magicHits = 0;
  finaleCount = 0;
  look = 0;
  chosen = 0;
  groupTime = 0;
  effectTime = 0;
  effectDuration = .75;
  effectSerial = 0;
  effectGroup = false;
  readonly responses = [0, 0, 0];
  readonly pulses = [0, 0, 0];
  private cursor = 0;
  private magicUntil = 0;
  readonly timeline: PartyTimeline;
  constructor(timeline = GOLDEN_TIMELINE) { this.timeline = timeline; }
  get magicVisible() { return this.active && !this.finished && this.seconds < this.magicUntil; }
  enter() {
    this.active = true; this.finished = false; this.seconds = 0; this.motionTime = 0; this.interactions = 0;
    this.celebrations = 0; this.magicHits = 0; this.finaleCount = 0; this.cursor = 0; this.magicUntil = 0;
    this.chosen = 0; this.look = 0; this.groupTime = 0; this.effectTime = 0; this.effectSerial = 0; this.effectGroup = false;
    this.responses.fill(0); this.pulses.fill(0);
  }
  exit() { this.active = false; this.magicUntil = 0; this.groupTime = 0; this.effectTime = 0; this.responses.fill(0); this.pulses.fill(0); }
  private burst(group: boolean) {
    this.effectGroup = group; this.effectDuration = group ? 1.3 : .75;
    this.effectTime = this.effectDuration; this.effectSerial++;
    if (group) this.groupTime = 1.8;
  }
  press(pad: number) {
    if (!this.active || !Number.isInteger(pad) || pad < 0 || pad > 2) return false;
    this.chosen = pad; this.interactions++; this.responses[pad] = 1.45;
    const group = this.interactions % 5 === 0;
    if (group) this.celebrations++;
    this.burst(group); return true;
  }
  magic() {
    if (!this.magicVisible) return false;
    this.magicUntil = 0; this.magicHits++; this.interactions++;
    if (this.interactions % 5 === 0) this.celebrations++;
    this.burst(true); return true;
  }
  step(seconds: number, ended: boolean, dt: number) {
    if (!this.active) return;
    const elapsed = Math.max(0, Math.min(dt, .05));
    this.motionTime += elapsed;
    this.groupTime = Math.max(0, this.groupTime - elapsed); this.effectTime = Math.max(0, this.effectTime - elapsed);
    for (let i = 0; i < 3; i++) { this.responses[i] = Math.max(0, this.responses[i] - elapsed); this.pulses[i] = Math.max(0, this.pulses[i] - elapsed); }
    if (this.finished) return;
    if (seconds < this.seconds - .25) { this.cursor = 0; this.magicUntil = 0; this.pulses.fill(0); }
    this.seconds = Math.max(0, seconds);
    while (this.cursor < this.timeline.cues.length && this.timeline.cues[this.cursor].at <= this.seconds) {
      const cue = this.timeline.cues[this.cursor++];
      const remaining = (cue.duration || 0) - (this.seconds - cue.at);
      if (cue.kind === 'look') this.look = cue.pad!;
      if (cue.kind === 'pulse' && remaining > 0) this.pulses[cue.pad!] = remaining;
      if (cue.kind === 'magic' && remaining > 0) this.magicUntil = cue.at + cue.duration!;
      if (cue.kind === 'cheer' && remaining > 0) this.groupTime = remaining;
    }
    if (ended) { this.finished = true; this.finaleCount++; this.magicUntil = 0; this.pulses.fill(0); this.burst(true); }
  }
  snapshot() { return { active: this.active, finished: this.finished, seconds: this.seconds, motionTime: this.motionTime, interactions: this.interactions, celebrations: this.celebrations, magicHits: this.magicHits, magicVisible: this.magicVisible, finaleCount: this.finaleCount, groupTime: this.groupTime, chosen: this.chosen, pulses: [...this.pulses], responses: [...this.responses], effectTime: this.effectTime, effectSerial: this.effectSerial, cueCursor: this.cursor }; }
}
