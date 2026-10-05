import { CHARACTERS, ACTIVITIES } from './simulation.ts';
import type { CharacterId, GameState } from './simulation.ts';
import { SONGS, MusicSystem } from './music.ts';
import { bindJoystick } from './input.ts';
import type { DanceParty } from './dance-party.ts';

const paths: Record<string, string> = {
  star: '<path d="m12 2 3 6.3 7 .9-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.1 2 9.2l7-.9Z"/>',
  magic: '<path d="m4 20 12-12m-4-4 1-3 1 3 3 1-3 1-1 3-1-3-3-1Zm7 10 1-3 1 3 3 1-3 1-1 3-1-3-3-1Z"/><path d="m5 4 .5-2L6 4l2 .5L6 5l-.5 2L5 5l-2-.5Z"/>',
  music: '<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="18" cy="16" rx="3" ry="2.5"/>',
  dance: '<circle cx="12" cy="4" r="2"/><path d="m5 8 6 2 7-4m-7 4 2 5 6 5m-6-5-5 3-2 4"/>',
  cup: '<path d="m6 7 2 14h9l2-14Zm-1 0h15M14 7l2-5"/><circle cx="10" cy="17" r=".5"/><circle cx="15" cy="16" r=".5"/><circle cx="13" cy="19" r=".5"/>',
  cat: '<path d="m4 9 1-6 5 4h4l5-4 1 6c3 10-1 12-8 12S1 19 4 9Z"/><path d="M7 13h2m6 0h2m-6 3 1 1 1-1m-1 1v2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
  crown: '<path d="m3 7 5 4 4-7 4 7 5-4-2 13H5Z"/>',
  heart: '<path d="M12 21S2 15 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13Z"/>',
  play: '<path d="m8 4 12 8L8 20Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  volume: '<path d="M11 4 6 8H2v8h4l5 4Zm5 3c4 3 4 7 0 10m3-13c6 5 6 11 0 16"/>',
  mute: '<path d="M11 4 6 8H2v8h4l5 4Zm5 5 6 6m-6 0 6-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="m9 2 6 0 1 3 3 1 3 3v6l-3 1-1 3-3 3H9l-1-3-3-1-3-3V9l3-1 1-3Z"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  bubble: '<circle cx="12" cy="13" r="9"/><path d="m6 7-1-4 5 2m4 0 5-2-1 4M8 13v1m8-1v1m-7 3q3 3 6 0"/>',
};
export function icon(name: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.star}</svg>`;
}

function portrait(id: CharacterId) {
  const c = CHARACTERS.find((character) => character.id === id)!;
  const hair = id === 'rumi' ? '<path d="M76 42q18 16 3 33l7 8-12 6-8-9q13-24-4-29"/>' : id === 'mira' ? '<path d="M66 18q27-5 24 31L78 72q-11-5-5-28Z"/>' : '<circle cx="28" cy="26" r="13"/><circle cx="72" cy="26" r="13"/>';
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><g fill="${c.hair}">${hair}</g><path d="M20 110V87q4-25 30-25t30 25v23" fill="${c.outfit}"/><path d="M42 64h16v15q-8 8-16 0" fill="${c.skin}"/><ellipse cx="50" cy="43" rx="25" ry="28" fill="${c.skin}"/><path d="M25 42Q15 6 50 8t27 36Q68 35 65 25q-12 15-40 17" fill="${c.hair}"/><ellipse cx="40" cy="46" rx="2.5" ry="3" fill="#393047"/><ellipse cx="60" cy="46" rx="2.5" ry="3" fill="#393047"/><path d="M44 58q6 6 12 0" fill="none" stroke="#895764" stroke-width="2" stroke-linecap="round"/><circle cx="31" cy="55" r="4" fill="#e69e9d" opacity=".5"/><circle cx="69" cy="55" r="4" fill="#e69e9d" opacity=".5"/><path d="M31 94h38" stroke="#fff1d3" stroke-width="5"/><circle cx="50" cy="94" r="4" fill="#f1cc7c"/></svg>`;
}

export interface UIActions {
  select: (id: CharacterId) => void; play: () => void; dance: () => void; magic: () => void;
  interact: () => void; pause: () => void; resume: () => void; home: () => void;
  travel: (id: string) => void; joystick: (x: number, z: number) => void; exitBubbles: () => void;
  partyStart: () => void; partyExit: () => void; partyReplay: () => void;
  partyPad: (index: number) => void; partyMagic: () => void;
}

export function createUI(music: MusicSystem, actions: UIActions) {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <section id="home" class="home">
      <header class="home-header"><a class="brand" href="#" aria-label="Starlight Plaza">${icon('star')} STARLIGHT<span>PLAZA</span></a><span class="tiny-label">A LITTLE WORLD. A LOT OF WONDER.</span></header>
      <div class="home-copy"><span class="eyebrow"><i></i> MUSIC, MAGIC & LITTLE ADVENTURES</span><h1>Your stage.<br>Your <em>sparkle.</em></h1><p class="intro">Pick your favorite star.<br>Let the good times glow.</p>
      <div class="character-cards" role="group" aria-label="Choose your character">${CHARACTERS.map((c) => `<button class="character-card" data-character="${c.id}" aria-label="Select ${c.name}" aria-pressed="${c.id === 'rumi'}" style="--character:${c.color}"><span class="portrait">${portrait(c.id)}</span><span class="card-name">${c.name}</span><span class="card-check">${icon('check')}</span></button>`).join('')}</div>
      <button id="play" class="play-button">${icon('play')}<span>PLAY</span>${icon('arrow')}</button><p class="home-hint">WASD / arrows to wander · Big buttons to make magic</p></div>
      <div class="scene-caption"><span class="caption-stars">✦ &nbsp; ✧ &nbsp; ✦</span><strong id="selected-name">Rumi</strong><span id="selected-tagline">Big dreams. Brave heart.</span></div>
      <footer class="home-footer"><span>Made for little explorers</span><button class="parent-open">${icon('gear')} Grown-up corner</button></footer>
    </section>
    <section id="hud" class="hud" hidden>
      <header class="game-header"><div class="brand">${icon('star')} STARLIGHT<span>PLAZA</span></div><div class="top-actions"><span class="star-counter" aria-label="Collected stars">${icon('star')}<b id="star-count">0</b></span><button id="music-open" class="round-button" aria-label="Choose a song">${icon('music')}</button><button id="mute" class="round-button" aria-label="Mute sound">${icon('volume')}</button><button id="pause" class="round-button" aria-label="Pause game">${icon('pause')}</button></div></header>
      <div id="now-playing" class="now-playing" hidden>${icon('music')}<span></span><i></i></div>
      <nav class="activity-map" aria-label="Go to an activity">${ACTIVITIES.map((a) => `<button data-travel="${a.id}" aria-label="Go to ${a.name}" style="--activity:${a.color}" title="${a.name}">${icon(a.icon)}<span class="visit-check">${icon('check')}</span></button>`).join('')}</nav>
      <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
      <div class="bottom-controls"><div class="movement-pad" role="group" aria-label="Move character"><button data-move="ArrowUp" class="up" aria-label="Move forward">↑</button><button data-move="ArrowLeft" class="left" aria-label="Move left">←</button><button data-move="ArrowDown" class="down" aria-label="Move back">↓</button><button data-move="ArrowRight" class="right" aria-label="Move right">→</button></div>
      <button id="interact" class="interact-button" hidden></button><div class="big-actions"><button id="dance" class="action-button dance">${icon('dance')}<span>DANCE</span><small>SPACE</small></button><button id="magic" class="action-button magic">${icon('magic')}<span>MAGIC</span><small>M</small></button></div></div>
      <span id="playing-character" class="playing-character"></span>
    </section>
    <section id="song-panel" class="song-panel" aria-label="Song selection" hidden><div class="panel-title"><div><span class="eyebrow">LET'S MAKE SOME NOISE</span><h2>Pick a song</h2></div><button id="song-close" class="round-button" aria-label="Close song selection">${icon('close')}</button></div><div class="song-grid">${SONGS.map((song, i) => `<button data-song="${i}" class="song-button" style="--song:${song.color}" aria-label="Play ${song.title}">${icon(song.icon)}<strong>${song.title}</strong><small class="song-status"></small><span class="song-play">${icon('play')}</span></button>`).join('')}</div><div class="song-footer"><span id="song-note">Original plaza beats are ready to play.</span><button id="song-stop" class="round-button" aria-label="Stop music">${icon('pause')}</button></div></section>
    <div id="pause-overlay" class="overlay" hidden><section class="modal pause-modal" role="dialog" aria-modal="true" aria-label="Game paused">${icon('star')}<h2>A little breather</h2><button id="resume" class="play-button">${icon('play')} KEEP PLAYING</button><button id="change-character" class="secondary-button">Choose another star</button><button class="parent-open secondary-button">Grown-up corner</button></section></div>
    <div id="parent-overlay" class="overlay" hidden><section class="modal parent-modal" role="dialog" aria-modal="true" aria-label="Grown-up settings"><div class="panel-title"><h2>Grown-up corner</h2><button id="parent-close" class="round-button" aria-label="Close settings">${icon('close')}</button></div><p>Explore with arrows / WASD, or tap the colorful activity icons. Space dances. M makes magic. Activities welcome your child automatically.</p><label class="volume-label">Volume <input id="volume" type="range" min="0" max="100" value="35" /></label><h3>Bring your own instrumentals</h3><p>Add legally obtained local files to <code>public/audio/songs/</code>, then reload the game. Supported: MP3, OGG, WAV, M4A. No soundtrack is downloaded or bundled. Missing tracks play an original playground beat.</p><ul id="audio-files"></ul><p id="audio-error" class="audio-error" hidden></p><p class="parent-note">No losing, no timers, no fighting. Gentle lights, low default volume, and endless repeats. Procedural characters are replaceable fallbacks.</p></section></div>
    <div id="fatal" class="overlay" hidden><section class="modal"><h2>The plaza couldn't open</h2><p id="fatal-message"></p><button class="secondary-button" onclick="location.reload()">Try again</button></section></div>`;
  const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  get('song-panel').querySelector('.panel-title')!.insertAdjacentHTML('afterend', `<button id="party-start" class="party-start" aria-label="Start Golden Dance Party" hidden><span class="party-mini-trio">${CHARACTERS.map(c=>portrait(c.id)).join('')}</span><span>GOLDEN PARTY</span>${icon('play')}</button>`);
  app.insertAdjacentHTML('beforeend', `<section id="party-ui" class="party-ui" aria-label="Golden Dance Party" hidden>
    <header class="party-header"><button id="party-back" class="bubble-back" aria-label="Back to the playground">←</button><span class="party-title">✦ GOLDEN ✦</span><div class="top-actions"><button id="party-mute" class="round-button" aria-label="Mute sound">${icon('volume')}</button><button id="party-pause" class="round-button" aria-label="Pause dance party">${icon('pause')}</button></div></header>
    <div id="party-cheer" class="party-cheer" aria-label="The three girls celebrate" hidden>✦ ✨ ✦</div>
    <button id="party-magic" class="party-magic" aria-label="Make Golden magic" hidden>${icon('magic')}<span>✦ ✦ ✦</span></button>
    <button id="party-replay" class="party-replay" aria-label="Replay Golden" hidden><span>↻</span>${icon('play')}</button>
    <div class="party-pads" role="group" aria-label="Tap any character to dance">${CHARACTERS.map((c,i)=>`<button id="party-pad-${i}" class="party-pad" style="--party-color:${c.color}" aria-label="Dance with ${c.name}"><span class="party-face">${portrait(c.id)}</span><span>${c.name}</span><span class="party-pad-star" aria-hidden="true">✦</span></button>`).join('')}</div>
  </section>`);
  app.querySelector('.movement-pad')!.outerHTML = '<div id="joystick-zone" class="joystick-zone" role="group" aria-label="Drag here to move"><div class="joystick-base"><span class="joystick-directions">↟</span><div class="joystick-knob">✦</div></div></div>';
  get('home').querySelector('.home-hint')!.textContent = 'Move with your thumb · Tap to dance & make magic';
  app.insertAdjacentHTML('beforeend', `<section id="bubble-ui" class="bubble-ui" aria-label="Magic demon bubble pop" hidden><div id="bubble-playfield" class="bubble-playfield" aria-label="Tap or draw magic through the smiling friends"></div><header class="bubble-header"><button id="bubble-back" class="bubble-back" aria-label="Back to the playground">←</button><div class="bubble-counter" aria-label="Happy captures">${icon('star')}<b id="bubble-count">0</b></div><button id="bubble-mute" class="round-button" aria-label="Mute sound">${icon('volume')}</button></header><div id="bubble-celebration" class="bubble-celebration" aria-label="Five happy friends celebration" hidden>✦ ✨ ✦</div><div class="bubble-hint" aria-hidden="true">✧ ☝ ✧</div></section>`);
  const joystick = bindJoystick(get('joystick-zone'), actions.joystick);
  const bind = (id: string, callback: () => void) => get(id).addEventListener('click', callback);
  let inGame = false;
  let toastTimer: ReturnType<typeof setTimeout>;
  let parentPaused = false;
  let previousFocus: HTMLElement | null = null;
  let cachedState = '';
  let cachedParty = '';

  app.querySelectorAll<HTMLButtonElement>('[data-character]').forEach((button) => button.addEventListener('click', () => actions.select(button.dataset.character as CharacterId)));
  app.querySelectorAll<HTMLButtonElement>('[data-travel]').forEach((button) => button.addEventListener('click', () => actions.travel(button.dataset.travel!)));
  function actionButton(id: string, callback: () => void) {
    get(id).addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse' || event.button === 0) { event.preventDefault(); callback(); } });
    get(id).addEventListener('click', event => { if (event.detail === 0) callback(); });
  }
  bind('play', actions.play);
  actionButton('dance', actions.dance);
  actionButton('magic', actions.magic);
  actionButton('interact', actions.interact);
  bind('party-start', actions.partyStart); bind('party-back', actions.partyExit); bind('party-replay', actions.partyReplay);
  bind('party-pause', actions.pause); bind('party-mute', () => music.toggleMute());
  actionButton('party-magic', actions.partyMagic);
  for (let i=0;i<3;i++) actionButton(`party-pad-${i}`, () => actions.partyPad(i));
  bind('bubble-back', actions.exitBubbles);
  bind('bubble-mute', () => music.toggleMute());
  bind('pause', actions.pause);
  bind('resume', actions.resume);
  bind('change-character', actions.home);
  bind('music-open', () => { get('song-panel').hidden = !get('song-panel').hidden; });
  bind('song-close', () => { get('song-panel').hidden = true; });
  bind('mute', () => music.toggleMute());
  bind('song-stop', () => music.stop());
  app.querySelectorAll<HTMLButtonElement>('[data-song]').forEach((button) => button.addEventListener('click', () => { void music.play(Number(button.dataset.song)); if (inGame) actions.dance(); }));
  app.querySelectorAll('.parent-open').forEach((button) => button.addEventListener('click', () => {
    previousFocus = document.activeElement as HTMLElement;
    parentPaused = Boolean(get('pause-overlay').hidden);
    if (inGame) actions.pause();
    get('parent-overlay').hidden = false;
    get('parent-close').focus();
  }));
  bind('parent-close', () => {
    get('parent-overlay').hidden = true;
    if (inGame && parentPaused) actions.resume();
    else previousFocus?.focus();
  });
  get<HTMLInputElement>('volume').addEventListener('input', (event) => music.setVolume(Number((event.target as HTMLInputElement).value) / 100));
  // Keep keyboard focus inside whichever dialog is open.
  app.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const overlay = !get('parent-overlay').hidden ? get('parent-overlay') : !get('pause-overlay').hidden ? get('pause-overlay') : null;
    if (!overlay) return;
    const buttons = [...overlay.querySelectorAll<HTMLElement>('button, input')];
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    if ((event.shiftKey && index <= 0) || (!event.shiftKey && index === buttons.length - 1)) {
      event.preventDefault();
      buttons[event.shiftKey ? buttons.length - 1 : 0].focus();
    }
  });
  const updateMusic = () => {
    app.querySelectorAll<HTMLButtonElement>('[data-song]').forEach((button, index) => {
      const active = music.playing && music.selected === index;
      button.setAttribute('aria-pressed', String(active));
      button.querySelector('.song-status')!.textContent = music.files[index] ? 'Local instrumental' : 'Plaza beat · file missing';
    });
    const now = get('now-playing');
    now.hidden = !music.playing || !inGame;
    now.querySelector('span')!.textContent = music.selected >= 0 ? (music.mode === 'local' ? SONGS[music.selected].title : 'Original plaza beat') : '';
    get('song-note').textContent = music.mode === 'local' ? 'Your local instrumental is playing. Play it again any time.' : 'Missing instrumentals use original plaza beats.';
    get('mute').innerHTML = icon(music.muted ? 'mute' : 'volume');
    get('mute').setAttribute('aria-label', music.muted ? 'Unmute sound' : 'Mute sound');
    get('bubble-mute').innerHTML = icon(music.muted ? 'mute' : 'volume');
    get('bubble-mute').setAttribute('aria-label', music.muted ? 'Unmute sound' : 'Mute sound');
    get('party-mute').innerHTML = icon(music.muted ? 'mute' : 'volume');
    get('party-mute').setAttribute('aria-label', music.muted ? 'Unmute sound' : 'Mute sound');
    get('party-ui').querySelector('.party-title')!.textContent = music.mode === 'local' ? '✦ GOLDEN ✦' : '✦ PLAZA PARTY ✦';
    get('audio-files').innerHTML = SONGS.map((song, i) => `<li class="${music.files[i] ? 'available' : 'missing'}">${icon(music.files[i] ? 'check' : 'music')}<code>${song.file}.mp3</code><span>${music.files[i] ? 'Ready' : 'Missing'}</span></li>`).join('');
    get('audio-error').hidden = !music.error;
    get('audio-error').textContent = music.error;
  };
  music.onChange = updateMusic;
  updateMusic();
  return {
    select(id: CharacterId) {
      const character = CHARACTERS.find((c) => c.id === id)!;
      app.querySelectorAll<HTMLButtonElement>('[data-character]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.character === id)));
      get('selected-name').textContent = character.name;
      get('selected-tagline').textContent = character.tagline;
      get('playing-character').textContent = character.name;
    },
    home() {
      inGame = false;
      get('home').hidden = false;
      get('hud').hidden = true;
      get('song-panel').hidden = true;
      get('pause-overlay').hidden = true;
      get('parent-overlay').hidden = true;
      get('play').focus();
      updateMusic();
    },
    play() {
      inGame = true;
      cachedState = '';
      get('home').hidden = true;
      get('hud').hidden = false;
      get('pause-overlay').hidden = true;
      get('world').focus();
      updateMusic();
    },
    pause(value: boolean) { get('pause-overlay').hidden = !value; if (value) get('resume').focus(); else get('world').focus(); },
    openSongs() { get('song-panel').hidden = false; },
    update(state: GameState, stars: number) {
      const signature = `${stars}|${state.nearest}|${[...state.visits].join()}|${state.dancing}|${state.magicTime > 0}`;
      if (signature === cachedState) return;
      cachedState = signature;
      get('star-count').textContent = String(stars);
      get('party-start').hidden = state.nearest !== 'stage';
      const activity = ACTIVITIES.find((a) => a.id === state.nearest);
      const interactButton = get('interact');
      interactButton.hidden = !activity;
      if (activity) {
        interactButton.innerHTML = `${icon(activity.id === 'bubbles' ? 'play' : activity.icon)}<span>${activity.action}</span>`;
        interactButton.style.setProperty('--activity', activity.color);
        interactButton.setAttribute('aria-label', activity.action);
      }
      app.querySelectorAll<HTMLButtonElement>('[data-travel]').forEach((button) => button.classList.toggle('visited', state.visits.has(button.dataset.travel as GameState['lastInteraction'] & string)));
      get('dance').classList.toggle('active', state.dancing);
      get('magic').classList.toggle('active', state.magicTime > 0);
    },
    toast(symbol: string, text: string) {
      clearTimeout(toastTimer);
      const toast = get('toast');
      toast.innerHTML = `${icon(symbol)}<span>${text}</span>`;
      toast.hidden = false;
      toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
    },
    modalOpen() { return !get('parent-overlay').hidden || !get('pause-overlay').hidden; },
    resetInput() { joystick.reset(); },
    joystickSnapshot: joystick.snapshot,
    bubbles(value: boolean) { joystick.reset(); get('hud').hidden = value; get('bubble-ui').hidden = !value; get('song-panel').hidden = true; get('toast').hidden = true; get('pause-overlay').hidden = true; },
    party(value: boolean) { cachedParty = ''; joystick.reset(); get('hud').hidden = value; get('party-ui').hidden = !value; get('song-panel').hidden = true; get('toast').hidden = true; get('pause-overlay').hidden = true; },
    updateParty(party: DanceParty) {
      const signature = `${party.magicVisible}|${party.finished}|${party.groupTime > 0}|${party.chosen}|${party.pulses.map(n=>n>0)}|${party.responses.map(n=>n>.95)}`;
      if (signature === cachedParty) return; cachedParty = signature;
      get('party-magic').hidden = !party.magicVisible;
      get('party-replay').hidden = !party.finished;
      get('party-cheer').hidden = party.groupTime <= 0;
      for (let i=0;i<3;i++) {
        get(`party-pad-${i}`).classList.toggle('invited', party.pulses[i] > 0);
        get(`party-pad-${i}`).classList.toggle('tapped', party.responses[i] > .95);
        get(`party-pad-${i}`).setAttribute('aria-pressed', String(party.chosen === i));
      }
    },
    updateBubbles(captures: number, celebrating: boolean) { get('bubble-count').textContent = String(captures); get('bubble-celebration').hidden = !celebrating; },
    closeParent() { if (get('parent-overlay').hidden) return false; get('parent-close').click(); return true; },
    fatal(message: string) { get('fatal').hidden = false; get('fatal-message').textContent = message; },
  };
}
