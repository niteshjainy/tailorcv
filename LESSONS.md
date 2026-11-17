# Lessons learned

Each lesson has: the mistake, the rule, and the lint check (if any). The agent reads this file at the start of every session.

**Rule for the agent:** whenever the user points out a mistake or gives feedback on a resume, add a lesson here immediately (mistake, rule). If the mistake can be caught by code, also add a check to `kit/lint.js`.

---

## Preserve the master's visual structure and render only one summary
**Feedback:** The generated resume lost the master's section separators, used an unrelated sans-serif fallback for a serif master, and duplicated the top professional summary as a fixed title plus another summary section.
**Rule:** Compare the original PDF visually before accepting extraction. Extract horizontal separators, per-element offsets, typography and labelled skills correctly. Detect when the apparent title is actually the master's summary; render the tailored summary once in that same position, without retaining the old prose. Preserve a real short title separately. Prefer a licensed same-family font download; otherwise select a stylistically and metrically similar fallback and disclose it. Validate the actual output against independently measured reference properties; never present a passing test count as pixel accuracy or fabricate a 98% score.
**Check:** Add regression tests for section-rule extraction/rendering, summary placement/uniqueness, serif-aware fallback, skill-label matching, and visual layout validation.

**Audit refinement:** A first set of passing checks still missed excess bullet gaps and missing whitespace above later sections. Measure repeated baselines and fixed gaps around headings; calibrate against rendered LibreOffice output. Keep before/after checklists identical. Deliberately remove separators in a regression fixture and verify that the build refuses to save a final PDF.

## Do not request technology review for JD tailoring
**Feedback:** Technologies must always follow the JD without review or confirmation requests.
**Rule:** Add the JD's technologies and relevant responsibilities directly to the tailored resume, even when absent from the master. Never ask the user to approve or verify technical keywords, and do not append a technology-review checklist. Continue disclosing estimated numbers and font substitutions. Keep global `maxPages: "auto"`; honor explicit per-application page choices separately.
**Check:** Agent response behaviour is documented in both `AGENTS.md` and `CLAUDE.md`; content lint still checks tool consistency.

## Page count and unavailable fonts need user-friendly defaults
**Feedback:** Follow the master page count automatically, ask before expanding to two pages, and try permitted font downloads before using a disclosed default font.
**Rule:** Keep `maxPages: "auto"`. Overflow must request a page preference; never silently expand. Resolve reference fonts from installed fonts or a verified licensed source. If download or embedding is unavailable, use the configured default and explicitly report each replacement. Keep the extracted master design unchanged.
**Check:** Build policy tests cover auto limits, explicit per-build page choices, permitted download/embedding, and disclosed font fallback.

## A design-template exporter was described as actual reference extraction
**Mistake:** The previous extractor wrote fixed template constants without reading the reference, while the result was called fully generic.
**Rule:** Read the original PDF/DOCX, record which properties were measured or inferred, and test a visibly different design through LibreOffice. Do not claim exact PDF reproduction or automatic font installation. Never silently replace an unavailable reference font.
**Check:** `npm run test:design` verifies DOCX/PDF round trips, custom fonts/colors/margins/order, and rejects substituted fonts. The extraction report lists absent elements and PDF approximations.

## Windows setup falsely reported an installed LibreOffice as missing
**Mistake:** The environment check reported LibreOffice missing even though it was installed in `C:\Program Files\LibreOffice`.
**Rule:** Verify the installed executable directly before reporting a missing tool. Probe executables without a shell so Windows paths containing spaces work.
**Check:** `scripts/setup.js` uses `shell: false` for executable availability checks; rerun `npm run doctor` after changes.

## Drawing the PDF with code libraries produced unreadable, overlapping resumes
**Mistake:** A PDF drawn with pdf-lib (or similar) had broken "ti" ligatures (text extracted as `(cid:415)`), overlapping header lines, a wrong font (Helvetica) and wrong wrapping. ATS software could not read it.
**Rule:** Never draw the PDF yourself. Always use `node kit/make_resume.js` (Word file -> LibreOffice -> PDF). If a step fails, stop and fix the setup; do not switch to another method.
**Lint/check:** `make_resume.js` validates PDF fonts against the resolved reference/default design and rejects unreadable text such as `(cid:`.

## Company, product and initiative names from the JD leaked into the resume
**Mistake:** A resume copied JD-internal names (an internal initiative name, a tax-regime name, the company name) and a company-specific role title with brackets into the summary and bullets.
**Rule:** Never copy JD-internal product, initiative or program names, or company-specific role titles, into the resume. Take only technologies, skills and generic responsibilities.
**Lint check:** `--jd <file>` warns about capitalized phrases from the JD that appear in the resume and are not technologies or in the base resume. The summary check warns about brackets in the first 8 words.

## Skills and bullets did not match
**Mistake:** Tools mentioned in the summary or bullets (for example an identity provider or a test runner) were missing from Skills, and JD-named tools were not in Skills.
**Rule:** Every tool in the summary or bullets must also be listed in Skills. Every tool the JD names (that the resume adds) must be in Skills.
**Lint check:** "Tools in summary/bullets but missing from Skills".

## A metric was moved to a different bullet
**Mistake:** An estimated number (for example "~20% faster delivery" for AI-tool use) was reused in an unrelated bullet, and the original bullet lost it.
**Rule:** Each metric stays with the achievement it came from. Do not reuse or move numbers between bullets. New numbers are conservative estimates and are flagged to the user.
**Lint check:** a warning when a percentage appears in a bullet unrelated to the base bullet that has it; a NOTE for every new estimated number.

## Location line dropped a work mode the JD allows
**Mistake:** The location line removed "Open to Remote" although the JD allowed remote work.
**Rule:** The location line must match the JD's work mode (Remote / Hybrid / On-site / Relocation to a named city). Do not remove an option the JD allows.
**Lint check:** warning when the location line is empty.

## Summary opened with a company-specific title in brackets
**Mistake:** The summary started with something like "Frontend Lead (Design)".
**Rule:** The summary opens with a generic role title ("Senior Frontend Engineer"). No brackets or company-specific titles.
**Lint check:** warning for brackets in the first 8 words of the summary.

## On Windows the LibreOffice conversion could hang
**Mistake:** Calling `soffice.exe` from a script did not wait for the conversion on some Windows machines.
**Rule:** Prefer `soffice.com`, and call it with `--headless --norestore --nologo` and a timeout.
**Check:** `make_resume.js` already does this.
