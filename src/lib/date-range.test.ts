import { describe, expect, it } from 'vitest';
import { addMonths, diffDays, isoWeekNumber, monthMatrix } from './date-range-date';
import { coerceRange, isDaySelectable, nextSelection, previewRange, toControlValue } from './date-range-model';
import { formatDate, parseDate } from './date-range-intl';

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

describe('date maths', () => {
    it('clamps the day of month when adding months', () => {
        expect(addMonths(day(2026, 1, 31), 1)).toEqual(day(2026, 2, 28));
    });

    it('counts whole days across a DST transition', () => {
        // Europe/Madrid springs forward on 29 March 2026; the interval is still 7 days.
        expect(diffDays(day(2026, 3, 26), day(2026, 4, 2))).toBe(7);
    });

    it('always renders six whole weeks', () => {
        const weeks = monthMatrix(2026, 8, 1);
        expect(weeks).toHaveLength(6);
        expect(weeks.every((week) => week.length === 7)).toBe(true);
        expect(weeks[0][0].getDay()).toBe(1);
    });

    it('numbers ISO weeks', () => {
        expect(isoWeekNumber(day(2026, 1, 1))).toBe(1);
        expect(isoWeekNumber(day(2026, 9, 17))).toBe(38);
    });
});

describe('value coercion', () => {
    it('accepts the Syncfusion pair, an object and ISO strings', () => {
        const expected = { start: day(2026, 9, 1), end: day(2026, 9, 8) };
        expect(coerceRange([day(2026, 9, 1), day(2026, 9, 8)])).toEqual(expected);
        expect(coerceRange({ start: day(2026, 9, 1), end: day(2026, 9, 8) })).toEqual(expected);
        expect(coerceRange(['2026-09-01T00:00:00', '2026-09-08T00:00:00'])).toEqual(expected);
    });

    it('orders the ends and strips the time of day', () => {
        const range = coerceRange([new Date(2026, 8, 8, 18, 30), new Date(2026, 8, 1, 9, 15)]);
        expect(range).toEqual({ start: day(2026, 9, 1), end: day(2026, 9, 8) });
    });

    it('publishes nothing while the range is incomplete', () => {
        expect(toControlValue({ start: day(2026, 9, 1), end: null })).toBeNull();
    });
});

describe('selection', () => {
    it('picks a start, then an end', () => {
        const first = nextSelection({ start: null, end: null }, day(2026, 9, 1));
        expect(first).toEqual({ start: day(2026, 9, 1), end: null });
        expect(nextSelection(first, day(2026, 9, 8))).toEqual({ start: day(2026, 9, 1), end: day(2026, 9, 8) });
    });

    it('restarts instead of swapping when clicking before the pending start', () => {
        const pending = { start: day(2026, 9, 10), end: null };
        expect(nextSelection(pending, day(2026, 9, 3))).toEqual({ start: day(2026, 9, 3), end: null });
    });

    it('previews the hovered interval only while a start is pending', () => {
        const pending = { start: day(2026, 9, 1), end: null };
        expect(previewRange(pending, day(2026, 9, 5))).toEqual({ start: day(2026, 9, 1), end: day(2026, 9, 5) });
        const complete = { start: day(2026, 9, 1), end: day(2026, 9, 8) };
        expect(previewRange(complete, day(2026, 9, 20))).toEqual(complete);
    });

    it('closes off days that would break minDays/maxDays', () => {
        const pending = { start: day(2026, 9, 1), end: null };
        expect(isDaySelectable(day(2026, 9, 2), pending, { minDays: 3 })).toBe(false);
        expect(isDaySelectable(day(2026, 9, 3), pending, { minDays: 3 })).toBe(true);
        expect(isDaySelectable(day(2026, 9, 9), pending, { maxDays: 7 })).toBe(false);
    });

    it('refuses a range that would span a disabled day', () => {
        const pending = { start: day(2026, 9, 1), end: null };
        const isDisabled = (date: Date) => date.getDate() === 5;
        expect(isDaySelectable(day(2026, 9, 4), pending, { isDisabled })).toBe(true);
        expect(isDaySelectable(day(2026, 9, 8), pending, { isDisabled })).toBe(false);
    });
});

describe('formatting', () => {
    it('round-trips a numeric pattern', () => {
        const text = formatDate(day(2026, 9, 17), 'dd/MM/yyyy', 'es');
        expect(text).toBe('17/09/2026');
        expect(parseDate(text, 'dd/MM/yyyy')).toEqual(day(2026, 9, 17));
    });

    it('rejects a date that does not exist', () => {
        expect(parseDate('31/02/2026', 'dd/MM/yyyy')).toBeNull();
    });

    it('rejects text that does not fit the pattern', () => {
        expect(parseDate('17-09-2026', 'dd/MM/yyyy')).toBeNull();
        expect(parseDate('hello', 'dd/MM/yyyy')).toBeNull();
    });
});
