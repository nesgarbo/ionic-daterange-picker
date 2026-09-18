/**
 * The picked interval. Both ends are inclusive and normalised to the start of their day; an
 * incomplete selection (the user has clicked the first date and not yet the second) is represented
 * by `end === null`.
 *
 * @group Types
 */
export interface DateRange {
    start: Date | null;
    end: Date | null;
}

/**
 * Everything the picker accepts as a value.
 *
 * `Date[]` is the Syncfusion `ejs-daterangepicker` shape (`[startDate, endDate]`) and is what the
 * control writes back to a form, so an existing `formControlName` keeps working after swapping the
 * tag. A `{ start, end }` object and an ISO string pair are accepted on the way in as a
 * convenience.
 *
 * @group Types
 */
export type DateRangeValue = DateRange | readonly (Date | string | null)[] | null | undefined;

/**
 * How the calendar is presented.
 *
 * `auto` picks `popover` on a pointer device with room for it and `modal` (a sheet) on a phone —
 * the same split the Ionic overlays themselves make. `inline` renders the calendar in place with no
 * trigger input at all.
 *
 * @group Types
 */
export type DateRangePresentation = 'auto' | 'popover' | 'modal' | 'inline';

/**
 * A shortcut shown beside the calendar ("This month", "Last 7 days", …).
 *
 * `range` is a factory rather than a fixed pair so a preset stays correct when the picker is opened
 * days after the component was created.
 *
 * @group Types
 */
export interface DateRangePreset {
    /** Stable identifier, used for tracking and for `selectedPreset`. */
    id: string;
    /** Text shown on the chip/item. Already translated. */
    label: string;
    /** Builds the range, given "today" at the moment the preset is used. */
    range: (today: Date) => DateRange | [Date, Date];
}

/**
 * Every piece of user-facing text. English defaults ship with the component; an app translates by
 * passing `[labels]` or by registering defaults with `provideIonicDateRangePicker()`.
 *
 * @group Types
 */
export interface DateRangeLabels {
    placeholder: string;
    /** Separator drawn between the two formatted dates. */
    separator: string;
    apply: string;
    cancel: string;
    clear: string;
    close: string;
    title: string;
    startHint: string;
    endHint: string;
    previousMonth: string;
    nextMonth: string;
    chooseMonth: string;
    chooseYear: string;
    openCalendar: string;
    weekColumn: string;
    /** `{nights}` is replaced by the night count. */
    nights: string;
    /** `{days}` is replaced by the day count. */
    days: string;
}

/** Where a value change came from. Useful to skip work on programmatic writes. */
export type DateRangeChangeSource = 'calendar' | 'preset' | 'input' | 'clear' | 'programmatic';

/**
 * Payload of the `change` output, modelled on Syncfusion's `RangeEventArgs` so existing handlers
 * need no rewriting beyond the type import.
 *
 * @group Types
 */
export interface DateRangeChangeEvent {
    /** The Syncfusion-compatible pair, or `null` when the range was cleared. */
    value: Date[] | null;
    startDate: Date | null;
    endDate: Date | null;
    /** Inclusive day count; `0` when there is no complete range. */
    daysCount: number;
    /** Nights between both ends (`daysCount - 1`, floored at 0). What a charter actually bills. */
    nightsCount: number;
    source: DateRangeChangeSource;
}

/**
 * Defaults shared by every picker in an app, registered with `provideIonicDateRangePicker()`.
 * Anything set on an individual component wins.
 *
 * @group Types
 */
export interface DateRangePickerDefaults {
    locale?: string;
    firstDayOfWeek?: number;
    format?: string;
    presentation?: DateRangePresentation;
    presets?: DateRangePreset[];
    labels?: Partial<DateRangeLabels>;
    autoApply?: boolean;
    openOnFocus?: boolean;
    allowEdit?: boolean;
    clearable?: boolean;
}
