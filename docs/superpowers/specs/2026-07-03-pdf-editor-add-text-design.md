# PDF Editor — "Add Text" MVP — Design

- **Date:** 2026-07-03
- **Status:** Approved (design), pending implementation plan
- **Author:** brainstormed with lkmliz

## 1. Overview

A web-based PDF editor, in the spirit of existing paid tools, deployed as a
static site on GitHub Pages. The first feature is **adding text** to an existing
PDF.

The app runs entirely in the browser. The user opens a PDF from disk, places
text boxes on top of any page, edits/moves/deletes them, and exports a new PDF.
The original file never leaves the user's machine.

### Goals

- Open a local PDF and view it one page at a time.
- Add text boxes anywhere on a page; set font size and color; move, edit, delete.
- Export a new PDF with the added text baked into the real page content
  (vectors/text preserved, not rasterized).
- Deploy as a static SPA to GitHub Pages.

### Non-goals (v1)

Editing the original/existing text, zoom controls, continuous scroll, shapes /
images / signatures / highlight / whiteout, persistence across refresh, multiple
font families or bold/italic, mobile-touch tuning, undo/redo.

## 2. Background — how PDF editing works

A PDF describes the final appearance of a page as absolutely-positioned drawing
commands (glyphs, vectors, images), not as reflowable structure like a word
processor. There are two distinct things people call "editing a PDF":

1. **True content editing** — reverse-engineering the drawing commands back into
   editable text runs and rewriting them. Complex and imperfect. **Out of scope.**
2. **Overlay / annotation editing** — leaving the original page untouched and
   placing *new* content on top of it. This is what web-based editors do and
   what "add text" is. **This is our approach.**

The overlay approach uses two libraries with opposite jobs:

- **PDF.js** *renders* a page for viewing (read-only display to a canvas).
- **pdf-lib** *modifies and writes* PDFs — it loads the original bytes, draws new
  text onto the real page objects, and serializes back to PDF bytes without
  rasterizing the original.

Both run fully in the browser, so GitHub Pages (static hosting, no backend) is a
natural fit and gives a strong privacy story: the PDF stays local, and "export"
simply generates a new PDF blob for download.

## 3. Architecture — ports & adapters (hexagonal)

The domain never talks to PDF.js or pdf-lib directly. Instead it defines two
**ports** (contracts describing what the app needs), and each third-party library
is wrapped by an **adapter** that implements a port. Dependencies point inward:
the core depends on nothing; adapters depend only on their library; the UI depends
on the core; and only the composition root knows the concrete adapters.

```
            ┌──────────────────────────────────────────┐
            │              apps/web                      │
            │        (composition root, Vite)            │
            │  builds adapters, injects into store,      │
            │  mounts <pdf-editor>, deploys to Pages     │
            └───────┬───────────┬───────────┬───────────┘
                    │ injects   │ injects   │ renders
        ┌───────────▼──┐   ┌────▼─────────┐ │
        │ @pdf-editor/ │   │ @pdf-editor/ │ │
        │  pdf-reader  │   │  pdf-writer  │ │
        │ (pdf.js)     │   │ (pdf-lib)    │ │
        │ implements   │   │ implements   │ │
        │ PdfRenderer  │   │ PdfExporter  │ │
        └───────┬──────┘   └──────┬───────┘ │
                │  port            │  port   │
                ▼  contracts       ▼         ▼
            ┌──────────────────────────┐  ┌───────────────────────┐
            │     @pdf-editor/core      │◄─┤  @pdf-editor/components│
            │ DocumentStore · model ·   │  │ Lit web components +   │
            │ ports (PdfRenderer,       │  │ store-context +        │
            │ PdfExporter contracts)    │  │ store-controller       │
            │ (no Lit, no pdf libs)     │  │ (depends on core)      │
            └──────────────────────────┘  └───────────────────────┘
```

### Layer responsibilities

- **Render (view):** PDF.js draws the current page to a `<canvas>`, behind the
  `PdfRenderer` port.
- **Interaction:** an absolutely-positioned overlay hosts `<text-box>`
  components; the browser provides caret/selection/typing natively.
- **State/application:** a framework-free `DocumentStore` holds all document
  state and orchestrates the ports; the original bytes are retained for export.
- **Write (export):** pdf-lib bakes text into the original bytes, behind the
  `PdfExporter` port.

## 4. Monorepo layout (npm workspaces)

```
pdf-editor/                         # monorepo root
├─ package.json                     # { "workspaces": ["apps/*", "packages/*"] }, root scripts
├─ vitest.config.js                 # runs tests across workspaces
├─ .github/workflows/deploy.yml     # build apps/web, deploy to Pages
├─ docs/superpowers/specs/…
├─ apps/
│  └─ web/                          # deployable app (private, not published)
│     ├─ index.html
│     ├─ vite.config.js             # base: '/pdf-editor/'
│     ├─ package.json               # deps: all @pdf-editor/* packages
│     └─ src/main.js                # composition root: build adapters + store, mount app
└─ packages/
   ├─ core/
   │  ├─ package.json               # name: @pdf-editor/core ; deps: none
   │  ├─ src/
   │  │  ├─ index.js                # public exports
   │  │  ├─ document-store.js       # state + intent methods + subscribe; injected ports
   │  │  ├─ model.js                # TextBox factory + typedef
   │  │  └─ ports/
   │  │     ├─ pdf-renderer.js      # PdfRenderer / PdfDocument / PdfPage / RenderedPage typedefs
   │  │     └─ pdf-exporter.js      # PdfExporter typedef
   │  └─ test/document-store.test.js  # fake adapters (stubs)
   ├─ pdf-reader/
   │  ├─ package.json               # name: @pdf-editor/pdf-reader ; deps: pdfjs-dist
   │  ├─ src/index.js               # createPdfReader() : PdfRenderer
   │  └─ test/pdf-reader.test.js    # integration: real pdf.js + PDF fixture
   ├─ pdf-writer/
   │  ├─ package.json               # name: @pdf-editor/pdf-writer ; deps: pdf-lib
   │  ├─ src/index.js               # createPdfWriter() : PdfExporter
   │  └─ test/pdf-writer.test.js    # integration: real pdf-lib + PDF fixture
   └─ components/
      ├─ package.json               # name: @pdf-editor/components ; deps: lit, @lit/context, @pdf-editor/core
      └─ src/
         ├─ index.js                # imports/registers all components
         ├─ pdf-editor.js
         ├─ editor-toolbar.js
         ├─ pdf-page.js
         ├─ text-box.js
         ├─ page-nav.js
         ├─ store-context.js        # createContext(store)
         └─ store-controller.js     # ReactiveController: consume context + subscribe
```

**No per-package build step.** Packages ship ES-module source; their
`package.json` `exports` points at `src/index.js`. Vite (in `apps/web`) resolves
`@pdf-editor/*` to workspace source and bundles everything at the app level. If we
ever publish to npm, we add build steps then (YAGNI now).

## 5. Ports (contracts) — `@pdf-editor/core/src/ports/`

Ports are plain-JS contracts documented with JSDoc typedefs (no runtime code).
Adapters conform structurally; the domain and UI program against these shapes.

### `PdfRenderer` (implemented by `@pdf-editor/pdf-reader`)

```
loadDocument(bytes: Uint8Array) : Promise<PdfDocument>

PdfDocument = {
  pageCount: number,
  getPage(pageNumber /* 1-based */) : Promise<PdfPage>,
}

PdfPage = {
  widthPt: number,
  heightPt: number,
  renderTo(canvas: HTMLCanvasElement, scale: number) : Promise<RenderedPage>,
}

RenderedPage = {                     // a page rendered at a specific scale
  widthPx: number,
  heightPx: number,
  screenToPdf({ x, y })  : { xPt, yPt },
  pdfToScreen({ xPt, yPt }) : { x, y },
}
```

The renderer owns coordinate conversion (it holds the PDF.js viewport), so the
domain and components never do viewport math. `RenderedPage` captures the
scale-specific conversions produced by one render.

### `PdfExporter` (implemented by `@pdf-editor/pdf-writer`)

```
exportPdf(originalBytes: Uint8Array, textBoxes: TextBox[]) : Promise<Uint8Array>
```

Given the original bytes and the boxes, it returns new PDF bytes with the text
drawn into the real pages.

## 6. Domain — `@pdf-editor/core`

State lives in a plain store — **not** in any component — so there is no
god-component and the core is pure and testable.

```
DocumentStore state = {
  pdfBytes,        // Uint8Array — original file, reused on export
  document,        // PdfDocument (port object) for the open file
  pageCount,
  currentPage,     // 1-based
  textBoxes: [ TextBox ],   // across ALL pages
  selectedId,
}

TextBox = { id, page, xPt, yPt, text, fontSizePt, color }
```

- **`document-store.js`** — receives the ports by injection
  (`new DocumentStore({ renderer, exporter })`). Exposes intent-methods:
  `openDocument(bytes)` (uses `renderer.loadDocument`), `setPage(n)`,
  `addTextBox({ page, xPt, yPt }, defaults)`, `moveTextBox(id, { xPt, yPt })`,
  `editText(id, text)`, `setStyle(id, { fontSizePt, color })`,
  `deleteTextBox(id)`, `select(id)`, `exportPdf()` (uses
  `exporter.exportPdf(pdfBytes, textBoxes)`), and `subscribe(listener)` returning
  an unsubscribe. No Lit, no pdf libs → tested with fake ports (stubs).
- **`model.js`** — `TextBox` factory/typedef; positions stored in **PDF points**
  (bottom-left origin, zoom-independent) as the single source of truth.

**Scale is a view concern, not domain state.** Fit-to-width scale and the current
`RenderedPage` are held locally in `<pdf-page>`, which measures its container.

## 7. Adapters

### `@pdf-editor/pdf-reader` (PDF.js)

`createPdfReader({ workerSrc }) : PdfRenderer`. Wraps `pdfjs-dist`. The worker URL
is passed in by the composition root (keeps the adapter free of Vite-specific
`?url` syntax). Implements `loadDocument`/`getPage`/`renderTo` and builds
`RenderedPage` conversions from the PDF.js `viewport`
(`viewport.convertToPdfPoint` / `convertToViewportPoint`).

### `@pdf-editor/pdf-writer` (pdf-lib)

`createPdfWriter() : PdfExporter`. Wraps `pdf-lib`. On `exportPdf`: load bytes,
embed Helvetica, and for each `TextBox` draw on its page with the **baseline
offset** applied (DOM boxes are positioned by top-left; pdf-lib anchors text at
the baseline — the adapter computes the ascent via the embedded font's metrics so
display and export agree). Handles multi-line text (split on newline, line-height
offset) and hex→`rgb()` color. Returns the new bytes.

## 8. UI — `@pdf-editor/components` (Lit)

Components are thin views. They import the store contract from
`@pdf-editor/core`, read/call it through the controller, and use `RenderedPage`
(a port object) for rendering/conversion — they never import PDF.js or pdf-lib.

- **`store-context.js`** — `export const storeContext = createContext(...)`.
- **`store-controller.js`** — a `ReactiveController` that consumes the store from
  context *and* subscribes to its changes (`store.subscribe(() =>
  host.requestUpdate())`), detaching in `hostDisconnected()`. Each component does
  `this.store = new StoreController(this)`.
- **`pdf-editor.js`** — receives the `DocumentStore` as a property (built by the
  composition root) and provides it via `ContextProvider`; composes toolbar, nav,
  page. No state of its own.
- **`editor-toolbar.js`** — Open file · Text-tool toggle · font-size input ·
  color picker · Export. Size/color apply to the selected box and set defaults
  for new boxes.
- **`pdf-page.js`** — measures its container for a fit-to-width scale; fetches the
  current `PdfPage` and calls `renderTo(canvas, scale)` into a **stable** canvas
  node (imperative, so reactive re-render never recreates it); keeps the resulting
  `RenderedPage` for conversions; maps a click (Text tool active) to a PDF point
  via `renderedPage.screenToPdf` and calls `store.addTextBox`.
- **`text-box.js`** — one `contenteditable` element: drag to move, type to edit,
  ✕ / Delete to remove, click to select. Reads its data from the store.
- **`page-nav.js`** — prev/next + page counter.

### Lit best practices applied

- Public inputs as `static properties`; component-internal fields as
  `state: true` (kept out of the public API).
- `render()` is pure — a function of state only, no side effects.
- Lifecycle for side effects: `firstUpdated()` wires the canvas once;
  `updated(changed)` re-renders the page when `currentPage`/`scale` change;
  `willUpdate()` computes derived values.
- The `<text-box>` list is rendered with the `repeat()` directive keyed by `id`,
  so DOM nodes are reused and the caret/focus survives typing (gotcha #1).
- The PDF `<canvas>` lives in a stable node, drawn imperatively; reactive
  re-render never recreates it (gotcha #1).
- Children call store methods or dispatch semantic `CustomEvent`s; `composed:
  true` only when an event must cross a shadow boundary.
- Scoped styles via `static styles = css\`…\``; theming via CSS custom properties /
  `::part()` where a parent must style a child.
- Cross-cutting concerns (store subscription, later a drag controller) are
  Reactive Controllers, never tangled into `render()`.
- Accessibility: real `<button>`s, labeled inputs, keyboard support (Delete
  removes the selected box, Escape deselects).
- Small, single-purpose components: one component per file, view logic only.
- Controllers detach listeners in `hostDisconnected()`.

## 9. Composition root — `apps/web/src/main.js`

```
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const renderer = createPdfReader({ workerSrc });   // @pdf-editor/pdf-reader
const exporter = createPdfWriter();                // @pdf-editor/pdf-writer
const store    = new DocumentStore({ renderer, exporter });  // @pdf-editor/core

document.querySelector('pdf-editor').store = store; // provided via context
```

Only this file knows the concrete adapters and the Vite-specific worker URL — the
single wiring point of the hexagon.

## 10. Interaction model

- **Add:** with the Text tool active, clicking empty page area creates a box at
  that point (converted to PDF points), selects it, and focuses it for typing.
  The tool then reverts to select mode so the new box can be moved/edited
  immediately (placing another box requires re-activating the Text tool).
- **Edit:** typing in a selected box updates its text in the store.
- **Move:** dragging a box updates its point position in the store.
- **Style:** the toolbar's font-size/color apply to the selected box and become
  defaults for new boxes.
- **Delete/deselect:** ✕ button or Delete key removes the selected box; Escape
  deselects.

## 11. Export flow

`Export` → `store.exportPdf()` → `pdf-writer` loads `pdfBytes`, embeds Helvetica,
draws each `TextBox` on its page (baseline offset, multi-line, color) → returns
new bytes → the toolbar wraps them in a Blob and downloads
`<original-name>-edited.pdf`. Because positions are already in points, export
needs no scale math.

## 12. Testing strategy

Each package owns its tests. Real objects and real fixtures; single, focused
asserts; stubs over mocks (matching the code style).

- **`@pdf-editor/core`** — `document-store.test.js` injects hand-written **fake**
  `PdfRenderer`/`PdfExporter` stubs (plain objects returning canned values). Tests
  add/move/edit/style/delete/select/page-nav and export orchestration without any
  library. No mocking framework.
- **`@pdf-editor/pdf-reader`** — integration against real `pdfjs-dist` + a small
  real PDF fixture: assert `pageCount`, page size, and a `screenToPdf` ↔
  `pdfToScreen` round-trip.
- **`@pdf-editor/pdf-writer`** — integration against real `pdf-lib` + a real
  fixture: export a known `TextBox`, re-parse the output, assert the text is
  present at the expected position (baseline offset correct).
- **`@pdf-editor/components`** — minimal DOM tests kept for the MVP; the pure core
  and adapters carry the coverage.

Root `npm test` runs Vitest across all workspaces.

## 13. Deployment (GitHub Pages)

- `apps/web/vite.config.js` sets `base: '/pdf-editor/'` (repo name) so asset URLs
  resolve under the Pages path.
- GitHub Actions: on push to `main` → `npm ci` (root, installs the whole
  workspace) → `npm run build -w apps/web` → deploy `apps/web/dist/` with
  `actions/deploy-pages`.
- The PDF.js worker URL is produced by Vite's `?url` import in `main.js` and
  injected into `createPdfReader`, so it resolves correctly on Pages.

## 14. Known gotchas / risks

1. **Reactive re-render vs. live canvas & caret** — imperative stable canvas node
   and `repeat()`-keyed text boxes.
2. **Shadow DOM + absolute positioning** — the page container is the positioning
   context; overlay boxes are absolutely positioned within it.
3. **Baseline vs. top-left anchoring** — owned by the `pdf-writer` adapter using
   the embedded font's metrics, so display and export agree.
4. **DOM-vs-PDF font fidelity** — on-screen text uses a browser font while export
   uses pdf-lib's Helvetica; metrics are close but not pixel-identical. Acceptable
   for the MVP.
5. **PDF.js worker path on GitHub Pages** — handled by the Vite `?url` import in
   the composition root.

## 15. Future / fast-follow (not in v1)

Undo/redo (cheap now that state is centralized), zoom controls, additional font
families and bold/italic, more overlay tools (shapes, images, signatures),
persistence across refresh, continuous-scroll multi-page view. New capabilities
generally slot in as new adapters/ports or new components without touching the
core.
