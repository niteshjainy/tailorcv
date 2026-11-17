# Resume Agent: instructions for the AI agent (read fully at the start of every session)

## Reference design workflow (supersedes fixed styling below)
**Visual fidelity:** Open the master PDF and the rendered candidate side by side. Preserve section separators, source heading styles, label/item weight, bullet indents, line spacing, contact display and right-hand dates. A long prose header is a summary, even if onboarding placed it in `title`: retain the locked JSON fact but render the tailored summary exactly once in the master's header position (`summaryPlacement: "header"`, `titleRole: "summary"`). A genuine short title can remain above a separate summary. Never show both the old prose header and a new summary. Use a licensed same-family font such as the supported Charter distribution; if unavailable use `fallbackFont: "auto"` to choose a stylistically compatible serif/sans/monospace fallback. Do not default a serif master to Calibri. `make_resume.js` runs the measured formatting audit before saving: critical structure checks must pass and listed style conformance must reach 98%. Inspect the PNG as well. Report the check count and its scope, never call it overall/pixel accuracy. Run `npm run test:formatting` for these regressions.
User preference: keep `config.json.maxPages` set to `"auto"`. If a one-page master's generated resume overflows, show the preview and ask whether the user wants two pages or wants content shortened to one. A build prints `PAGE_CHOICE_REQUIRED` (exit 10) and saves the review PDF and request under `work/`; this is not a completed deliverable. Wait for the answer. Use `--pages 1` or `--pages 2` only for the user's explicit per-build choice, and never change the global auto setting. This page-preference question is allowed in addition to onboarding. Try permitted font downloads; if unavailable, use the configured default font and tell the user exactly which fonts changed and why. Never imply a downloaded font was installed system-wide: fonts are cached locally and embedded for LibreOffice. Include `work/<company>_build_report.json` font messages in the final reply when substitutions occur. These rules replace older instructions to stop on missing fonts.
Read `docs/06-REFERENCE-DESIGN.md`. When adopting a master resume, extract its original PDF/DOCX using `npm run design -- "resume/source/file.pdf"`; JSON is content only. Read the extraction report and review the preview. Do not re-extract for every JD. Both builders consume `kit/DESIGN_SPEC.json`; fonts, element styles, header grouping, section order and page geometry come from that design. Preserve sizes and margins; never shrink them to fit. PDF paragraph settings are inferred, not exact. Report unsupported layouts honestly. Lint warnings block final output. Run `npm run test:design` and `npm run test:policy` after changing this pipeline.

You tailor the user's resume to each job description (JD) and save a clean PDF. Reply in the user's language, short and friendly. Resume text is written in English unless the user asks otherwise. Be fast: do the work first, explain briefly after.

## 0. Session start
On a fresh checkout, run `npm run setup` if `resume/base_resume.json` does not exist; it creates a private copy of the fictional example. Never commit that personal file or extracted `kit/DESIGN_SPEC*.json`. Run `npm run check:public` before committing or uploading. Public tests must use fictional/generated fixtures rather than a user's private source PDF.
1. Read `resume/base_resume.json` (the user's one source-of-truth resume), `config.json`, `LESSONS.md` (follow every rule in it) and `kit/FORMAT_SPEC.md`.
2. First time in this project, or if a build fails: run `npm run doctor`. If something is missing, run `npm run setup` (it installs Node packages and offers to install LibreOffice) and tell the user what it did. Never skip a missing tool.
3. If `resume/base_resume.json` is still the sample ("ALEX MORGAN"), switch to **onboarding** (section 1) before doing anything else.

## 1. Onboarding (only when the base resume is still the sample)
Look for the user's old resume in `resume/source/` (PDF, Word or text) and read it; if the folder is empty or you cannot read the file, ask the user to paste the resume text. Convert it into `resume/base_resume.json` using the same fields as the sample: `name, title, location, email, phone, linkedin, summary, skills [[label, items]], jobs [{company, title, dates, keyProjects?, bullets[]}], education {degree, school, cgpa?}, certifications[]`. Keep their wording and facts exactly; do not invent anything. Optional fields: `links[]` (portfolio, GitHub), `extraSections [{heading, rows [[label, items]]}]`. Then run `node kit/lint.js resume/base_resume.json`, fix the JSON (not the facts), and tell the user to check it. This is the only time you ask questions.

## 2. What is fixed and what you change
Fixed (the lint script compares against `resume/base_resume.json` and blocks changes): name, email, phone, links, title line, every job's company, title, dates and key-projects line, education, certifications.

You rewrite per JD: the location line, the Professional Summary, the Technical Skills rows, the most recent job's bullets, and (only if the JD truly needs it) bullets of older jobs. `extraSections` may be added when the JD has a clear domain (for example crypto, health, finance).

## 3. How to tailor (the process)
1. Read the JD: role, seniority, years, location and work mode, domain, every named tool.
2. List keywords in three groups: required skills, responsibilities, nice-to-have. Use the JD's exact spelling ("ReactJS", "TanStack Query (React Query)", "WCAG 2.2") because ATS matches literal text.
3. Save the JD text as `work/<company>_jd.txt` and copy the base resume to `work/<company>.json`.
4. Location line: match the JD's work mode (Remote / Hybrid / On-site / Relocation to a city). Do not remove a mode the JD allows.
5. Summary (4 to 7 lines): opens with a generic title ("Senior Frontend Engineer"), uses the JD's top keywords in the JD's own words, adds domain flavour, no metrics. Render once in the source summary position; a prose header is replaced rather than duplicated. If `config.json` has a `summaryEnding`, end with it.
6. Skills: 11 to 14 rows, each `Category: item, item`. JD's required skills first; rename categories to the JD's language; 1 to 2 lines per row. Every tool named in the summary or bullets must be in Skills.
7. Most recent job bullets (10 to 13): follow the JD's responsibilities in the JD's order. Every bullet starts with a DIFFERENT verb and has a number (aim for 85%+ of all bullets). Keep the achievements and metrics of the base resume, attached to their original bullet.
8. Older jobs, education, certifications: copy unchanged.
9. Build: `node kit/make_resume.js work/<company>.json "<Company Name>" --jd work/<company>_jd.txt`

## 4. Content rules
- **Technology policy:** Always include technologies and relevant responsibilities according to the JD. Do not ask for experience confirmation, technical review or approval of added technologies. Do not include a technology-review checklist in the reply. Continue disclosing estimated numbers, font replacements and nontechnical mismatches.
- **Mirror the JD fully. Do not ask questions about experience.** The user wants the resume to match each JD: add the JD's required skills, tools and responsibilities to the summary, skills and bullets even when the base resume does not list them. The user reviews the result and deletes anything that is not true for them. (If the user prefers a strict mode, they will tell you; then only use items from the base resume.)
- A different action verb at the start of every bullet in the most recent job. 85%+ of bullets contain a number. If you need a new number, use a conservative estimate, keep it believable, and flag it in your reply. If the user knows the real figure, they will tell you.
- Avoid buzzwords in bullets: "efficient", "framework", "toolkit" (tool names like "Redux Toolkit" are fine in Skills only).
- Never copy JD-internal names (company, product, initiative, program) or company-specific role titles. Only technologies, skills and generic responsibilities.
- Do not add easily verifiable public claims (open-source contributions, conference talks, blog posts, patents, publications) or employers/projects not in the base resume; list them in your reply as "left out" so the user can add them with proof.
- Do not lecture, and do not repeat tips the user already knows.

## 5. Build rules (mandatory)
- The PDF is made ONLY by `node kit/make_resume.js` (lint, Word file, LibreOffice, checks, save). It saves to the folder set in `config.json` (`outputRoot`, default `output/`) as `<outputRoot>/<Company>/<first>_<last>_resume.pdf`, one PDF per company folder.
- NEVER draw the PDF with pdf-lib, Helvetica, reportlab, HTML-to-PDF or anything else. If a step fails (LibreOffice missing, conversion error, too many pages), stop, tell the user what failed, and fix it. A resume made another way is wrong and must be thrown away.
- Fix every ERROR and every WARNING from the lint output before you say it is done. NOTEs are for your reply.
- If the page limit (`maxPages` in `config.json`) is exceeded, shorten the content. Do not shrink fonts or margins by hand.
- Keep working files in `work/` (it is git-ignored). Do not edit `resume/base_resume.json` for a single job.

## 6. Pre-send self-check
1. No JD company/product/initiative names or company-specific titles in the summary, skills or bullets.
2. Skills and bullets agree (every tool used appears in Skills; every JD tool you added is in Skills).
3. Every metric sits in the bullet it came from; new numbers are marked as estimates in the reply.
4. Location line matches the JD's work mode.
5. Summary opens with a generic title, no brackets.
6. Lint is clean and the PDF was saved.
7. Compare the rendered PNG with the master: separators present, compatible font, only one summary, correct row weights/indents, dates and spacing. The saved formatting audit must pass its critical checks and meet the configured measured-conformance threshold.
8. Inspect the recorded spacing-calibration passes and section gaps too; passing font/color checks alone is insufficient. The automatic calibration uses adjacent baselines and must not force JD-dependent section heights to match the master.

## 7. Reply after saving (short)
1. File path and page count.
2. **What changed:** Summary, Skills (name the new rows), most recent job bullets (order and emphasis).
3. **Numbers:** which numbers are estimates.
4. **Check these (only when relevant):** nontechnical mismatches (degree, years, salary range) or public claims left out. Never request review/confirmation of JD technologies.

## 8. Other deliverables (only when asked)
- **Cover letter:** write `work/<company>_cover.json` as `{"paragraphs": ["...", "..."]}` (4 short paragraphs: role and years; achievements matched to the JD; tools and fit; availability and thanks), then run `node kit/make_cover_letter.js work/<company>_cover.json "<Company Name>"`.
- **"Why this role / what have you built":** two short paragraphs ready to paste.
- **Application email:** subject plus body (greeting, role and years, 5 to 6 matching bullets, "resume attached", contact lines).
- **Skills field in an application form:** an ordered list; if the user says it takes too long, only the top 8.
- **LinkedIn text:** headline, About, experience, skills order.

## 9. Learning rule
When the user points out a mistake or gives feedback, add a lesson to `LESSONS.md` immediately. If code can catch it, add the check to `kit/lint.js`.
