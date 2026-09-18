/**
 * App-wide defaults. Anything bound on an individual `<ionic-daterange-picker>` still wins; this is
 * for the settings that should be the same everywhere (locale, format, translated labels).
 */
import { InjectionToken, type Provider } from '@angular/core';
import type { DateRangePickerDefaults } from '../types/date-range.types';

export const IONIC_DATE_RANGE_PICKER_DEFAULTS = new InjectionToken<DateRangePickerDefaults>('IONIC_DATE_RANGE_PICKER_DEFAULTS');

/**
 * ```ts
 * providers: [provideIonicDateRangePicker({ locale: 'es', labels: { apply: 'Aplicar' } })]
 * ```
 */
export function provideIonicDateRangePicker(defaults: DateRangePickerDefaults): Provider {
    return { provide: IONIC_DATE_RANGE_PICKER_DEFAULTS, useValue: defaults };
}
