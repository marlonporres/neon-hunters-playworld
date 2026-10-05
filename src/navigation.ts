import { canStandAt } from './simulation.ts';

export interface Waypoint { x: number; z: number }
const step = 0.5;
const columns = 51;
const rows = 47;
const originX = -12.5;
const originZ = -11.5;
const point = (index: number): Waypoint => ({ x: originX + (index % columns) * step, z: originZ + Math.floor(index / columns) * step });

function clearLine(from: Waypoint, to: Waypoint, clearance = 0.13) {
  const samples = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.16));
  for (let sample = 1; sample <= samples; sample++) {
    const ratio = sample / samples;
    if (!canStandAt(from.x + (to.x - from.x) * ratio, from.z + (to.z - from.z) * ratio, clearance)) return false;
  }
  return true;
}

// Small-grid A*, only when an activity button is pressed. No frame-time pathfinding.
export function findRoute(from: Waypoint, to: Waypoint): Waypoint[] {
  if (clearLine(from, to)) return [{ ...to }];
  function nearest(position: Waypoint) {
    let best = -1;
    let distance = Infinity;
    for (let index = 0; index < columns * rows; index++) {
      const candidate = point(index);
      const current = Math.hypot(candidate.x - position.x, candidate.z - position.z);
      if (current < distance && canStandAt(candidate.x, candidate.z, 0.13) && clearLine(position, candidate, 0)) {
        best = index; distance = current;
      }
    }
    return best;
  }
  const start = nearest(from);
  const goal = nearest(to);
  if (start < 0 || goal < 0) return [];
  const distances = new Float64Array(columns * rows).fill(Infinity);
  const parents = new Int32Array(columns * rows).fill(-1);
  const closed = new Uint8Array(columns * rows);
  const open: number[] = [start];
  distances[start] = 0;
  const target = point(goal);
  const score = (index: number) => distances[index] + Math.hypot(point(index).x - target.x, point(index).z - target.z);
  while (open.length) {
    let best = 0;
    for (let index = 1; index < open.length; index++) if (score(open[index]) < score(open[best])) best = index;
    const current = open.splice(best, 1)[0];
    if (closed[current]) continue;
    if (current === goal) {
      const reversed = [to];
      let index = current;
      while (index !== -1) { reversed.push(point(index)); index = parents[index]; }
      const path = reversed.reverse();
      const simplified: Waypoint[] = [];
      let previous = from;
      let first = 0;
      while (first < path.length) {
        let last = first;
        while (last + 1 < path.length && clearLine(previous, path[last + 1])) last++;
        simplified.push(path[last]);
        previous = path[last];
        first = last + 1;
      }
      return simplified;
    }
    closed[current] = 1;
    const currentPoint = point(current);
    const column = current % columns;
    const row = Math.floor(current / columns);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = column + dx; const nz = row + dz;
      if (nx < 0 || nx >= columns || nz < 0 || nz >= rows) continue;
      const neighbor = nz * columns + nx;
      if (closed[neighbor]) continue;
      const neighborPoint = point(neighbor);
      if (!canStandAt(neighborPoint.x, neighborPoint.z, 0.13) || !clearLine(currentPoint, neighborPoint)) continue;
      const distance = distances[current] + Math.hypot(dx, dz) * step;
      if (distance < distances[neighbor]) {
        distances[neighbor] = distance;
        parents[neighbor] = current;
        open.push(neighbor);
      }
    }
  }
  return [];
}
