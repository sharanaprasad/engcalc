# EngCalc Console v1.3

A single-page, offline engineering calculator with engineering-notation input,
complex numbers, user variables, a linear-equation solver, a base converter,
and physical constants. Everything runs in one `.html` file.

Open `index.html` (or the hosted page) in any modern browser — Mac, Windows, Linux
or a phone. No install, no network required.

## Features

- **Engineering notation**, case-sensitive: `10p`, `2.2k`, `5MHz`
  (`m` is milli, `M` is mega)
- **Complex numbers**: `3+4j`, `(1+2j)*(3-4j)`, `mag()`, `phase()`,
  `phase_deg()`, `phase_rad()`, polar form `5@30`
- **Variables and user functions**: `x = 1; y = 2; x + y`, `f1(x) = x^2 + 1`
- **Linear-system solver**: 3, 4 or more unknowns, with engineering and
  complex coefficients (`solve 2x+y-z=8; -3x-y+2z=-11; -2x+y+2z=-3`)
- **Base converter tab**: live dec / hex / bin / oct / base-N with bit
  grid, two's complement
- **115+ functions** including trig, hyperbolic, dB/dBm, RF (reflection
  coefficient, VSWR, wavelength, skin depth, Xc/Xl/Zc/Zl, par/ser), ADC/SerDes
  (`enob`, `ktc`, `Vt`, `rj2pp`, `qfactor`, `erfc`, `qfunc`)
- **33 physical constants** in a searchable drawer
- **`expr to directive`** (also `in` or `=>`) forces the display into any suffix / mode / base
  (`5MHz/60us to M`, `255 to hex`)
- **Dark colorful UI**, offline, keyboard-first (↑↓ history, Tab complete,
  Ctrl+K search, Ctrl+L clear)

Type `help` in the console for the full guide.

## Repository layout

```
engcalc_console_v1_3/
├── README.md                        this file
├── engcalc_console_v1_3.html        the calculator (single-file app)
└── tests/
    ├── run_all.sh                   runs every test suite
    ├── engine/                      Node tests of the calculation engine
    │   ├── test_core.js             163 cases — basic parsing, suffixes,
    │   │                            variables, complex, bases
    │   ├── test_extended.js         1077 cases — identities on random
    │   │                            complex points, name rules, bases,
    │   │                            solver, unit parsing
    │   ├── test_format.js           56 cases — the "=> directive" feature
    │   ├── test_audit.js            308 edge cases — parser, formatting,
    │   │                            precedence, implicit mult, bits, solver
    │   └── test_regression.js       48 cases — bugs that have been fixed
    └── ui/                          jsdom-based DOM / UI tests
        ├── test_ui_smoke.js         77 cases — tabs, drawers, buttons,
        │                            keyboard shortcuts
        ├── test_ui_deep.js          22 cases — tab round-trips, converter,
        │                            persistence, ans history
        └── test_ui_format.js        9 cases — "=> directive" in the UI
```

Total: ~1,600 tests across engine and UI.

## Running the tests

Requires Node.js 18+ and `jsdom` for the UI tests.

```bash
cd tests
npm init -y >/dev/null && npm install jsdom
./run_all.sh
```

Or individually:

```bash
node tests/engine/test_core.js
node tests/engine/test_extended.js
# ...etc.
```

Each test prints `all N passed` or lists any failures with the input,
the engine's output, and what was expected.

## Notes

- The calculator stores state (variables, functions, history, settings)
  in the browser's `localStorage`, scoped to the page's origin. Everything
  works offline.
- The HTML file is self-contained — no external scripts or stylesheets.
- Precision is IEEE-754 double (same as Python's float). Big-integer
  base conversions use `BigInt` and are exact.
