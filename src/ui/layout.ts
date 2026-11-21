/** Gap kept between the tutorial line and the notices stacked above it, in CSS px. */
export const TOAST_GAP = 10;

/**
 * Where the small notices may start, in CSS px up from the bottom of the screen: just above the tutorial line
 * (its resting bottom, its height and any lift it takes while a chain runs), or 0 when no line is showing.
 */
export function toastFloor(hint: { shown: boolean; bottom: number; height: number; lift: number }): number {
  if (!hint.shown) return 0;
  return Math.ceil(hint.bottom + hint.height + hint.lift + TOAST_GAP);
}
