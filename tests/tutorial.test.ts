import { describe, expect, it } from 'vitest';
import { hasLearned, learn, markReminded, remindersFor } from '../src/core/tutorial';
import { TOAST_GAP, toastFloor } from '../src/ui/layout';

const fresh = () => ({ tutorialDone: false, tips: [] as string[] });

describe('tutorial lessons', () => {
  it('a first dive gets no reminders: the tutorial itself is running', () => {
    expect(remindersFor(fresh())).toEqual([]);
  });

  it('a player who ignored both lines is reminded of both, once', () => {
    const save = { ...fresh(), tutorialDone: true };
    expect(remindersFor(save)).toEqual(['lash', 'jet']);
    markReminded(save, remindersFor(save));
    expect(remindersFor(save)).toEqual([]);
  });

  it('a player who used the lash but never the Jet is reminded of the Jet only', () => {
    const save = { ...fresh(), tutorialDone: true };
    expect(learn(save, 'lash')).toBe(true);
    expect(learn(save, 'lash')).toBe(false);
    expect(remindersFor(save)).toEqual(['jet']);
  });

  it('a player who used both is never shown either line again', () => {
    const save = { ...fresh(), tutorialDone: true };
    learn(save, 'lash');
    learn(save, 'jet');
    expect(remindersFor(save)).toEqual([]);
  });

  it('older saves that already saw the lash line keep it settled', () => {
    const save = { tutorialDone: true, tips: ['lash'] };
    expect(hasLearned(save, 'lash')).toBe(true);
    expect(remindersFor(save)).toEqual(['jet']);
  });
});

describe('notice placement', () => {
  it('with no tutorial line, notices keep their own floor', () => {
    expect(toastFloor({ shown: false, bottom: 140, height: 70, lift: 64 })).toBe(0);
  });

  it('notices start above a two-line tutorial line, and above it again while a chain lifts it', () => {
    expect(toastFloor({ shown: true, bottom: 140, height: 70, lift: 0 })).toBe(140 + 70 + TOAST_GAP);
    expect(toastFloor({ shown: true, bottom: 140, height: 70, lift: 64 })).toBe(140 + 70 + 64 + TOAST_GAP);
  });
});
