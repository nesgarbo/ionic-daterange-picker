/**
 * The shortcut list shown beside the calendar. Syncfusion calls these "presets"; the defaults here
 * cover the same ground as its `e-presets` sample.
 */
import type { DateRangeLabels, DateRangePreset } from '../types/date-range.types';
import { addDays, addMonths, endOfMonth, startOfMonth, startOfDay } from './date-range-date';

/** Preset labels, separate from `DateRangeLabels` so an app can translate the two independently. */
export interface DateRangePresetLabels {
    today: string;
    yesterday: string;
    last7Days: string;
    last30Days: string;
    thisMonth: string;
    lastMonth: string;
    thisYear: string;
}

export const DEFAULT_PRESET_LABELS: DateRangePresetLabels = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    thisYear: 'This year'
};

/**
 * Builds the default preset list. Takes the labels so the caller decides the language; the ranges
 * themselves are computed when the preset is used, not when the list is built.
 */
export function defaultPresets(labels: Partial<DateRangePresetLabels> = {}): DateRangePreset[] {
    const text = { ...DEFAULT_PRESET_LABELS, ...labels };
    return [
        { id: 'today', label: text.today, range: (today) => [startOfDay(today), startOfDay(today)] },
        { id: 'yesterday', label: text.yesterday, range: (today) => [addDays(today, -1), addDays(today, -1)] },
        { id: 'last-7-days', label: text.last7Days, range: (today) => [addDays(today, -6), startOfDay(today)] },
        { id: 'last-30-days', label: text.last30Days, range: (today) => [addDays(today, -29), startOfDay(today)] },
        { id: 'this-month', label: text.thisMonth, range: (today) => [startOfMonth(today), endOfMonth(today)] },
        { id: 'last-month', label: text.lastMonth, range: (today) => [startOfMonth(addMonths(today, -1)), endOfMonth(addMonths(today, -1))] },
        { id: 'this-year', label: text.thisYear, range: (today) => [new Date(today.getFullYear(), 0, 1), new Date(today.getFullYear(), 11, 31)] }
    ];
}

/** English text for everything the picker says. Overridden per app or per component. */
export const DEFAULT_LABELS: DateRangeLabels = {
    placeholder: 'Select a date range',
    separator: ' – ',
    apply: 'Apply',
    cancel: 'Cancel',
    clear: 'Clear',
    close: 'Close',
    title: 'Select dates',
    startHint: 'Start date',
    endHint: 'End date',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    chooseMonth: 'Choose a month',
    chooseYear: 'Choose a year',
    openCalendar: 'Open the calendar',
    weekColumn: 'Week',
    nights: '{nights} nights',
    days: '{days} days'
};
