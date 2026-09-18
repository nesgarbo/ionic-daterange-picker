export { IonicDateRangePicker } from './lib/date-range-picker';
export { IonicDateRangeCalendar } from './lib/date-range-calendar';
export { IONIC_DATE_RANGE_PICKER_DEFAULTS, provideIonicDateRangePicker } from './lib/date-range-config';
export { DEFAULT_LABELS, DEFAULT_PRESET_LABELS, defaultPresets, type DateRangePresetLabels } from './lib/date-range-presets';
export { EMPTY_RANGE, coerceRange, daysCount, isComplete, isDaySelectable, nightsCount, nextSelection, previewRange, rangesEqual, toControlValue, type SelectionConstraints } from './lib/date-range-model';
export { addDays, addMonths, addYears, compareDay, diffDays, endOfDay, endOfMonth, isSameDay, isSameMonth, startOfDay, startOfMonth } from './lib/date-range-date';
export { formatDate, localeDatePattern, localeFirstDayOfWeek, parseDate } from './lib/date-range-intl';
export type {
    DateRange,
    DateRangeChangeEvent,
    DateRangeChangeSource,
    DateRangeLabels,
    DateRangePickerDefaults,
    DateRangePresentation,
    DateRangePreset,
    DateRangeValue
} from './types/date-range.types';
