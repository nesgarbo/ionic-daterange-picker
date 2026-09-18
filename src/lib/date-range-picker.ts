import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, computed, effect, forwardRef, inject, input, model, numberAttribute, output, signal, untracked } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { IonButton, IonChip, IonContent, IonIcon, IonInput, IonModal, IonPopover } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarOutline, closeCircle } from 'ionicons/icons';
import type { DateRange, DateRangeChangeEvent, DateRangeChangeSource, DateRangeLabels, DateRangePresentation, DateRangePreset, DateRangeValue } from '../types/date-range.types';
import { IonicDateRangeCalendar } from './date-range-calendar';
import { IONIC_DATE_RANGE_PICKER_DEFAULTS } from './date-range-config';
import { formatDate, localeDatePattern, parseDate } from './date-range-intl';
import { EMPTY_RANGE, coerceRange, daysCount, isComplete, nightsCount, rangesEqual, toControlValue } from './date-range-model';
import { DEFAULT_LABELS } from './date-range-presets';

addIcons({ 'idrp-calendar': calendarOutline, 'idrp-close-circle': closeCircle });

let nextId = 0;

/**
 * A date range picker with the feature set of Syncfusion's `ejs-daterangepicker`, made of nothing
 * but Ionic components: an `ion-input` for the field, an `ion-popover` or an `ion-modal` for the
 * overlay, and a real `ion-datetime` for the calendar inside it.
 *
 * That is the whole point of it. A theme that restyles Ionic — `@rdlabo/ionic-theme-md3`,
 * `@rdlabo/ionic-theme-ios26` — restyles this picker too, and the calendar is the same one the
 * rest of the app shows for a single date, with a range, a summary line and Clear/Cancel/Apply on
 * top of it.
 *
 * It is a `ControlValueAccessor` that reads and writes `[startDate, endDate]`, the same value
 * Syncfusion publishes, so an existing `formControlName` keeps working when the tag is swapped.
 *
 * ```html
 * <ionic-daterange-picker formControlName="fromTo" [allowEdit]="false" [openOnFocus]="true" />
 * ```
 *
 * @group Components
 */
@Component({
    selector: 'ionic-daterange-picker',
    standalone: true,
    imports: [NgTemplateOutlet, IonButton, IonChip, IonContent, IonIcon, IonInput, IonModal, IonPopover, IonicDateRangeCalendar],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => IonicDateRangePicker),
            multi: true
        }
    ],
    host: {
        class: 'idrp-host',
        '[class.idrp-host-disabled]': 'isDisabled()',
        '[class.idrp-host-inline]': "presentation() === 'inline'"
    },
    template: `
        @if (presentation() === 'inline') {
            <ng-container [ngTemplateOutlet]="panel" />
        } @else {
            <div class="idrp-trigger" [id]="triggerId" (click)="onTriggerClick()">
                @if (appearance() === 'button') {
                    <ion-button class="idrp-trigger-button button-submit" fill="solid" expand="block" [color]="buttonColor()" [disabled]="isDisabled()">
                        <ion-icon slot="start" name="idrp-calendar" aria-hidden="true" />
                        <span class="idrp-trigger-text">{{ displayText() || placeholder() || labels().placeholder }}</span>
                    </ion-button>
                } @else {
                <ion-input
                    class="idrp-input"
                    [value]="displayText()"
                    [label]="label()"
                    [labelPlacement]="labelPlacement()"
                    [fill]="fill()"
                    [placeholder]="placeholder() ?? labels().placeholder"
                    [readonly]="!allowEdit() || isDisabled()"
                    [disabled]="isDisabled()"
                    [errorText]="errorText()"
                    [helperText]="helperText()"
                    inputmode="numeric"
                    (ionBlur)="onInputBlur($event)"
                    (ionFocus)="onInputFocus()"
                    (ionChange)="onInputText($event)"
                >
                    @if (clearable() && hasValue() && !isDisabled()) {
                        <ion-button slot="end" fill="clear" size="small" class="idrp-clear" [attr.aria-label]="labels().clear" (click)="clear($event)">
                            <ion-icon slot="icon-only" name="idrp-close-circle" />
                        </ion-button>
                    }
                    <ion-button slot="end" fill="clear" size="small" class="idrp-open" [id]="iconId" [disabled]="isDisabled()" [attr.aria-label]="labels().openCalendar" (click)="onIconClick($event)">
                        <ion-icon slot="icon-only" name="idrp-calendar" />
                    </ion-button>
                </ion-input>
                }
            </div>

            @if (overlay() === 'popover') {
                <ion-popover
                    class="idrp-popover"
                    [trigger]="popoverTrigger()"
                    [isOpen]="isOpen()"
                    [keepContentsMounted]="false"
                    [dismissOnSelect]="false"
                    [showBackdrop]="true"
                    side="bottom"
                    alignment="start"
                    (didPresent)="onPresented()"
                    (didDismiss)="onDismissed()"
                >
                    <ng-template>
                        <ion-content class="idrp-overlay-content">
                            <ng-container [ngTemplateOutlet]="panel" />
                        </ion-content>
                    </ng-template>
                </ion-popover>
            } @else {
                <ion-modal class="idrp-modal" [isOpen]="isOpen()" (didPresent)="onPresented()" (didDismiss)="onDismissed()">
                    <ng-template>
                        <ion-content class="idrp-overlay-content">
                            <ng-container [ngTemplateOutlet]="panel" />
                        </ion-content>
                    </ng-template>
                </ion-modal>
            }
        }

        <ng-template #panel>
            <div class="idrp-panel">
                @if (resolvedPresets().length) {
                    <div class="idrp-presets" role="group">
                        @for (preset of resolvedPresets(); track preset.id) {
                            <ion-chip [outline]="activePreset() !== preset.id" [class.idrp-preset-active]="activePreset() === preset.id" (click)="applyPreset(preset)">
                                {{ preset.label }}
                            </ion-chip>
                        }
                    </div>
                }

                <ionic-daterange-calendar
                    [value]="draft()"
                    (valueChange)="onDraftChange($event)"
                    [min]="min()"
                    [max]="max()"
                    [minDays]="minDays()"
                    [maxDays]="maxDays()"
                    [locale]="resolvedLocale()"
                    [firstDayOfWeek]="firstDayOfWeek()"
                    [isDateEnabled]="isDateEnabled()"
                    [labels]="labels()"
                    [format]="resolvedFormat()"
                    [disabled]="isDisabled()"
                    [showTitle]="showTitle()"
                    [showButtons]="presentation() !== 'inline'"
                    (rangeComplete)="onRangeComplete($event)"
                    (applied)="apply()"
                    (cancelled)="cancel()"
                />
            </div>
        </ng-template>
    `,
    styles: [
        `
            .idrp-host {
                display: block;
                font-family: var(--ion-font-family, inherit);
            }

            /* The trigger is an ion-input, so its fill, label placement, focus ring and error text
               come from Ionic and from whichever theme is loaded — nothing is restyled here. */
            .idrp-host .idrp-input {
                cursor: pointer;
            }

            .idrp-host-disabled .idrp-input {
                cursor: default;
            }

            /* Nothing is styled here: the button is an ion-button, so it takes the app's theme and
               whatever the host sets through its own CSS variables. */
            .idrp-host .idrp-trigger-button {
                margin: 0;
            }

            .idrp-host .idrp-trigger-text {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .idrp-host .idrp-clear,
            .idrp-host .idrp-open {
                --padding-start: 0.25rem;
                --padding-end: 0.25rem;
                margin: 0;
                height: 1.75rem;
            }

            .idrp-panel {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }

            .idrp-presets {
                display: flex;
                flex-wrap: wrap;
                gap: 0.25rem;
                padding: 0.5rem 0.75rem 0;
            }

            .idrp-presets ion-chip {
                margin: 0;
            }

            /* Let the popover size itself to the calendar instead of Ionic's default 200px-ish
               width, and keep it inside the viewport on a small tablet. */
            ion-popover.idrp-popover {
                --width: min(92vw, 22rem);
                --max-width: 92vw;
                --offset-y: 4px;
            }

            ion-popover.idrp-popover::part(content) {
                width: auto;
            }

            /* A dialog rather than a page or a sheet: sized to the calendar, centred, over the
               dimmed backdrop the modal brings with it.

               The background is set explicitly because a theme may make a modal that contains a
               calendar transparent — @rdlabo/ionic-theme-ios26 does, on the assumption that the
               calendar itself is the glass card. Here the card also holds the summary and the
               button row, so it is the dialog that carries the surface and the calendar inside it
               is flattened onto it, below. */
            ion-modal.idrp-modal {
                --width: min(92vw, 23rem);
                --height: auto;
                --max-height: 88vh;
                --border-radius: 16px;
                --background: var(--idrp-dialog-background, var(--ion-item-background, #fff));
                --backdrop-opacity: 0.4;
                --box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);

                align-items: center;
                justify-content: center;
            }

            ion-modal.idrp-modal ion-content.idrp-overlay-content {
                --background: transparent;
            }

            /* iOS: the dialog is the glass surface, built from the same variables
               @rdlabo/ionic-theme-ios26 defines, so it matches the sheets and popovers around it.
               Without that theme the fallbacks leave a translucent white card. */
            ion-modal.idrp-modal.ios {
                --background: rgba(var(--ios-theme-glass-background-rgb, var(--ios26-glass-background-rgb, 255, 255, 255)), 0.72);
                --border-radius: 24px;
            }

            ion-modal.idrp-modal.ios::part(content) {
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                box-shadow:
                    inset 0 0 0 0.5px rgba(var(--ios-theme-glass-border-color-rgb, var(--ios26-glass-border-color-rgb, 255, 255, 255)), 0.8),
                    0 12px 28px rgba(0, 0, 0, 0.17);
            }

            ion-modal.idrp-modal ion-datetime.idrp-datetime {
                --background: transparent;

                background: transparent;
                border: 0;
                border-radius: 0;
                box-shadow: none;
                backdrop-filter: none;
            }

            ion-modal.idrp-modal::part(content) {
                overflow: hidden;
            }

            .idrp-overlay-content {
                --background: var(--ion-background-color, #fff);
            }

            /* Inline presentation is a plain surface the host page frames; it borrows the item
               background so it sits correctly inside a list or a card. */
            .idrp-host-inline .idrp-panel {
                background: var(--ion-item-background, var(--ion-background-color, #fff));
                border-radius: var(--idrp-inline-radius, 0.75rem);
            }
        `
    ]
})
export class IonicDateRangePicker implements ControlValueAccessor {
    private readonly defaults = inject(IONIC_DATE_RANGE_PICKER_DEFAULTS, { optional: true });

    protected readonly triggerId = `idrp-trigger-${nextId++}`;
    protected readonly iconId = `${this.triggerId}-icon`;

    /**
     * The range, as the Syncfusion pair `[startDate, endDate]`. Two-way bindable, and also what the
     * form control sees. `null` while the range is incomplete.
     */
    readonly value = model<DateRangeValue>(null);

    /**
     * How the trigger looks: `'field'` is an `ion-input` with a label, `'button'` an `ion-button`
     * with a calendar icon that reads the range as its text. Both are Ionic controls, so both
     * follow the app's theme.
     */
    readonly appearance = input<'field' | 'button'>('field');

    /**
     * The `color` of the button trigger, when `appearance` is `'button'`. It is a filled button, so
     * this picks the fill: `'light'` reads as a white pill on a coloured hero, `'primary'` as the
     * app's accent on a plain page.
     */
    readonly buttonColor = input<string>('primary');

    readonly label = input<string | undefined>(undefined);
    readonly labelPlacement = input<'start' | 'end' | 'floating' | 'stacked' | 'fixed'>('stacked');
    readonly fill = input<'outline' | 'solid' | undefined>(undefined);
    readonly placeholder = input<string | undefined>(undefined);
    readonly helperText = input<string | undefined>(undefined);
    readonly errorText = input<string | undefined>(undefined);

    readonly min = input<Date | null>(null);
    readonly max = input<Date | null>(null);
    readonly minDays = input(0, { transform: numberAttribute });
    readonly maxDays = input(0, { transform: numberAttribute });
    readonly firstDayOfWeek = input<number | null>(this.defaults?.firstDayOfWeek ?? null);
    /** Days the host vetoes — holidays, days already booked. The Syncfusion `renderDayCell` role. */
    readonly isDateEnabled = input<((date: Date) => boolean) | null>(null);
    /** The calendar header, carrying the title and the summary of what is picked so far. */
    readonly showTitle = input(true, { transform: booleanAttribute });

    /** Typing into the field. When `false` the input is read-only, as `allowEdit=false` in Syncfusion. */
    readonly allowEdit = input(this.defaults?.allowEdit ?? false, { transform: booleanAttribute });
    readonly openOnFocus = input(this.defaults?.openOnFocus ?? false, { transform: booleanAttribute });
    readonly clearable = input(this.defaults?.clearable ?? true, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    /** Commit and close as soon as the second date is tapped, instead of waiting for Apply. */
    readonly autoApply = input(this.defaults?.autoApply ?? false, { transform: booleanAttribute });
    readonly presentation = input<DateRangePresentation>(this.defaults?.presentation ?? 'auto');

    /** Token pattern for display and for parsing typed text. Defaults to the locale's own. */
    readonly format = input<string | undefined>(this.defaults?.format);
    readonly locale = input<string | undefined>(this.defaults?.locale);
    readonly presets = input<DateRangePreset[] | null>(this.defaults?.presets ?? null);
    readonly labelOverrides = input<Partial<DateRangeLabels> | undefined>(undefined, { alias: 'labels' });

    readonly change = output<DateRangeChangeEvent>();
    readonly opened = output<void>();
    readonly closed = output<void>();

    /** The committed range — what the form holds. */
    private readonly selection = signal<DateRange>(EMPTY_RANGE);
    /** What the calendar is editing; only copied into `selection` when the range is applied. */
    protected readonly draft = signal<DateRange>(EMPTY_RANGE);
    protected readonly isOpen = signal(false);
    protected readonly activePreset = signal<string | null>(null);

    private readonly cvaDisabled = signal(false);
    /** When the overlay last closed, to tell a restored focus from a real one. */
    private lastDismissAt = 0;
    private onChange: (value: Date[] | null) => void = () => {};
    private onTouched: () => void = () => {};

    protected readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
    protected readonly labels = computed<DateRangeLabels>(() => ({ ...DEFAULT_LABELS, ...this.defaults?.labels, ...this.labelOverrides() }));
    protected readonly resolvedLocale = computed(() => this.locale() ?? this.defaults?.locale ?? (typeof navigator === 'undefined' ? 'en' : navigator.language));
    protected readonly resolvedFormat = computed(() => this.format() ?? localeDatePattern(this.resolvedLocale()));
    protected readonly resolvedPresets = computed(() => this.presets() ?? []);
    protected readonly hasValue = computed(() => isComplete(this.selection()));
    protected readonly draftComplete = computed(() => isComplete(this.draft()));

    protected readonly overlay = computed<'popover' | 'modal'>(() => {
        const presentation = this.presentation();
        // 'auto' is a centred modal over a dimmed backdrop: it is the only presentation that
        // gives the calendar a stable box to measure itself in, and the one this app's themes
        // animate cleanly. A popover is used only when it is asked for by name.
        return presentation === 'popover' ? 'popover' : 'modal';
    });

    /**
     * The element `ion-popover` anchors to and opens from. With `allowEdit` the field itself has to
     * stay clickable for the caret, so only the calendar button opens the overlay.
     */
    protected readonly popoverTrigger = computed(() => {
        if (this.isDisabled() || this.overlay() !== 'popover') {
            return undefined;
        }
        return this.allowEdit() ? this.iconId : this.triggerId;
    });

    protected readonly displayText = computed(() => {
        const range = this.selection();
        if (!range.start) {
            return '';
        }
        const pattern = this.resolvedFormat();
        const locale = this.resolvedLocale();
        const start = formatDate(range.start, pattern, locale);
        return range.end ? `${start}${this.labels().separator}${formatDate(range.end, pattern, locale)}` : start;
    });

    constructor() {
        // A `[value]` binding (or a form write) is the source of truth for the committed range.
        effect(() => {
            const incoming = coerceRange(this.value());
            untracked(() => {
                if (!rangesEqual(incoming, this.selection())) {
                    this.selection.set(incoming);
                    this.draft.set(incoming);
                }
            });
        });
    }

    // ControlValueAccessor ------------------------------------------------------------------

    writeValue(value: DateRangeValue): void {
        const range = coerceRange(value);
        this.selection.set(range);
        this.draft.set(range);
        // Keep the two-way binding in step without re-emitting to the form.
        this.value.set(toControlValue(range));
    }

    registerOnChange(fn: (value: Date[] | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.cvaDisabled.set(isDisabled);
    }

    // Public API ----------------------------------------------------------------------------

    /** Opens the calendar. No-op when disabled or already open. */
    open(): void {
        if (this.isDisabled() || this.isOpen() || this.presentation() === 'inline') {
            return;
        }
        // Take the focus off the field before the overlay records where to put it back, so closing
        // does not land on the field and, with `openOnFocus`, open the dialog again.
        if (typeof document !== 'undefined') {
            (document.activeElement as HTMLElement | null)?.blur?.();
        }
        const range = this.selection();
        this.draft.set(range);
        this.isOpen.set(true);
    }

    /** Closes without committing the draft. */
    cancel(): void {
        this.draft.set(this.selection());
        this.isOpen.set(false);
    }

    /** Commits the draft range and closes. */
    apply(): void {
        const range = this.draft();
        if (!isComplete(range)) {
            return;
        }
        this.commit(range, 'calendar');
        this.isOpen.set(false);
    }

    /** Empties the range, both in the draft and in the form. */
    clear(event?: Event): void {
        event?.stopPropagation();
        this.draft.set(EMPTY_RANGE);
        this.activePreset.set(null);
        this.commit(EMPTY_RANGE, 'clear');
    }

    // Template handlers ---------------------------------------------------------------------

    /**
     * Opening is driven by the click, not by the focus.
     *
     * A dismissing overlay hands focus back to whatever had it before — the field — so opening on
     * focus alone means Cancel reopens the dialog it just closed, forever; and after a backdrop
     * dismiss the field is already focused, so the next click fires no focus event at all and the
     * dialog can never be reopened. `openOnFocus` survives for the keyboard path, guarded against
     * both.
     */
    protected onTriggerClick(): void {
        if (this.overlay() === 'popover' && !this.allowEdit()) {
            // `[trigger]` is the whole field here, and Ionic already opened it.
            return;
        }
        this.open();
    }

    protected onIconClick(event: Event): void {
        if (this.overlay() === 'popover') {
            // `[trigger]` is the icon here, and Ionic already opened it.
            return;
        }
        event.stopPropagation();
        this.open();
    }

    protected onInputFocus(): void {
        if (!this.openOnFocus()) {
            return;
        }
        // The focus the overlay restores on its way out is not the user asking for it back.
        if (Date.now() - this.lastDismissAt < 500) {
            return;
        }
        this.open();
    }

    protected onInputBlur(event: Event): void {
        this.onTouched();
        this.parseTyped((event.target as { value?: string | number | null } | null)?.value);
    }

    protected onInputText(event: Event): void {
        if (!this.allowEdit()) {
            return;
        }
        this.parseTyped((event as CustomEvent<{ value?: string | number | null }>).detail?.value);
    }

    protected onDraftChange(range: DateRange): void {
        this.draft.set(range);
    }

    protected onRangeComplete(range: DateRange): void {
        this.activePreset.set(null);
        if (this.autoApply()) {
            this.commit(range, 'calendar');
            this.isOpen.set(false);
        }
    }

    protected applyPreset(preset: DateRangePreset): void {
        const built = preset.range(new Date());
        const range = coerceRange(built);
        this.draft.set(range);
        this.activePreset.set(preset.id);
        if (this.autoApply()) {
            this.commit(range, 'preset');
            this.isOpen.set(false);
        }
    }

    protected onPresented(): void {
        this.isOpen.set(true);
        // `ion-popover` opens itself from `[trigger]` without going through `open()`, so the draft
        // is seeded here as well — this is the one place every opening path passes through.
        const range = this.selection();
        this.draft.set(range);
        this.opened.emit();
    }

    protected onDismissed(): void {
        this.lastDismissAt = Date.now();
        this.isOpen.set(false);
        // Dismissing by backdrop or by swiping the sheet down is a cancel: drop the draft.
        this.draft.set(this.selection());
        this.activePreset.set(null);
        this.onTouched();
        this.closed.emit();
    }

    // Internals -----------------------------------------------------------------------------

    private parseTyped(text: string | number | null | undefined): void {
        if (!this.allowEdit() || typeof text !== 'string') {
            return;
        }
        const pattern = this.resolvedFormat();
        const separator = this.labels().separator.trim();
        const parts = (separator ? text.split(separator) : [text]).flatMap((part) => (part.includes(' - ') ? part.split(' - ') : [part]));
        if (parts.length !== 2) {
            return;
        }
        const start = parseDate(parts[0], pattern);
        const end = parseDate(parts[1], pattern);
        if (!start || !end) {
            return;
        }
        const range = coerceRange([start, end]);
        this.draft.set(range);
        this.commit(range, 'input');
    }

    private commit(range: DateRange, source: DateRangeChangeSource): void {
        if (rangesEqual(range, this.selection())) {
            return;
        }
        this.selection.set(range);
        const controlValue = toControlValue(range);
        this.value.set(controlValue);
        this.onChange(controlValue);
        this.change.emit({
            value: controlValue,
            startDate: range.start,
            endDate: range.end,
            daysCount: daysCount(range),
            nightsCount: nightsCount(range),
            source
        });
    }
}
