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

Because both run fully in the browser, GitHub Pages (static hosting, no backend)
is a natural fit and gives a strong privacy story: the PDF stays local, and
"export" simply generates a new PDF blob for download.

## 3. Tech stack

| Concern     | Choice                                             |
| ----------- | -------------------------------------------------- |
| Language    | Plain JavaScript (ES modules) — no TypeScript      |
| Dev / build | Vite                                               |
| UI          | Lit web components (plain-JS `static properties`)  |
| Shared state| `@lit/context` + a Reactive Controller             |
| Render      | PDF.js (`pdfjs-dist`) — current page → `<canvas>`  |
| Export      | pdf-lib — draw text into original bytes, save      |
| Tests       | Vitest (pure-core unit tests)                      |
| Hosting     | GitHub Pages via GitHub Actions                    |

## 4. Architecture — three layers

```
<pdf-editor>  ── provides DocumentStore via @lit/context ──┐
  <editor-toolbar>   open · text tool · size · color · export
  <page-nav>         ◀ prev   page 2 / 8   next ▶
  <pdf-page>                                               │
    ┌───────────────────────────────────────────┐         │
    │ INTERACTION overlay (absolutely-positioned  │  ← <text-box> components
    │   <text-box> elements, contenteditable)     │         │
    ├───────────────────────────────────────────┤         │
    │ RENDER <canvas>  (PDF.js draws current page)│  ← imperative, stable node
    └───────────────────────────────────────────┘         │
  original pdfBytes (Uint8Array, kept for export) ─────────┘
```

- **Render layer:** PDF.js draws the current page to a `<canvas>`.
- **Interaction layer:** an absolutely-positioned overlay hosts `<text-box>`
  components; the browser provides caret/selection/typing natively.
- **State/document layer:** a framework-free store holds all document state; the
  original bytes are retained for export.

Core (non-view) logic is separated from components so it is unit-testable without
a DOM.

## 5. State model and store

State lives in a plain, framework-free store — **not** in any component. This
avoids a god-component and keeps components as thin views.

```
DocumentStore state = {
  pdfBytes,        // Uint8Array — original file, reused on export
  pdfDoc,          // PDF.js document (for rendering)
  pageCount,
  currentPage,     // 1-based
  scale,           // fit-to-width render scale
  textBoxes: [ TextBox ],   // across ALL pages
  selectedId,
}

TextBox = { id, page, xPt, yPt, text, fontSizePt, color }
```

**Key decision:** each box's position is stored in **PDF points** (bottom-left
origin, zoom-independent) as the single source of truth. Screen pixels are
derived for display via the current render scale; export needs no extra math.
A box is rendered only when `box.page === currentPage`.

### Store composition

- **`core/document-store.js`** — a plain JS class holding state and exposing
  intent-methods: `openDocument(bytes)`, `setPage(n)`, `addTextBox(pt, defaults)`,
  `moveTextBox(id, pt)`, `editText(id, text)`, `setStyle(id, {fontSizePt, color})`,
  `deleteTextBox(id)`, `select(id)`, plus `subscribe(listener)` returning an
  unsubscribe function. Zero Lit, zero DOM → tested directly with real objects
  (no mocks). Exported as a class so tests build isolated instances.
- **`core/store-context.js`** — `export const storeContext = createContext(...)`.
- **`core/store-controller.js`** — a `ReactiveController` that both *consumes* the
  store from context and *subscribes* to its changes
  (`store.subscribe(() => host.requestUpdate())`), detaching in
  `hostDisconnected()`. Each component does `this.store = new StoreController(this)`
  and reads/calls the store through it.
- **`<pdf-editor>`** creates the `DocumentStore` and provides it through a
  `ContextProvider`. It contains no state itself — just layout and composition.

## 6. Core modules (`src/core/`, pure and tested)

- **`coords.js`** — screen ↔ PDF-point transforms. Built on PDF.js's own
  `viewport.convertToPdfPoint()` / `convertToViewportPoint()` (handles scale and
  rotation correctly), plus a **baseline offset**: pdf-lib's `drawText` anchors
  text at the baseline (bottom-left origin), while a DOM text box is positioned by
  its top-left. `coords.js` centralizes the font-ascent offset so a box's
  on-screen position matches the exported position. This module is the heart of
  "text lands where you put it."
- **`exporter.js`** — takes `pdfBytes` + `textBoxes`, loads with pdf-lib, embeds
  Helvetica, draws each box on its target page (splitting multi-line text with a
  line-height offset), converts the hex color to `rgb()`, returns the new PDF
  bytes.
- **`document-store.js`** — state + intent-methods + subscribe (see §5).
- **`pdf-loader.js`** — thin PDF.js wrapper: load a document from bytes, render a
  page to a canvas at a given scale, compute fit-to-width scale from a container
  width.

## 7. Components (`src/components/`, one component per file)

- **`pdf-editor.js`** — app shell; creates and provides the store via context;
  composes toolbar, nav, and page. No state of its own.
- **`editor-toolbar.js`** — Open file · Text-tool toggle · font-size input ·
  color picker · Export. Size/color apply to the selected box and set defaults
  for new boxes.
- **`pdf-page.js`** — renders the current page to a **stable** canvas node
  (imperatively, via ref/query, so reactive re-render never recreates it), hosts
  the overlay, and maps a click (when the text tool is active) to a PDF point to
  create a new box.
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
- The PDF `<canvas>` lives in a stable node and is drawn imperatively; reactive
  re-render never recreates it (gotcha #1).
- Children call store methods or dispatch semantic `CustomEvent`s; `composed: true`
  only when an event must cross a shadow boundary.
- Scoped styles via `static styles = css\`…\``; theming via CSS custom properties /
  `::part()` where a parent must style a child.
- Cross-cutting concerns (store subscription, later a drag controller) are
  Reactive Controllers, never tangled into `render()`.
- Accessibility: real `<button>`s, labeled inputs, keyboard support (Delete
  removes the selected box, Escape deselects).
- Small, single-purpose components: one component per file, view logic only;
  everything non-view lives in `core/`.
- Controllers detach listeners in `hostDisconnected()`.

## 8. Coordinate transform (the core logic)

- **Screen → PDF point** (on create/move): use the page's PDF.js `viewport`
  (`page.getViewport({ scale })`) and `viewport.convertToPdfPoint(x, y)`, wrapped
  in `coords.js` for testability.
- **PDF point → screen** (on render): `viewport.convertToViewportPoint(xPt, yPt)`
  to position each `<text-box>` over the canvas.
- **Baseline offset:** display positions a box by its top-left; pdf-lib draws from
  the baseline. `coords.js` applies a consistent font-ascent offset so display and
  export agree.
- MVP assumes page rotation is handled by the viewport methods; no manual rotation
  math.

## 9. Rendering flow (`<pdf-page>`)

1. On page change or container resize, compute a fit-to-width `scale` and the
   page `viewport` at that scale.
2. Render the page imperatively into the stable canvas node at that scale.
3. Size the overlay to match the canvas; render `<text-box>` elements for
   `currentPage`, each positioned via `coords.pdfToScreen`.

## 10. Interaction model

- **Add:** with the Text tool active, clicking empty page area creates a box at
  that point (converted to PDF points), selects it, and focuses it for typing.
- **Edit:** typing in a selected box updates its text in the store.
- **Move:** dragging a box updates its point position in the store.
- **Style:** the toolbar's font-size/color apply to the selected box and become
  defaults for new boxes.
- **Delete/deselect:** ✕ button or Delete key removes the selected box; Escape
  deselects.

## 11. Export flow (`exporter.js`)

`Export` → load `pdfBytes` with pdf-lib → embed Helvetica → for each `TextBox`:
`page.drawText(text, { x: xPt, y: yPt, size: fontSizePt, color })` (multi-line
split by newline with line-height offset) → `save()` → Blob → download as
`<original-name>-edited.pdf`. Because positions are already in points, export
needs no scale math.

## 12. Project structure

```
pdf-editor/
├─ index.html
├─ vite.config.js              # base: '/pdf-editor/'
├─ package.json
├─ src/
│  ├─ main.js                  # imports components, mounts <pdf-editor>
│  ├─ components/
│  │  ├─ pdf-editor.js
│  │  ├─ editor-toolbar.js
│  │  ├─ pdf-page.js
│  │  ├─ text-box.js
│  │  └─ page-nav.js
│  └─ core/
│     ├─ pdf-loader.js
│     ├─ coords.js
│     ├─ exporter.js
│     ├─ document-store.js
│     ├─ store-context.js
│     └─ store-controller.js
├─ test/
│  ├─ coords.test.js
│  ├─ exporter.test.js
│  └─ document-store.test.js
└─ .github/workflows/deploy.yml
```

## 13. Testing strategy

Focus tests on the **pure core** (highest value, no mocking — matches the code
style): real objects and real fixtures, single focused asserts.

- **`coords`** — screen↔PDF round-trips and the baseline offset.
- **`exporter`** — against a real small PDF fixture, assert the exported PDF
  contains the expected text at the expected position (re-parse with pdf-lib or
  extract text with PDF.js).
- **`document-store`** — add/move/edit/style/delete/select transitions.

Component/DOM tests are kept minimal for the MVP; the pure core carries the
coverage.

## 14. Deployment (GitHub Pages)

- `vite.config.js` sets `base: '/pdf-editor/'` (repo name) so asset URLs resolve
  under the Pages path.
- GitHub Actions: on push to `main` → `npm ci` → `npm run build` → deploy `dist/`
  with `actions/deploy-pages`.
- The PDF.js worker is wired via a Vite `?url` import
  (`import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`;
  `GlobalWorkerOptions.workerSrc = workerSrc`) so it resolves correctly on Pages.

## 15. Known gotchas / risks

1. **Reactive re-render vs. live canvas & caret** — mitigated by an imperative,
   stable canvas node and `repeat()`-keyed text boxes.
2. **Shadow DOM + absolute positioning** — the page container is the positioning
   context; overlay boxes are absolutely positioned within it.
3. **Baseline vs. top-left anchoring** — centralized in `coords.js` so display and
   export stay consistent.
4. **PDF.js worker path on GitHub Pages** — handled by the Vite `?url` import.

## 16. Future / fast-follow (not in v1)

Undo/redo (cheap now that state is centralized), zoom controls, additional font
families and bold/italic, more overlay tools (shapes, images, signatures),
persistence across refresh, continuous-scroll multi-page view.
