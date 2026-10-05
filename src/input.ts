export interface Movement { x: number; z: number }
export type Action = 'dance' | 'magic' | 'interact';
export const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function normalizeMovement(x: number, z: number): Movement {
  const length = Math.hypot(x, z);
  return length > 1 ? { x: x / length, z: z / length } : { x, z };
}

export class GameInput {
  readonly keys = new Set<string>();
  private stick: Movement = { x: 0, z: 0 };
  private actions: Action[] = [];
  setStick(x: number, z: number) { this.stick = normalizeMovement(x, z); }
  movement(): Movement {
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const z = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    return normalizeMovement(x + this.stick.x, z + this.stick.z);
  }
  press(action: Action) { if (!this.actions.includes(action)) this.actions.push(action); }
  consume() { const actions = this.actions; this.actions = []; return actions; }
  reset() { this.keys.clear(); this.stick = { x: 0, z: 0 }; this.actions = []; }
}

// One movement pointer owns the stick; other fingers remain free for actions.
export function bindJoystick(zone: HTMLElement, move: (x: number, z: number) => void) {
  const base = zone.querySelector<HTMLElement>('.joystick-base')!;
  const knob = zone.querySelector<HTMLElement>('.joystick-knob')!;
  let pointer: number | null = null;
  let originX = 0; let originY = 0;
  const radius = 55;
  function reset() {
    const old = pointer;
    pointer = null;
    move(0, 0);
    zone.classList.remove('held');
    base.style.left = ''; base.style.top = '';
    knob.style.transform = '';
    if (old !== null && zone.hasPointerCapture(old)) zone.releasePointerCapture(old);
  }
  zone.addEventListener('pointerdown', event => {
    if (pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); pointer = event.pointerId;
    originX = event.clientX; originY = event.clientY;
    const bounds = zone.getBoundingClientRect();
    base.style.left = `${originX - bounds.left}px`; base.style.top = `${originY - bounds.top}px`;
    zone.classList.add('held');
    // Synthetic integration events have no browser-owned pointer to capture.
    if (event.isTrusted) zone.setPointerCapture(pointer);
    move(0, 0);
  });
  zone.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    event.preventDefault();
    const dx = event.clientX - originX; const dy = event.clientY - originY;
    const length = Math.hypot(dx, dy);
    const gain = length > 8 ? Math.min(1, (length - 8) / (radius - 8)) : 0;
    move(length ? dx / length * gain : 0, length ? dy / length * gain : 0);
    const scale = length > radius ? radius / length : 1;
    knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(type, event => {
    if ((event as PointerEvent).pointerId === pointer) reset();
  });
  return { reset, snapshot: () => ({ pointer, originX, originY, area: zone.getBoundingClientRect().toJSON() }) };
}
