import localAssets from 'virtual:local-songs';

export const SONGS = [
  { id: 'golden', title: 'Golden', file: 'golden-instrumental', icon: 'sun', color: '#f4d48b', bpm: 123 },
  { id: 'how-its-done', title: "How It's Done", file: 'how-its-done-instrumental', icon: 'bolt', color: '#d2c2ef', bpm: 120 },
  { id: 'soda-pop', title: 'Soda Pop', file: 'soda-pop-instrumental', icon: 'cup', color: '#b8dccd', bpm: 120 },
  { id: 'your-idol', title: 'Your Idol', file: 'your-idol-instrumental', icon: 'crown', color: '#c0d1ef', bpm: 110 },
  { id: 'what-it-sounds-like', title: 'What It Sounds Like', file: 'what-it-sounds-like-instrumental', icon: 'heart', color: '#efc4d5', bpm: 120 },
] as const;

// The build scans filenames, not audio contents. Local files are streamed on Play.

export class MusicSystem {
  context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNote = 0;
  private step = 0;
  private generation = 0;
  private demoStart = 0;
  private demoOffset = 0;
  private effectLast = 0;
  private audio = new Audio();
  selected = -1;
  playing = false;
  muted = false;
  volume = 0.35;
  mode: 'demo' | 'local' = 'demo';
  error = '';
  files: (string | null)[] = SONGS.map((song) => localAssets.find((path) => ['mp3', 'ogg', 'wav', 'm4a'].some((extension) => path.toLowerCase().endsWith(`/${song.file}.${extension}`))) || null);
  onChange: () => void = () => {};

  constructor() {
    this.audio.loop = true;
    this.audio.preload = 'none';
    this.audio.volume = this.volume * 0.55;
    this.audio.addEventListener('ended', () => { if (!this.audio.loop) { this.playing = false; this.onChange(); } });
    this.audio.addEventListener('error', () => {
      if (!this.playing || this.mode !== 'local') return;
      this.error = 'This local file could not be played. The original plaza beat is playing instead.';
      this.startDemo();
      this.onChange();
    });
  }

  async unlock() {
    try {
      this.context ??= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume * 0.2;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      this.error = 'Audio is unavailable in this browser. You can still play.';
    }
  }

  async play(index = this.selected >= 0 ? this.selected : 0) {
    const generation = ++this.generation;
    this.stopTimer();
    this.audio.pause();
    this.selected = index;
    this.playing = true;
    this.error = '';
    this.demoOffset = 0;
    await this.unlock();
    if (generation !== this.generation) return;
    const path = this.files[index];
    if (path) {
      this.mode = 'local';
      this.audio.src = path;
      this.audio.currentTime = 0;
      try { await this.audio.play(); }
      catch {
        if (generation !== this.generation) return;
        this.error = 'The local song could not start. Playing the original plaza beat.';
        this.startDemo();
      }
    } else this.startDemo();
    this.onChange();
  }

  private startDemo(offset = 0) {
    this.audio.pause();
    this.stopTimer();
    this.mode = 'demo';
    if (!this.context) return;
    this.nextNote = this.context.currentTime + 0.025;
    this.demoStart = this.nextNote;
    this.demoOffset = offset;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 40);
    this.schedule();
  }

  private schedule() {
    if (!this.context || !this.playing) return;
    const tick = 60 / SONGS[this.selected >= 0 ? this.selected : 0].bpm / 2;
    // Original pentatonic playground pattern, unrelated to the named soundtracks.
    const melody = [0, 4, 7, 12, 7, 4, 9, 7, 0, 7, 9, 12, 16, 12, 9, 4];
    if (this.nextNote < this.context.currentTime - tick) this.nextNote = this.context.currentTime;
    while (this.nextNote < this.context.currentTime + 0.15) {
      const transpose = this.selected * 2;
      const frequency = 220 * 2 ** ((melody[this.step % melody.length] + transpose) / 12);
      this.tone(frequency, this.nextNote, 0.18, 0.24, 'sine');
      if (this.step % 2 === 0) this.tone(110 * 2 ** (transpose / 12), this.nextNote, 0.22, 0.32, 'triangle');
      if (this.step % 4 === 0) this.tone(65, this.nextNote, 0.1, 0.42, 'sine');
      this.nextNote += tick;
      this.step++;
    }
  }

  private tone(frequency: number, at: number, duration: number, volume: number, type: OscillatorType = 'sine') {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  effect(kind: 'star' | 'magic' | 'tea' | 'friend' | 'pad' | 'bubble' | 'pop' | 'celebrate' | 'golden' | 'sparkle', note = 440) {
    if (!this.context || this.context.currentTime - this.effectLast < 0.09) return;
    this.effectLast = this.context.currentTime;
    const now = this.context.currentTime;
    if (['bubble', 'pop', 'celebrate', 'golden', 'sparkle'].includes(kind)) {
      const softNotes = kind === 'bubble' ? [440, 554] : kind === 'pop' ? [784, 523] : kind === 'sparkle' ? [1047,1319] : kind === 'golden' ? [659,880,1047,1319] : [523, 659, 784, 1047];
      const pitch=kind==='pop' || kind==='bubble' ? .94+Math.random()*.12 : 1;
      softNotes.forEach((frequency, index) => this.tone(frequency*pitch, now + index * 0.05, 0.12, 0.19, 'sine'));
      return;
    }
    const notes = kind === 'pad' ? [note] : kind === 'magic' ? [523, 659, 784, 1047] : kind === 'tea' ? [392, 523, 659] : [659, 880];
    notes.forEach((frequency, index) => this.tone(frequency, now + index * 0.06, 0.23, 0.35));
  }

  stop() {
    if (this.mode === 'demo') this.demoOffset = this.position();
    this.generation++;
    this.playing = false;
    this.audio.pause();
    this.stopTimer();
    this.onChange();
  }

  async resume() {
    if (this.playing) return;
    if (this.selected < 0) { await this.play(); return; }
    const generation = ++this.generation;
    await this.unlock();
    if (generation !== this.generation) return;
    this.playing = true;
    if (this.mode === 'local') { try { await this.audio.play(); } catch { if (generation === this.generation) this.startDemo(); } }
    else this.startDemo(this.demoOffset);
    this.onChange();
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audio.volume = this.muted ? 0 : this.volume * 0.55;
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume * 0.2, this.context.currentTime, 0.03);
  }

  toggleMute() { this.muted = !this.muted; this.setVolume(this.volume); this.onChange(); }

  setLoop(value: boolean) { this.audio.loop = value; }
  position() { return this.mode === 'local' ? this.audio.currentTime : this.demoOffset + (this.playing ? Math.max(0, (this.context?.currentTime || 0) - this.demoStart) : 0); }
  ended() { return this.mode === 'local' && this.audio.ended; }

  beat() {
    if (!this.playing || this.muted) return 0;
    const seconds = this.mode === 'local' ? this.audio.currentTime : (this.context?.currentTime || 0) - this.demoStart;
    const duration = 60 / SONGS[this.selected >= 0 ? this.selected : 0].bpm;
    return Math.max(0, 1 - ((seconds % duration) / duration) * 3);
  }

  snapshot() { return { selected: this.selected, playing: this.playing, mode: this.mode, muted: this.muted, context: this.context?.state || 'uninitialized', localFiles: this.files, source: this.audio.currentSrc, currentTime: this.audio.currentTime, duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0, loop: this.audio.loop, ended: this.audio.ended, playbackRate: this.audio.playbackRate, error: this.error }; }
}
