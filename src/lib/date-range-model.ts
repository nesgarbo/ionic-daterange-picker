/**
 * Value coercion and the selection state machine.
 *
 * Kept free of Angular on purpose: these are the rules that decide what a click does, and they are
 * the part worth unit testing.
 */
import type { DateRange, DateRangeValue } from '../types/date-range.types';
import { addDays, compareDay, diffDays, isWithin, startOfDay } from './date-range-date';

/** Empty selection, shared so `equal` comparisons on signals stay cheap. */
export const EMPTY_RANGE: DateRange = { start: null, end: null };

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

/**
 * Normalises anything a form or a template may push in — the Syncfusion `[start, end]` array, a
 * `{ start, end }` object, ISO strings — into a `DateRange` at day precision, with the ends in
 * ascending order.
 */
export function coerceRange(value: DateRangeValue): DateRange {
    if (!value) {
        return EMPTY_RANGE;
    }
    let start: Date | null;
    let end: Date | null;
    if (Array.isArray(value)) {
        start = toDate(value[0]);
        end = toDate(value[1]);
    } else {
        const range = value as DateRange;
        start = toDate(range.start);
        end = toDate(range.end);
    }
    if (start && end && compareDay(start, end) > 0) {
        return { start: end, end: start };
    }
    return { start, end };
}

/**
 * The value written back to a `formControl`: the Syncfusion pair, or `null` when the range is
 * incomplete. A half-picked range is never published — a form should not see a start date without
 * its end.
 */
export function toControlValue(range: DateRange): Date[] | null {
    return range.start && range.end ? [range.start, range.end] : null;
}

export function rangesEqual(a: DateRange, b: DateRange): boolean {
    const same = (left: Date | null, right: Date | null) => (left === null) === (right === null) && (!left || !right || left.getTime() === right.getTime());
    return same(a.start, b.start) && same(a.end, b.end);
}

export function isComplete(range: DateRange): boolean {
    return range.start !== null && range.end !== null;
}

/** Inclusive day count of a complete range; `0` otherwise. */
export function daysCount(range: DateRange): number {
    return isComplete(range) ? diffDays(range.start!, range.end!) + 1 : 0;
}

/** Nights, i.e. what a charter or a hotel bills. */
export function nightsCount(range: DateRange): number {
    return Math.max(0, daysCount(range) - 1);
}

export interface SelectionConstraints {
    min?: Date | null;
    max?: Date | null;
    /** Shortest allowed range, inclusive day count. */
    minDays?: number | null;
    /** Longest allowed range, inclusive day count. */
    maxDays?: number | null;
    /** Days the host has vetoed (holidays, booked days, …). */
    isDisabled?: (date: Date) => boolean;
}

/**
 * What clicking `day` does next.
 *
 * The rules mirror Syncfusion's picker: the first click sets the start, the second closes the range
 * and anything else restarts the selection. Clicking *before* a pending start does not swap the
 * ends silently — it treats the click as a new start, which is what users expect when they realise
 * they began on the wrong month.
 */
export function nextSelection(current: DateRange, day: Date): DateRange {
    const picked = startOfDay(day);
    if (!current.start || current.end) {
        return { start: picked, end: null };
    }
    if (compareDay(picked, current.start) < 0) {
        return { start: picked, end: null };
    }
    return { start: current.start, end: picked };
}

/**
 * Whether a day can be clicked, given the constraints and the range picked so far.
 *
 * While a start is pending, `minDays`/`maxDays` also close off the days that could not form a legal
 * range with it, so the constraint is visible before the user commits rather than as a rejection
 * afterwards.
 */
export function isDaySelectable(day: Date, pending: DateRange, constraints: SelectionConstraints): boolean {
    const date = startOfDay(day);
    if (!isWithin(date, constraints.min ?? null, constraints.max ?? null)) {
        return false;
    }
    if (constraints.isDisabled?.(date)) {
        return false;
    }
    const pendingStart = pending.start && !pending.end ? pending.start : null;
    if (!pendingStart) {
        return true;
    }
    if (compareDay(date, pendingStart) < 0) {
        // Earlier than the pending start: legal, it just restarts the selection.
        return true;
    }
    const span = diffDays(pendingStart, date) + 1;
    if (constraints.minDays && span < constraints.minDays) {
        return false;
    }
    if (constraints.maxDays && span > constraints.maxDays) {
        return false;
    }
    // A disabled day inside the interval would make the range span something unavailable.
    if (constraints.isDisabled) {
        for (let cursor = addDays(pendingStart, 1); compareDay(cursor, date) <= 0; cursor = addDays(cursor, 1)) {
            if (constraints.isDisabled(cursor)) {
                return false;
            }
        }
    }
    return true;
}

/**
 * The interval to paint, which during a pending selection is the hovered (or keyboard-focused)
 * preview rather than the stored value.
 */
export function previewRange(selection: DateRange, hovered: Date | null): DateRange {
    if (selection.start && !selection.end && hovered && compareDay(hovered, selection.start) >= 0) {
        return { start: selection.start, end: startOfDay(hovered) };
    }
    return selection;
}

export function isInRange(day: Date, range: DateRange): boolean {
    if (!range.start || !range.end) {
        return false;
    }
    return compareDay(day, range.start) >= 0 && compareDay(day, range.end) <= 0;
}
