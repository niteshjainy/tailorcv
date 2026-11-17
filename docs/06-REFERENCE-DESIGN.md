# Use the design of a master resume

The content source is `resume/base_resume.json`. The visual reference is a separate original PDF or DOCX in `resume/source/`. JSON alone cannot describe a document's visual design.

Requires Node.js 22.13 or newer, `npm install`, and LibreOffice for PDF output. Run `npm run doctor` first.

## Extract once per reference

```
npm run design -- "resume/source/master.docx"
```

With exactly one PDF/DOCX in `resume/source`, `npm run design` selects it automatically. Multiple documents require an explicit path. To inspect a design without activating it:

```
npm run design -- "resume/source/master.pdf" work/design.json --base resume/base_resume.json
```

The default output is `kit/DESIGN_SPEC.json`, plus `kit/DESIGN_SPEC.report.json`. The report distinguishes matched styles from absent elements and inferred properties. Extraction verifies that the reference name matches the content source and records the source SHA-256. Source documents are never modified. Re-run extraction after changing the reference. If using a different person's reference, supply its corresponding JSON with `--base`.

## What is preserved

The builders use each element's font, size, color, weight, italics, alignment, spacing, borders and bullet indents; page size, margins, header grouping and section order also come from the design. Horizontal PDF separator rules are measured and converted into Word paragraph borders. Right-aligned dates preserve the master's right inset. Skills are matched by their category label and colon so a “Frontend Architecture” competency cannot be mistaken for the “Frontend:” skill row. Repeated body and skill-row spacing is inferred from actual baselines. Original emphasis phrases and metrics can remain bold in rewritten bullets.

A long prose header is classified as the professional summary (`titleRole: "summary"`), even if its text was stored in `title` during onboarding. The underlying locked field stays unchanged; the output replaces it with the tailored summary exactly once, in the same header position. Real short titles remain separate from summaries. Do not duplicate long header prose and another summary section.

DOCX preserves explicit Word settings and inherited paragraph/run styles for supported single-column documents. PDF preserves measurable font names, sizes, colors and coordinates, but its margins, paragraph spacing and indents are inferred. PDF font sizes are rounded to Word half-points. A PDF is not an exact Word-layout description. Review the preview: horizontal rules and recorded text emphasis are supported; arbitrary decorative graphics still require an adapter.

Tables, multiple columns, images, text boxes and multi-section DOCX layouts require a separate adapter and are rejected. PDF extraction currently supports a single-column text layout; complex PDF layouts require manual review. Scanned PDFs stop with an OCR message. Arbitrary reference designs are not guaranteed to reproduce pixel for pixel.

## Build and inspect

```
node kit/make_resume.js work/company.json "Company" --jd work/company_jd.txt
npm run preview -- "output/Company/alex_morgan_resume.pdf" work/preview.png
```

Both resume and cover-letter PDFs are generated through Word → LibreOffice. Installed reference fonts are used first. Missing fonts are looked up in the official Google Fonts OFL directory. Charter also has a reviewed download from [Butterick's Practical Typography](https://practicaltypography.com/charter.html), accompanied by the original Bitstream permission notice. The tool checks the source license, family metadata and embedding flags, caches full regular/bold/italic faces in `work/fonts/`, and embeds them in Word. No administrator privileges or global installation are needed. Cached files are verified by hash before reuse. `fallbackFont: "auto"` selects a compatible font class: a serif master prefers Cambria/Georgia/other serif fonts, rather than an unrelated sans serif. An explicit family in `fallbackFont` remains an override. All replacements are reported, and the extracted master design is unchanged.

Before saving a resume, `formatAudit` compares its actual rendered properties with the reference. Critical summary/separator/section checks must pass, and `minFormatConformancePercent` defaults to 98. The audit lists every check and tolerance in `work/<Company>_format_audit.json`; it is measured style conformance, not global visual accuracy or pixel similarity. Text, wrapping and section heights necessarily change with tailored content. Always inspect the rendered preview too.

For PDF references, the build also calibrates fixed adjacent baseline gaps against actual LibreOffice output: around section headings, between degree and school, and between role/company/first bullet. It can repeat up to three measured correction passes before the audit. Corrections change paragraph spacing only, preserve font sizes/margins, and are recorded in the build report. Content-dependent section heights are not forced to match the master.

`config.json.maxPages` stays `"auto"`, using the master page count. When a one-page master produces a longer resume, the build exits with code 10 and prints `PAGE_CHOICE_REQUIRED`. It saves a review PDF and page-choice JSON under `work/`, and does not save the new final PDF. The agent must ask: “Are you comfortable with a two-page resume, or should I keep it to one page?” Wait for the answer, then rerun with `--pages 2`, or shorten content and rerun with `--pages 1`. These flags are per-build choices and do not change global config. If even two pages are insufficient, shorten the content. DOCX page-count metadata may be stale; review that value. Fonts and margins are never shrunk to fit.

Use `RESUME_DESIGN` to select an alternate design JSON without overwriting the active design. `RESUME_ROOT` selects a separate output folder for experiments.

## Verify the implementation

```
npm run test:design
npm run test:policy
npm run test:formatting
```

This builds a reference Word document with Arial/Georgia, custom colors/margins/order, zero spacing and no name border; extracts it; generates resume and cover-letter PDFs with LibreOffice; extracts the PDF; checks original fonts/colors and Word properties; and verifies that wrong references, JSON input and unexpected font replacements are rejected. Artifacts are saved in `work/design-tests/`. The test requires Arial and Georgia to be installed.

The policy suite checks the one/two-page decisions, the pending review PDF, denied licenses, disclosed default-font replacements, and real rendering of a downloaded Lato font. Its online embedding check requires access to the official Google Fonts repository; font download failure during normal usage falls back automatically.
