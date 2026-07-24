export const MEETING_WIN_SYMBOL = "阿喜";
export const MEETING_DOUBLE_SYMBOL = "囍";

/**
 * @typedef {{
 *   label: string;
 *   amount: number;
 *   kind: "blank" | "plain" | "winning" | "multiplier";
 *   section?: "triple" | "instant" | "numbers" | "lucky";
 * }} MeetingCell
 */

/**
 * Calculate the prize exactly as a player reads a 喜相逢 ticket.
 * @param {MeetingCell[]} cells
 */
export function calculateMeetingPrize(cells) {
  return cells.reduce((sum, cell) => {
    if (cell.label === MEETING_WIN_SYMBOL) return sum + cell.amount;
    if (cell.label === MEETING_DOUBLE_SYMBOL) return sum + cell.amount * 2;
    return sum;
  }, 0);
}

/**
 * @param {string[]} artSymbols
 */
export function meetingDecoySymbols(artSymbols) {
  const blocked = new Set([MEETING_WIN_SYMBOL, MEETING_DOUBLE_SYMBOL]);
  const candidates = [...artSymbols, "缘", "顺", "安", "乐", "和", "春", "满"].filter(
    (symbol) => !blocked.has(symbol),
  );
  return [...new Set(candidates)];
}

/**
 * Create cells whose visible rule result is guaranteed to equal `prize`.
 * @param {{
 *   opportunities: number;
 *   prize: number;
 *   prizeAmounts: number[];
 *   artSymbols: string[];
 *   random?: () => number;
 * }} options
 * @returns {MeetingCell[]}
 */
export function makeMeetingCells({
  opportunities,
  prize,
  prizeAmounts,
  artSymbols,
  random = Math.random,
}) {
  const decoys = meetingDecoySymbols(artSymbols);
  const pick = (items) => items[Math.floor(random() * items.length)];
  const cells = Array.from({ length: opportunities }, () => ({
    label: pick(decoys),
    amount: pick(prizeAmounts),
    kind: /** @type {const} */ ("plain"),
  }));

  if (prize <= 0) return cells;

  const index = Math.floor(random() * cells.length);
  const double = prize % 2 === 0 && random() < 0.2;
  cells[index] = {
    label: double ? MEETING_DOUBLE_SYMBOL : MEETING_WIN_SYMBOL,
    amount: double ? prize / 2 : prize,
    kind: double ? "multiplier" : "winning",
  };
  return cells;
}

