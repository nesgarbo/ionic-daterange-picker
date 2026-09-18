import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, computed, input, model, numberAttribute, output } from '@angular/core';
import { IonButton, IonButtons, IonDatetime } from '@ionic/angular';
import type { DateRange, DateRangeLabels } from '../types/date-range.types';
import { addDays, compareDay, startOfDay } from './date-range-date';
import { formatDate, localeDatePattern } from './date-range-intl';
import { EMPTY_RANGE, isComplete, isDaySelectable, nextSelection, nightsCount, rangesEqual } from './date-range-model';
import { DEFAULT_LABELS } from './date-range-presets';

/** `2026-09-17` in local time — the shape `ion-datetime` reads and writes for a date presentation. */
function toIsoDay(date: Date): string {
    return formatDate(date, 'yyyy-MM-dd', 'en');
}

function fromIsoDay(iso: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/**
 * The calendar surface: a real `ion-datetime` in multiple-date mode, with the range written into
 * its value as every day it covers.
 *
 * The grid, the month/year drill-down, the navigation, the keyboard handling, the locale and the
 * platform skin are all Ionic's — which is what makes `@rdlabo/ionic-theme-md3` and
 * `@rdlabo/ionic-theme-ios26` style this exactly as they style every other date picker in the app.
 * What this component adds is the range logic on top: which day a tap starts, extends or restarts,
 * the summary line in the header, and the buttons in the footer.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-daterange-calendar',
    standalone: true,
    imports: [IonButton, IonButtons, IonDatetime],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'idrp-calendar-host' },
    template: `
        @if (showTitle()) {
            <div class="idrp-summary">
                <div class="idrp-summary-end idrp-summary-start" [class.idrp-summary-end-next]="picking() === 'start'">
                    <span class="idrp-summary-label">{{ labels().startHint }}</span>
                    <span class="idrp-summary-value">{{ startText() }}</span>
                </div>
                <span class="idrp-summary-span">{{ nightsText() }}</span>
                <div class="idrp-summary-end idrp-summary-finish" [class.idrp-summary-end-next]="picking() === 'end'">
                    <span class="idrp-summary-label">{{ labels().endHint }}</span>
                    <span class="idrp-summary-value">{{ endText() }}</span>
                </div>
            </div>
        }

        <ion-datetime
            class="idrp-datetime"
            presentation="date"
            size="cover"
            [multiple]="true"
            [value]="selectedDays()"
            [locale]="locale()"
            [min]="minIso()"
            [max]="maxIso()"
            [firstDayOfWeek]="firstDayOfWeek() ?? 1"
            [isDateEnabled]="dayFilter()"
            [showDefaultTitle]="false"
            [showDefaultButtons]="false"
            [disabled]="disabled()"
            (ionChange)="onDatetimeChange($event)"
        ></ion-datetime>

        <!-- The buttons sit beside the datetime, not in its "buttons" slot. Slotting them puts it
             into staged mode, where a tap only moves its internal working parts and ionChange waits
             for confirm() - and a range has to know about every tap as it happens. The row mirrors
             the one Ionic renders there: cancel on one side, clear and confirm on the other. -->
        @if (showButtons()) {
            <div class="idrp-actions">
                <ion-buttons>
                    <ion-button class="idrp-button-cancel" (click)="cancelled.emit()">{{ labels().cancel }}</ion-button>
                </ion-buttons>
                <ion-buttons>
                    <ion-button class="idrp-button-clear" color="medium" [disabled]="disabled() || !hasSelection()" (click)="clear()">{{ labels().clear }}</ion-button>
                    <ion-button class="idrp-button-apply" strong="true" [disabled]="!rangeIsComplete()" (click)="apply()">{{ labels().apply }}</ion-button>
                </ion-buttons>
            </div>
        }
    `,
    styles: [
        `
            .idrp-calendar-host {
                display: block;
            }

            /* The calendar itself is left to Ionic, with one correction: a selected day that
               happens to be today is drawn differently from the rest of the selection (solid fill
               against a 20% tint), which reads as two colours inside one range. The day button
               exposes a CSS part, so every selected day is given the same fill from out here. */
            .idrp-calendar-host .idrp-datetime {
                --background: transparent;

                width: 100%;
                border: 0;
                box-shadow: none;
            }

            .idrp-calendar-host .idrp-datetime::part(calendar-day active) {
                background: var(--idrp-range-background, var(--ion-color-primary, #0054e9));
                color: var(--idrp-range-color, var(--ion-color-primary-contrast, #fff));
                font-weight: 600;
            }

            /* Header: the two ends in the top corners, the length of the range between them —
               the same shape the grid below draws. Paddings and type follow ion-datetime's own per
               mode, so the start date sits exactly above the month title. */
            .idrp-calendar-host .idrp-summary {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                column-gap: 0.75rem;
                padding: 14px 16px 12px;
                border-bottom: 0.55px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.13));
            }

            .md .idrp-calendar-host .idrp-summary {
                padding-inline: 20px;
            }

            .idrp-calendar-host .idrp-summary-end {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
            }

            .idrp-calendar-host .idrp-summary-finish {
                text-align: end;
            }

            .idrp-calendar-host .idrp-summary-label {
                font-size: 0.75rem;
                font-weight: 500;
                letter-spacing: 0.02em;
                line-height: 1.1;
                color: var(--ion-color-step-500, var(--ion-color-medium, #8c8c8c));
            }

            .md .idrp-calendar-host .idrp-summary-label {
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }

            .idrp-calendar-host .idrp-summary-value {
                font-size: 1.0625rem;
                font-weight: 600;
                font-variant-numeric: tabular-nums;
                line-height: 1.2;
                color: var(--ion-text-color, #000);
            }

            /* The end the next tap will set. The only colour in the header, and it is information:
               it says which of the two the calendar is waiting for. */
            .idrp-calendar-host .idrp-summary-end-next .idrp-summary-label,
            .idrp-calendar-host .idrp-summary-end-next .idrp-summary-value {
                color: var(--ion-color-primary, #0054e9);
            }

            .idrp-calendar-host .idrp-summary-span {
                font-size: 0.75rem;
                color: var(--ion-color-step-500, var(--ion-color-medium, #8c8c8c));
                white-space: nowrap;
            }

            .idrp-calendar-host .idrp-actions {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 4px 8px 8px;
            }

            .md .idrp-calendar-host .idrp-actions {
                padding: 4px 12px 12px;
            }
        `
    ]
})
export class IonicDateRangeCalendar {
    /** The selected range. Two-way: a tap writes back here. */
    readonly value = model<DateRange>(EMPTY_RANGE);

    readonly min = input<Date | null>(null);
    readonly max = input<Date | null>(null);
    /** Shortest allowed range, in inclusive days. */
    readonly minDays = input(0, { transform: numberAttribute });
    /** Longest allowed range, in inclusive days. */
    readonly maxDays = input(0, { transform: numberAttribute });

    readonly locale = input<string>(typeof navigator === 'undefined' ? 'en' : navigator.language);
    /** `0` = Sunday. `ion-datetime` defaults to Monday when nothing is given. */
    readonly firstDayOfWeek = input<number | null>(null);
    readonly disabled = input(false, { transform: booleanAttribute });
    /** Days the host vetoes — holidays, days already booked. Called once per rendered day. */
    readonly isDateEnabled = input<((date: Date) => boolean) | null>(null);
    readonly labels = input<DateRangeLabels>(DEFAULT_LABELS);
    /** Date pattern for the summary line. Defaults to the locale's own. */
    readonly format = input<string | undefined>(undefined);

    /** The header, carrying the title and the summary of what is picked so far. */
    readonly showTitle = input(true, { transform: booleanAttribute });
    /** The Clear / Cancel / Apply row in the footer. */
    readonly showButtons = input(true, { transform: booleanAttribute });

    /** Fires when a tap completes a range, i.e. when both ends are known. */
    readonly rangeComplete = output<DateRange>();
    /** The Apply button. */
    readonly applied = output<DateRange>();
    /** The Cancel button. */
    readonly cancelled = output<void>();

    protected readonly hasSelection = computed(() => this.value().start !== null);
    protected readonly rangeIsComplete = computed(() => isComplete(this.value()));
    protected readonly minIso = computed(() => (this.min() ? toIsoDay(this.min()!) : undefined));
    protected readonly maxIso = computed(() => (this.max() ? toIsoDay(this.max()!) : undefined));

    /**
     * Every day the range covers, which is what `ion-datetime` paints as selected. A range is not a
     * concept it has; a list of days is, and it draws one the way it draws any other selection.
     */
    protected readonly selectedDays = computed(() => {
        const { start, end } = this.value();
        if (!start) {
            return [];
        }
        if (!end) {
            return [toIsoDay(start)];
        }
        const days: string[] = [];
        for (let cursor = start; compareDay(cursor, end) <= 0; cursor = addDays(cursor, 1)) {
            days.push(toIsoDay(cursor));
        }
        return days;
    });

    /**
     * Which days can be tapped. Rebuilt whenever the pending selection or a constraint changes, so
     * `ion-datetime` gets a new function reference and re-runs it over the grid.
     */
    protected readonly dayFilter = computed(() => {
        const pending = this.value();
        const constraints = {
            min: this.min(),
            max: this.max(),
            minDays: this.minDays() || null,
            maxDays: this.maxDays() || null,
            isDisabled: this.isDateEnabled() ? (date: Date) => !this.isDateEnabled()!(date) : undefined
        };
        return (iso: string) => {
            const date = fromIsoDay(iso);
            return date ? isDaySelectable(date, pending, constraints) : false;
        };
    });

    /**
     * The header is this component's own rather than `ion-datetime`'s: its title line holds one
     * string, and a range reads as two labelled ends and a length. The end the next tap will set is
     * marked, which is what tells the user where they are in the two-tap sequence.
     */
    private readonly pattern = computed(() => this.format() ?? localeDatePattern(this.locale()));

    protected readonly picking = computed<'start' | 'end' | null>(() => {
        const { start, end } = this.value();
        if (!start) {
            return 'start';
        }
        // A complete range highlights neither end: there is nothing outstanding to point at.
        return end ? null : 'end';
    });

    protected readonly startText = computed(() => {
        const { start } = this.value();
        return start ? formatDate(start, this.pattern(), this.locale()) : '—';
    });

    protected readonly endText = computed(() => {
        const { end } = this.value();
        return end ? formatDate(end, this.pattern(), this.locale()) : '—';
    });

    protected readonly nightsText = computed(() => {
        const range = this.value();
        return isComplete(range) ? this.labels().nights.replace('{nights}', String(nightsCount(range))) : '';
    });

    clear(): void {
        if (rangesEqual(this.value(), EMPTY_RANGE)) {
            return;
        }
        this.value.set(EMPTY_RANGE);
    }

    protected apply(): void {
        if (isComplete(this.value())) {
            this.applied.emit(this.value());
        }
    }

    /**
     * A tap in multiple-date mode arrives as the whole list of selected days, so the day the user
     * actually touched is the one that differs from what we put there — added when they tapped a
     * free day, removed when they tapped one already inside the range.
     */
    protected onDatetimeChange(event: Event): void {
        if (this.disabled()) {
            return;
        }
        const detail = (event as CustomEvent<{ value?: string | string[] | null }>).detail;
        const incoming = Array.isArray(detail?.value) ? detail.value : detail?.value ? [detail.value] : [];
        const current = this.selectedDays();
        if (incoming.length === current.length && incoming.every((day, index) => day === current[index])) {
            return;
        }
        const currentSet = new Set(current);
        const incomingSet = new Set(incoming);
        const touched = incoming.find((day) => !currentSet.has(day)) ?? current.find((day) => !incomingSet.has(day));
        const date = touched ? fromIsoDay(touched) : null;
        if (!date) {
            return;
        }
        const next = nextSelection(this.value(), startOfDay(date));
        this.value.set(next);
        if (next.start && next.end) {
            this.rangeComplete.emit(next);
        }
    }
}
