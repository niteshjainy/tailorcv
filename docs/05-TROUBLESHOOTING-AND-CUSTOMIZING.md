# 5. Troubleshooting and customizing

## Common problems

| Message | Meaning and fix |
|---|---|
| `LibreOffice not found` | Run `npm run setup`, or install from libreoffice.org, then close and reopen the terminal. If it is installed in an unusual place, set the environment variable `SOFFICE` to the full path of `soffice` (on Windows `soffice.com`) |
| `Cannot find module 'docx'` / `docx build failed` | Run `npm install` (or `npm run setup`) |
| `page count is 3, the limit is 2` | Shorten the content: fewer or shorter skills rows, shorter bullets. Do not change fonts or margins by hand |
| `PDF uses wrong fonts` | Calibri/Carlito is missing. Linux: `sudo apt-get install fonts-crosextra-carlito`. Then rebuild |
| `Broken characters in PDF text` | The PDF was not made by this project's builder. Rebuild with `kit/make_resume.js` |
| `lint errors` | Read the ERROR lines. Most often a locked fact was changed (company, dates, education) or two bullets start with the same verb |
| The agent draws its own PDF | Tell it: "Read CLAUDE.md section 5. Only use kit/make_resume.js." If it keeps doing it, use a stronger model |
| Conversion hangs on Windows | Close any LibreOffice windows or processes (`soffice.bin`) and retry. The runner already uses `soffice.com` with `--headless --norestore` and a timeout |
| `NOTE: New estimated number` | Not an error. It is a reminder that a number is not from your base resume. Replace it with your real figure if you have one |

Run `npm run doctor` any time to re-check the environment.

## Customizing

**Strict mode (only use what is in the base resume).** By default the agent mirrors each JD and adds the JD's skills. If you prefer to only use your own listed skills, add this to the end of `CLAUDE.md` and `AGENTS.md`:
```
STRICT MODE: In section 4, do not add skills, tools or experience that are not in resume/base_resume.json. If the JD asks for something missing, list it in the reply as "not in your resume" instead of adding it.
```

**A4 paper instead of US Letter.** In `kit/build_resume.js` change the page size `{ width: 12240, height: 15840 }` to `{ width: 11906, height: 16838 }`. Do the same in `kit/make_cover_letter.js`.

**One-page resumes.** Set `"maxPages": 1` in `config.json`. Expect to shorten content a lot.

**Output folder.** For example `"outputRoot": "~/Desktop/resume"` puts PDFs in `Desktop/resume/<Company>/`.

**More tools in the consistency check.** Add names to `extraTools` in `config.json`.

**Other languages.** Tell the agent which language to write in. The layout is language-neutral; the section headings come from `kit/build_resume.js` (`Professional Summary`, `Technical Skills`, `PROFESSIONAL EXPERIENCE`, `Education`, `Certifications`) and can be translated there. Keep the text check in `kit/make_resume.js` in step with the headings you use.

**Change the look.** All layout numbers are in `kit/build_resume.js` and documented in `kit/FORMAT_SPEC.md`. If you change them, update the spec and re-run `npm run example`.

**Lint rules.** `kit/lint.js` has the rules. Add your own checks there; the agent runs them on every build.

## How the pieces fit
- `CLAUDE.md` / `AGENTS.md`: tells the agent what to do.
- `LESSONS.md`: the agent's memory of past mistakes.
- `kit/lint.js`: enforces the rules in code.
- `kit/build_resume.js`: JSON to Word, exact layout.
- `kit/make_resume.js`: lint, build, LibreOffice, checks, save.
- `scripts/setup.js`: environment check and installer.
