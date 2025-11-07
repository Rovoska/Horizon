import { FisherYatesShuffle } from './common';
import l from './localize';
/**
 * The amount of tips we have. Based on this number (minus one),
 * we will fetch tips from the localization files.
 */
const TIP_COUNT = 2;
/*
 * The modifier key for keyboard shortcuts based on the user's platform.
 */
const MODIFIER_KEY = process.platform !== 'darwin' ? 'Ctrl' : '⌘';
/*
 * An array of tip indices to track the current order of tips.
 */
let tips: number[] = [];
/**
 * Zero-based index of the currently selected tip in the tips collection.
 *
 * Initialized to 0 so the first tip is shown by default.
 *
 * @example
 * // Advance to the next tip with wrap-around
 * if (tips.length) {
 *   currentTipIndex = (currentTipIndex + 1) % tips.length;
 * }
 */
let currentTipIndex: number = 0;

/**
 * Generate the initial list of tips and shuffle them.
 */
function generateTips() {
  tips = [];
  for (let i = 0; i < TIP_COUNT; i++) {
    tips.push(i);
  }
  shuffleTips();
}
/**
 *  Move the tip cursor to the next tip and return that tip value.
 * @returns The next tip value (a number), or `undefined` if the tips list is empty.
 */
export function nextTip(): number {
  validateTips();
  if (tips.length) {
    currentTipIndex = (currentTipIndex + 1) % tips.length;
  }
  return tips[currentTipIndex];
}

/**
 * Move the tip cursor to the previous tip and return that tip value.
 *
 * @returns The previous tip value (a number), or `undefined` if the tips list is empty.
 */
export function previousTip(): number {
  validateTips();
  if (tips.length) {
    currentTipIndex = (currentTipIndex - 1 + tips.length) % tips.length;
  }
  return tips[currentTipIndex];
}

/**
 * Shuffle the order of tips and reset the current tip index to zero.
 */
export function shuffleTips() {
  FisherYatesShuffle(tips);
  currentTipIndex = 0;
}

/**
 * Ensure that the tips array is populated.
 */
function validateTips() {
  if (tips.length < 1) {
    generateTips();
  }
}

/**
 * Get the current tip string from the localization files.
 * @returns The localized tip string.
 */
export default function tip(): string {
  validateTips();
  return l(`tips.${tips[currentTipIndex]}`, MODIFIER_KEY);
}
