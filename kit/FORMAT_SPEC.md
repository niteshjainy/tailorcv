# Resume Format Spec

Goal: use the active reference's supported design properties, with explicit extraction limitations. See `../docs/06-REFERENCE-DESIGN.md`. The values below describe the legacy default template, not mandatory styling for every user. Use the builder scripts instead of drawing PDFs yourself.

Current safeguards: one summary in the master's position; measured horizontal section rules; per-element fonts, bold labels and indents; exact repeated-row spacing inferred from PDF baselines; licensed Charter embedding or font-class-aware fallback. Final saves require critical formatting checks and at least 98% conformance on the explicitly listed style checks. This number is not pixel similarity or overall visual accuracy. Inspect the PNG alongside the master.

## 1. Why this exists
Resumes drawn directly with PDF libraries produced broken ligatures (`(cid:415)`), overlapping lines and wrong fonts. This project builds a Word file and converts it with LibreOffice, so text is real, fonts are embedded and bullets wrap correctly.

## 2. Design Specification
**The single source of truth is `DESIGN_SPEC.json`** — a machine-readable file containing all measurements, colors, fonts, spacing, and element styles. The builder scripts (`build_resume.js`, `make_cover_letter.js`) load this spec at runtime via `design_loader.js`.

Key values from the spec:
- Page: US Letter 612 x 792 pt (12240 x 15840 twips), single column, no photo, no tables, no text boxes, no icons.
- Font: Calibri everywhere (LibreOffice substitutes Carlito, which is metric-identical). Body text 10.5 pt, color #000000.
- Colors: Navy `#1F3864` (name), Blue `#4F81BD` (headings, company names), Black `#000000` (body).
- Margins: normal (top/bottom 1000, left/right 1100 twips) or tight (700/700/1000/1000 twips).
- Bullets: real list bullets with "●", glyph 8 pt, left indent 400 twips, hanging 280 twips.

## 3. Element Styles (summary)
| Element | Size | Weight | Color | Alignment | Spacing |
|---|---|---|---|---|---|
| Name | 26 pt | regular | Navy | center | after 5 pt; blue rule |
| Title line | 10.5 pt | bold | black | center | after 1 pt |
| Location / Contact / Links | 10.5 pt | regular | black | center | after 1 pt each |
| Section headings | 13 pt | bold | Blue | left | before 10 pt, after 3 pt |
| Summary paragraph | 10.5 pt | regular | black | left | after 1 pt |
| Skill rows | 10.5 pt | label bold, items regular | black | left | after 1 pt |
| Company name | 10.5 pt | bold | Blue | left | before 6 pt, after 1 pt |
| Job title | 10.5 pt | bold | black | left | after 1 pt |
| Dates line | 10.5 pt | regular | black | left | after 1 pt (4 pt if no key projects) |
| Key projects line | 10.5 pt | regular | black | left | after 4 pt |
| Experience bullets | 10.5 pt | regular | black | left | after 1 pt |
| Education degree | 10.5 pt | bold | black | left | after 1 pt |
| School / CGPA | 10.5 pt | regular | black | left | after 1 pt |

See `DESIGN_SPEC.json` for complete machine-readable specification including all spacing values in twips and half-points.

## 4. Producing a resume
Run `node kit/make_resume.js work/<company>.json "Company Name" [--jd work/<company>_jd.txt]`. It lints the JSON, builds Word using the active design, converts with LibreOffice, and checks pages, reference fonts and readable text. It preserves margins and stops when content exceeds the page limit.

## 5. Extra sections and page breaks
`extraSections` in the JSON (for example `[{"heading": "Domain Expertise", "rows": [["Label", "items"]]}]`) is drawn between the Professional Summary and Technical Skills with the same heading style and bold-label bullets. Headings, company name, job title, dates and the key-projects line are "keep with next", so a heading is never alone at the bottom of a page. If content spills over the page limit, shorten it; do not shrink fonts or margins.

## 6. Lint rules (`kit/lint.js`)
ERRORS (build stops): changed name/contact/title/company/dates/education/certifications versus the base resume; missing summary ending (if configured); banned words in bullets (efficient, framework, toolkit); repeated starting verbs in the most recent job; broken ligature characters.
WARNINGS (fix before sending): skills rows or bullet counts out of range; fewer than the configured percent of bullets with a number; very long skills rows; tools used in the summary or bullets but missing from Skills; metrics in unrelated bullets.
NOTES (mention to the user): new estimated numbers.

## 7. Verification checklist
`make_resume.js` checks the page limit, fonts allowed by the active design and readable text using the bundled PDF parser. Render page 1 with `npm run preview -- input.pdf work/preview.png`, and compare it with the reference and extraction report. Check fonts, colors, order, spacing, wrapped bullets and headings staying with their content.
