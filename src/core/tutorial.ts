/**
 * The two verbs the first dive teaches beyond swimming. A lesson is learned when the player does it,
 * not when its line has been shown: a line that times out unanswered comes back once, on the next dive.
 */
export type Lesson = 'lash' | 'jet';

export const LESSONS: readonly Lesson[] = ['lash', 'jet'];

interface TipSave {
  tutorialDone: boolean;
  tips: string[];
}

const learnedKey = (l: Lesson) => `learned:${l}`;
const remindedKey = (l: Lesson) => `reminded:${l}`;

/** True once the player has used this verb in any dive. */
export function hasLearned(save: TipSave, lesson: Lesson): boolean {
  // Older saves recorded the lash line as the bare tip 'lash' once it had been shown: treat that as settled.
  return save.tips.includes(learnedKey(lesson)) || (lesson === 'lash' && save.tips.includes('lash'));
}

/** Records that the player used a verb. Returns true when this is news (so the caller can save). */
export function learn(save: TipSave, lesson: Lesson): boolean {
  if (save.tips.includes(learnedKey(lesson))) return false;
  save.tips.push(learnedKey(lesson));
  return true;
}

/** The lessons to repeat at the start of this dive: finished the tutorial, never used the verb, not yet reminded. */
export function remindersFor(save: TipSave): Lesson[] {
  if (!save.tutorialDone) return [];
  return LESSONS.filter((l) => !hasLearned(save, l) && !save.tips.includes(remindedKey(l)));
}

/** Marks reminders as given, so each comes back at most once. */
export function markReminded(save: TipSave, lessons: readonly Lesson[]): void {
  for (const l of lessons) if (!save.tips.includes(remindedKey(l))) save.tips.push(remindedKey(l));
}
