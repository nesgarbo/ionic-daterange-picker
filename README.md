# ionic-daterange-picker

A date range picker with the feature set of Syncfusion's `ejs-daterangepicker`, made of nothing but
Ionic components.

The calendar is a real `ion-datetime` — the same grid, month/year drill-down, navigation, keyboard
handling and locale the app already shows for a single date. The field is an `ion-input`, the dialog
is an `ion-modal`, the shortcuts are `ion-chip`s. A theme that restyles Ionic —
`@rdlabo/ionic-theme-md3`, `@rdlabo/ionic-theme-ios26` — therefore restyles this picker without
knowing it exists, because there is nothing in it that is not theirs already.

What it adds on top of `ion-datetime` is the range: which day a tap starts, extends or restarts, a
header with the two ends in its top corners and the length of the range between them, and the
Clear / Cancel / Apply row. While a range is half picked, the end the next tap will set is the one
in the accent colour.

Angular 20+, signals throughout, zoneless-safe, `ControlValueAccessor` included.

## Status

`1.0.0`.

## Install

```bash
npm install ionic-daterange-picker
# or
bun add ionic-daterange-picker
```

### Working against a local checkout

While developing the picker itself, a consuming app points at the built `dist/` directly:

```bash
cd ionic-daterange-picker
bun install
bun run build          # emits dist/
```

```jsonc
// the app's package.json
"dependencies": {
  "ionic-daterange-picker": "file:../../ionic-daterange-picker/dist"
}
```

A `file:` dependency survives `bun install`; `bun link` does not — an install with the package
missing from `package.json` prunes the symlink and the app stops compiling. bun links the built
files one by one, so `bun run watch` is enough for a change to reach the app, but a *new* file in
`dist/` needs another `bun install`.

The app also needs `preserveSymlinks: true` in its `angular.json` build options. Without it esbuild
resolves past the symlink, the Angular Linker never processes the partially-compiled library, and it
fails at runtime asking for the JIT compiler.

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/forms`, `@ionic/angular`,
`ionicons`.

## Quick start

With a reactive form — the control value is `[startDate, endDate]`, exactly what Syncfusion
published, so an existing `formControlName` needs no other change:

```ts
import { IonicDateRangePicker } from 'ionic-daterange-picker';

@Component({
    imports: [ReactiveFormsModule, IonicDateRangePicker],
    template: `<ionic-daterange-picker formControlName="fromTo" [openOnFocus]="true" />`
})
```

With signals and no form:

```html
<ionic-daterange-picker [(value)]="range" [min]="today()" [maxDays]="30" (change)="onChange($event)" />
```

Inline, with no field (a filter panel, a wizard step):

```html
<ionic-daterange-picker presentation="inline" formControlName="fromTo" />
```

Just the calendar, if you want to build your own surface around it:

```html
<ionic-daterange-calendar [(value)]="range" [showButtons]="false" [min]="today()" />
```

## API

### `<ionic-daterange-picker>`

| Input | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | `Date[] \| {start, end} \| null` | `null` | Two-way. Reads any of those shapes, writes `[start, end]`. |
| `appearance` | `'field' \| 'button'` | `'field'` | `'field'` is an `ion-input` with a label; `'button'` a filled `ion-button` with a calendar icon that reads the range as its text. |
| `buttonColor` | `string` | `'primary'` | The button trigger's Ionic colour. `'light'` reads as a white pill on a coloured hero. |
| `label`, `labelPlacement`, `fill`, `placeholder`, `helperText`, `errorText` | — | — | Passed straight to the `ion-input`. |
| `min` / `max` | `Date \| null` | `null` | Bounds; days outside are disabled and navigation stops there. |
| `minDays` / `maxDays` | `number` | `0` (off) | Inclusive span limits, enforced *while* picking. |
| `presentation` | `'auto' \| 'popover' \| 'modal' \| 'inline'` | `'auto'` | `'auto'` and `'modal'` are a centred dialog over a dimmed backdrop; `'popover'` anchors to the field; `'inline'` has no field at all. |
| `autoApply` | `boolean` | `false` | Commit and close on the second tap, instead of waiting for Apply. |
| `allowEdit` | `boolean` | `false` | Typing into the field, parsed against `format`. |
| `openOnFocus` | `boolean` | `false` | Opens on keyboard focus too. Focus restored by a closing overlay is ignored, or Cancel would reopen what it just closed. |
| `clearable` | `boolean` | `true` | Shows the clear button when there is a value. |
| `presets` | `DateRangePreset[] \| null` | `null` | `defaultPresets(labels)` gives the usual seven. |
| `format` | `string` | locale pattern | Tokens: `yyyy yy MMMM MMM MM M dd d EEEE EEE`. |
| `locale` | `string` | `navigator.language` | Drives names, first weekday and the default pattern. |
| `firstDayOfWeek` | `number \| null` | from locale | `0` = Sunday. |
| `isDateEnabled` | `(date: Date) => boolean` | `null` | Vetoes days — holidays, days already booked. Syncfusion's `renderDayCell` role. |
| `showTitle` | `boolean` | `true` | The header with the summary line. |
| `labels` | `Partial<DateRangeLabels>` | English | All user-facing text. |
| `disabled` | `boolean` | `false` | Also set by `setDisabledState` from a form. |

| Output | Payload |
| --- | --- |
| `change` | `{ value, startDate, endDate, daysCount, nightsCount, source }` |
| `opened` / `closed` | `void` |
| `valueChange` | `Date[] \| null` (the two-way half of `value`) |

Methods: `open()`, `apply()`, `cancel()`, `clear()`.

### `<ionic-daterange-calendar>`

The calendar on its own, with no field around it: `value` (two-way), `min`, `max`, `minDays`,
`maxDays`, `locale`, `firstDayOfWeek`, `isDateEnabled`, `labels`, `format`, `disabled`, `showTitle`,
`showButtons`, plus the `rangeComplete`, `applied` and `cancelled` outputs.

### App-wide defaults

```ts
import { provideIonicDateRangePicker, defaultPresets } from 'ionic-daterange-picker';

providers: [
    provideIonicDateRangePicker({
        locale: 'es',
        format: 'dd/MM/yyyy',
        openOnFocus: true,
        presets: defaultPresets({ today: 'Hoy', last7Days: 'Últimos 7 días' }),
        labels: { apply: 'Aplicar', cancel: 'Cancelar', clear: 'Limpiar', title: 'Selecciona fechas' }
    })
]
```

Anything bound on an individual picker still wins over these.

## Theming

There is almost nothing to theme. The calendar is an `ion-datetime`, the dialog an `ion-modal`, the
field an `ion-input`: whatever styles those in your app styles them here, `@rdlabo/ionic-theme-md3`
and `@rdlabo/ionic-theme-ios26` included.

Two knobs for the parts that are this component's own:

- `--idrp-dialog-background` — the dialog surface. Set explicitly rather than inherited because a
  theme may make a modal that contains a calendar transparent, on the assumption that the calendar
  is itself the card. Here the card also holds the header and the buttons. In iOS mode the dialog
  instead takes the glass treatment, built from the variables `@rdlabo/ionic-theme-ios26` defines.
- `--idrp-range-background` / `--idrp-range-color` — every day of the range, painted through
  `ion-datetime`'s `calendar-day active` CSS part. They exist because Ionic draws a selected day
  that happens to be *today* differently from the rest, which reads as two colours inside one
  range; this makes the whole range one colour. Set the background to a tint if you prefer a band
  with no emphasis.
- Class hooks: `.idrp-host`, `.idrp-trigger`, `.idrp-trigger-button`, `.idrp-input`, `.idrp-open`,
  `.idrp-clear`, `.idrp-panel`, `.idrp-presets`, `.idrp-summary`, `.idrp-datetime`, `.idrp-actions`
  and the three `.idrp-button-*`. The components use `ViewEncapsulation.None`, so those work from a
  global stylesheet — but a *page* stylesheet still needs `::ng-deep`, because the elements belong
  to this component's template and carry none of the page's encapsulation attributes.

## Coming from `ejs-daterangepicker`

| Syncfusion | Here |
| --- | --- |
| `<ejs-daterangepicker formControlName="x">` | `<ionic-daterange-picker formControlName="x">` |
| control value `Date[]` | unchanged — `[startDate, endDate]` |
| `[allowEdit]`, `[openOnFocus]`, `[min]`, `[max]`, `[format]`, `[placeholder]` | same names |
| `minDays` / `maxDays` | same names |
| `presets` (`<e-presets>` children) | `[presets]` array of `{ id, label, range }` |
| `renderDayCell` event | `[isDateEnabled]` function |
| `(change)` → `RangeEventArgs` | `(change)` → `DateRangeChangeEvent` (`startDate`, `endDate`, `value`, plus `daysCount`/`nightsCount`) |
| `cssClass` | plain `class` |
| `L10n.load(...)` / `loadCldr` | `[labels]` + `locale`, everything else from `Intl` |
| `drp.show()` | `pickerRef.open()` |

Not carried over, because `ion-datetime` does not do them: two months side by side, an ISO week
column, and the hover preview of the range before the second click. Also gone: time selection
(`ejs-datetimepicker` territory), `strictMode`, and the float-label animation — `ion-input`'s own
label placement replaces it.

## Accessibility

Ionic's, unchanged: `ion-datetime` implements the WAI-ARIA date-grid pattern, and the range is
built out of its own selection, so a screen reader reads the calendar exactly as it does anywhere
else in the app.

## Development

```bash
bun run build       # ng-packagr → dist/
bun run watch       # rebuild on change
bun run test        # vitest, pure logic only (no DOM, no TestBed)
bun run typecheck
```

The pure parts — date maths, value coercion, the selection state machine, the format/parse pair —
live in `src/lib/date-range-{date,model,intl}.ts` and are where the tests are. The two components
are thin by design: one wraps `ion-datetime` with range logic, the other wraps that with a field and
a dialog.

## Releasing

The package that goes to npm is the **built** one, `dist/`, not the repository root: the root
`package.json` is the source manifest, and ng-packagr rewrites it — resolving the entry points,
dropping the scripts and the devDependencies — into `dist/package.json`.

```bash
bun run test
bun run build
npm pack --dry-run ./dist   # what will actually be uploaded
npm login                   # once
bun run release             # build + npm publish ./dist
```

Bump `version` in the root `package.json`, tag it (`git tag -a v1.0.1 -m v1.0.1 && git push --tags`)
and publish from a clean tree, so the tag and the version on npm say the same thing.
