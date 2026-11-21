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
});
