import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { mulberry32 } from '../src/core/math';

const idle = { ax: 0, ay: 0, burst: false };

function makeWorld() {
  const w = new World({ seed: 7, rng: mulberry32(42) });
  w.setView(220, 420);
  w.creatures.length = 0;
  w.currents.length = 0;
  w.player.invuln = 99;
  return w;
}

describe('input forgiveness', () => {
  it('a Jet pressed just before a charge returns fires when the charge lands', () => {
    const w = makeWorld();
    const p = w.player;
    w.update(1 / 60, { ax: 1, ay: 0, burst: true });
    expect(p.charges).toBe(0);
    // Run until the charge is about 0.15 s away, then press Jet once.
    const cooldown = p.stats.burstCooldown;
    for (let t = 1 / 60; t < cooldown - 0.15; t += 1 / 60) w.update(1 / 60, idle);
    expect(p.charges).toBe(0);
    w.events.length = 0;
    w.update(1 / 60, { ax: 1, ay: 0, burst: true });
    let fired = 0;
    for (let i = 0; i < 20; i++) {
      w.update(1 / 60, idle);
      fired += w.events.filter((e) => e.type === 'burst').length;
      w.events.length = 0;
    }
    expect(fired).toBe(1);
    expect(p.charges).toBe(0);
  });

  it('a Jet pressed long before a charge returns is not held forever', () => {
    const w = makeWorld();
    const p = w.player;
    w.update(1 / 60, { ax: 1, ay: 0, burst: true });
    w.update(1 / 60, { ax: 1, ay: 0, burst: true });
    w.events.length = 0;
    for (let i = 0; i < 60 * (p.stats.burstCooldown + 0.5); i++) w.update(1 / 60, idle);
    expect(w.events.some((e) => e.type === 'burst')).toBe(false);
    expect(p.charges).toBe(1);
  });
});

describe('reef contact', () => {
  it('steering straight down onto a reef dome slides off it instead of resting on top', () => {
    const w = makeWorld();
    const p = w.player;
    const cl = w.corals.find((c) => c.circles.length === 1 && c.minY > 800 && c.circles[0].r > p.r * 1.5);
    expect(cl).toBeDefined();
    const c = cl!.circles[0];
    p.x = c.x;
    p.y = c.y - c.r - p.r * 0.8;
    p.vx = p.vy = 0;
    for (let i = 0; i < 60 * 1.5; i++) w.update(1 / 60, { ax: 0, ay: 1, burst: false });
    // Either it has slipped past the rock's shoulder or it is already below its top.
    expect(Math.abs(p.x - c.x) > c.r * 0.9 || p.y > c.y).toBe(true);
  });

  it('steering sideways along a reef top still moves sideways', () => {
    const w = makeWorld();
    const p = w.player;
    const cl = w.corals.find((c) => c.circles.length === 1 && c.minY > 800 && c.circles[0].r > p.r * 1.5);
    const c = cl!.circles[0];
    p.x = c.x;
    p.y = c.y - c.r - p.r * 0.8;
    const x0 = p.x;
    for (let i = 0; i < 30; i++) w.update(1 / 60, { ax: 1, ay: 0, burst: false });
    expect(p.x).toBeGreaterThan(x0 + 20);
  });

  /** Clears the generated reef and places these rocks, in every grid cell they touch. */
  function placeReef(w: World, rocks: { x: number; y: number; r: number }[]) {
    w.coralGrid.clear();
    for (const c of rocks)
      for (let gx = Math.floor((c.x - c.r - 60) / 200); gx <= Math.floor((c.x + c.r + 60) / 200); gx++)
        for (let gy = Math.floor((c.y - c.r - 60) / 200); gy <= Math.floor((c.y + c.r + 60) / 200); gy++) {
          const k = gx * 1000 + gy;
          if (!w.coralGrid.has(k)) w.coralGrid.set(k, []);
          w.coralGrid.get(k)!.push(c);
        }
  }

  it('dead centre on a dome in the middle of the shaft: slides off one way, without rocking back and forth', () => {
    const w = makeWorld();
    const p = w.player;
    const dome = { x: w.width / 2, y: 3000, r: 120 };
    placeReef(w, [dome]);
    p.x = dome.x;
    p.y = dome.y - dome.r - p.r * 0.7;
    p.vx = p.vy = 0;
    let flips = 0;
    let lastDir = 0;
    let passed = -1;
    for (let i = 0; i < 60 * 3; i++) {
      const x0 = p.x;
      w.update(1 / 60, { ax: 0, ay: 1, burst: false });
      const dx = p.x - x0;
      if (Math.abs(dx) > 0.05) {
        if (lastDir && Math.sign(dx) !== lastDir) flips++;
        lastDir = Math.sign(dx);
      }
      if (passed < 0 && p.y > dome.y) passed = i / 60;
    }
    expect(passed).toBeGreaterThan(0);
    expect(passed).toBeLessThan(2);
    expect(flips).toBeLessThanOrEqual(1);
  });

  it('steering straight up into the underside of a dome also slides around it', () => {
    const w = makeWorld();
    const p = w.player;
    const dome = { x: w.width / 2, y: 3000, r: 120 };
    placeReef(w, [dome]);
    p.x = dome.x;
    p.y = dome.y + dome.r + p.r * 0.7;
    for (let i = 0; i < 60 * 4; i++) w.update(1 / 60, { ax: 0, ay: -1, burst: false });
    expect(p.y).toBeLessThan(dome.y);
  });

  it('the slide never squeezes a body through a gap narrower than it', () => {
    const w = makeWorld();
    const p = w.player;
    const gap = p.r * 0.8;
    placeReef(w, [
      { x: 1500 - 100 - gap / 2, y: 3000, r: 100 },
      { x: 1500 + 100 + gap / 2, y: 3000, r: 100 },
    ]);
    p.x = 1500;
    p.y = 2850;
    for (let i = 0; i < 60 * 6; i++) w.update(1 / 60, { ax: 0, ay: 1, burst: false });
    expect(p.y).toBeLessThan(3000);
  });
});

