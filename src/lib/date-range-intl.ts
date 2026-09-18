/**
 * Locale-driven names, patterns, formatting and parsing.
 *
 * Everything comes from `Intl` rather than from a bundled locale table, so a picker follows
 * whatever locale the app is running in without shipping any data. The one thing `Intl` does not
 * give everywhere is the first day of the week, so that has a small fallback below.
 */

/** Regions that start their week on Sunday or Saturday; everything else starts on Monday. */
const SUNDAY_FIRST = new Set(['US', 'CA', 'MX', 'JP', 'BR', 'AR', 'CO', 'PE', 'VE', 'CL', 'IL', 'KR', 'TW', 'ZA', 'PH', 'IN', 'CN', 'HK', 'AU', 'NZ']);
const SATURDAY_FIRST = new Set(['AE', 'AF', 'BH', 'DZ', 'EG', 'IQ', 'JO', 'KW', 'LY', 'OM', 'QA', 'SA', 'SY', 'YE']);

interface WeekInfoCapableLocale extends Intl.Locale {
    /** Chrome/Safari expose `getWeekInfo()`, Firefox exposes `weekInfo`; neither is typed yet. */
    getWeekInfo?: () => { firstDay: number };
    weekInfo?: { firstDay: number };
}

/**
 * The locale's first weekday as a `Date#getDay()` index (0 = Sunday).
 *
 * `Intl` reports it in ISO terms (1 = Monday … 7 = Sunday), hence the `% 7`.
 */
export function localeFirstDayOfWeek(locale: string): number {
    try {
        const info = new Intl.Locale(locale) as WeekInfoCapableLocale;
        const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
        if (typeof firstDay === 'number') {
            return firstDay % 7;
        }
        const region = info.maximize().region ?? '';
        if (SUNDAY_FIRST.has(region)) {
            return 0;
        }
        if (SATURDAY_FIRST.has(region)) {
            return 6;
        }
    } catch {
        // Malformed locale tag: fall through to the Monday default rather than break the calendar.
    }
    return 1;
}

/** Weekday headers, rotated so index 0 is `firstDayOfWeek`. */
export function weekdayNames(locale: string, firstDayOfWeek: number, style: 'narrow' | 'short' = 'narrow'): string[] {
    const format = new Intl.DateTimeFormat(locale, { weekday: style });
    // 2024-01-07 is a Sunday, so adding the day index lands on that weekday.
    return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 7 + ((firstDayOfWeek + index) % 7))));
}

export function monthNames(locale: string, style: 'long' | 'short' = 'short'): string[] {
    const format = new Intl.DateTimeFormat(locale, { month: style });
    return Array.from({ length: 12 }, (_, month) => format.format(new Date(2024, month, 1)));
}

/** "September 2026" for the calendar header. */
export function monthYearLabel(locale: string, date: Date): string {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

/** Full, spoken form of a day for `aria-label`. */
export function fullDateLabel(locale: string, date: Date): string {
    return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

/**
 * The locale's numeric date pattern, as a token string this file can also parse back
 * (`dd/MM/yyyy`, `MM/dd/yyyy`, `yyyy-MM-dd`, …).
 *
 * Derived from `formatToParts` instead of hard-coded, and kept numeric-only on purpose: a pattern
 * the picker prints is a pattern the user may type into, and month names are not round-trippable.
 */
export function localeDatePattern(locale: string): string {
    try {
        const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(new Date(2024, 0, 2));
        const pattern = parts
            .map((part) => {
                switch (part.type) {
                    case 'day':
                        return 'dd';
                    case 'month':
                        return 'MM';
                    case 'year':
                        return 'yyyy';
                    case 'literal':
                        // Escape whatever separator the locale uses so it survives the formatter.
                        return part.value.replace(/[a-zA-Z]/g, '');
                    default:
                        return '';
                }
            })
            .join('');
        return pattern.includes('dd') && pattern.includes('MM') ? pattern : 'dd/MM/yyyy';
    } catch {
        return 'dd/MM/yyyy';
    }
}

const TOKEN = /(yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|EEE)/g;

/** Formats one date with a token pattern (`dd/MM/yyyy`, `d MMM yyyy`, …). */
export function formatDate(date: Date, pattern: string, locale: string): string {
    const pad = (value: number, length = 2) => String(value).padStart(length, '0');
    return pattern.replace(TOKEN, (token) => {
        switch (token) {
            case 'yyyy':
                return pad(date.getFullYear(), 4);
            case 'yy':
                return pad(date.getFullYear() % 100);
            case 'MMMM':
                return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
            case 'MMM':
                return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
            case 'MM':
                return pad(date.getMonth() + 1);
            case 'M':
                return String(date.getMonth() + 1);
            case 'dd':
                return pad(date.getDate());
            case 'd':
                return String(date.getDate());
            case 'EEEE':
                return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
            case 'EEE':
                return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
            default:
                return token;
        }
    });
}

/**
 * Parses text typed by the user against a numeric pattern.
 *
 * Returns `null` for anything that does not fit, including dates that do not exist (31 February),
 * which is what keeps `allowEdit` from silently rolling a typo over into the next month.
 */
export function parseDate(text: string, pattern: string): Date | null {
    const trimmed = text.trim();
    if (!trimmed) {
        return null;
    }
    const order: ('y' | 'm' | 'd')[] = [];
    const source = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(TOKEN, (token) => {
        switch (token) {
            case 'yyyy':
                order.push('y');
                return '(\\d{4})';
            case 'yy':
                order.push('y');
                return '(\\d{2})';
            case 'MM':
            case 'M':
                order.push('m');
                return '(\\d{1,2})';
            case 'dd':
            case 'd':
                order.push('d');
                return '(\\d{1,2})';
            default:
                // Month or weekday names cannot be parsed back reliably; refuse the whole pattern.
                order.push('y');
                return '(?!)';
        }
    });
    const match = new RegExp(`^\\s*${source}\\s*$`).exec(trimmed);
    if (!match) {
        return null;
    }
    let year = new Date().getFullYear();
    let month = 1;
    let day = 1;
    order.forEach((field, index) => {
        const value = Number(match[index + 1]);
        if (field === 'y') {
            year = value < 100 ? 2000 + value : value;
        } else if (field === 'm') {
            month = value;
        } else {
            day = value;
        }
    });
    const parsed = new Date(year, month - 1, day);
    // `new Date(2024, 1, 31)` silently becomes 2 March: reject anything the constructor moved.
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
        return null;
    }
    return parsed;
}
