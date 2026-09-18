/**
 * Date arithmetic for the picker. Everything here is pure, local-time and DST-safe: days are
 * compared by their calendar fields, never by subtracting timestamps, because a 23- or 25-hour day
 * would otherwise shift a range by one.
 */

/** Midnight of `date` in local time. Returns a copy; the argument is never mutated. */
export function startOfDay(date: Date): Date {
    const copy = new Date(date.getTime());
    copy.setHours(0, 0, 0, 0);
    return copy;
}

/** 23:59:59.999 of `date` in local time — what a range end means when it is sent to an API. */
export function endOfDay(date: Date): Date {
    const copy = new Date(date.getTime());
    copy.setHours(23, 59, 59, 999);
    return copy;
}

export function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDays(date: Date, amount: number): Date {
    const copy = startOfDay(date);
    copy.setDate(copy.getDate() + amount);
    return copy;
}

/**
 * Adds whole months, clamping the day of month. 31 Jan + 1 month is 28/29 Feb, not 2/3 March,
 * which is what a calendar header stepping through months has to do.
 */
export function addMonths(date: Date, amount: number): Date {
    const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(date.getDate(), lastDay));
    return target;
}

export function addYears(date: Date, amount: number): Date {
    return addMonths(date, amount * 12);
}

export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
    if (!a || !b) {
        return false;
    }
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date | null | undefined, b: Date | null | undefined): boolean {
    if (!a || !b) {
        return false;
    }
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** `-1`, `0` or `1`, comparing calendar days and ignoring the time of day. */
export function compareDay(a: Date, b: Date): number {
    const left = startOfDay(a).getTime();
    const right = startOfDay(b).getTime();
    return left === right ? 0 : left < right ? -1 : 1;
}

/**
 * Whole days from `a` to `b`, inclusive of neither end (`diffDays(d, d) === 0`).
 *
 * Both ends are taken to noon before subtracting so a DST transition inside the interval cannot
 * turn an exact multiple of 24h into 23.99h and round down.
 */
export function diffDays(a: Date, b: Date): number {
    const left = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12).getTime();
    const right = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12).getTime();
    return Math.round((right - left) / 86_400_000);
}

export function clampDate(date: Date, min: Date | null, max: Date | null): Date {
    if (min && compareDay(date, min) < 0) {
        return startOfDay(min);
    }
    if (max && compareDay(date, max) > 0) {
        return startOfDay(max);
    }
    return startOfDay(date);
}

export function isWithin(date: Date, min: Date | null, max: Date | null): boolean {
    if (min && compareDay(date, min) < 0) {
        return false;
    }
    if (max && compareDay(date, max) > 0) {
        return false;
    }
    return true;
}

/** ISO-8601 week number (weeks start on Monday, week 1 holds the first Thursday of the year). */
export function isoWeekNumber(date: Date): number {
    const target = startOfDay(date);
    // Shift to the Thursday of this ISO week, then count weeks from the year's first Thursday.
    const dayIndex = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayIndex + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstDayIndex = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDayIndex + 3);
    return 1 + Math.round(diffDays(firstThursday, target) / 7);
}

/**
 * The 6×7 grid of a month view: always six rows so the calendar never changes height when the user
 * steps through months, and always whole weeks so leading/trailing days of the neighbouring months
 * fill the corners.
 */
export function monthMatrix(year: number, month: number, firstDayOfWeek: number): Date[][] {
    const first = new Date(year, month, 1);
    const lead = (first.getDay() - firstDayOfWeek + 7) % 7;
    const gridStart = addDays(first, -lead);
    const weeks: Date[][] = [];
    for (let week = 0; week < 6; week++) {
        const days: Date[] = [];
        for (let day = 0; day < 7; day++) {
            days.push(addDays(gridStart, week * 7 + day));
        }
        weeks.push(days);
    }
    return weeks;
}

/** The twelve-year block a year belongs to, as drawn by the decade ("year") view. */
export function decadeStart(year: number): number {
    return year - (((year % 12) + 12) % 12);
}
