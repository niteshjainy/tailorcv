# 2. Configure your resume

The project keeps exactly one resume of yours: `resume/base_resume.json`. It is your source of truth. The agent never edits it for a single job; it copies it to `work/<company>.json`, tailors the copy, and the linter blocks any change to your fixed facts (name, contact, jobs, dates, education, certifications).

Until you replace it, the file holds a sample resume ("ALEX MORGAN"). `npm run doctor` reminds you.

## Way 1: let the agent convert your resume (easiest)
Start your agent in the project folder (see [03](03-CONNECT-AN-LLM.md)). Because the base resume is still the sample, it starts "onboarding" and asks you to paste your current resume. It converts it into `resume/base_resume.json` without changing your facts and runs the linter. Read the result and fix anything wrong.

## Way 2: edit the JSON yourself
Open `resume/base_resume.json` and replace the values.

| Field | Meaning | Locked by lint? |
|---|---|---|
| `name` | Your name, shown large at the top | yes |
| `title` | Title line under the name, for example "Senior Frontend Engineer" | yes (configurable) |
| `location` | Location and work-mode line, for example "Austin, TX \| Open to Remote" | no, changes per JD |
| `email`, `phone`, `linkedin` | Contact lines. Leave a field empty (`""`) to hide it | yes |
| `links` | Optional array of extra links (portfolio, GitHub) shown after LinkedIn | no |
| `summary` | 4 to 7 lines | no, changes per JD |
| `skills` | Array of `["Category", "item, item, item"]` rows (11 to 14 rows) | no, changes per JD |
| `jobs` | Array, most recent first. Each: `company`, `title`, `dates`, optional `keyProjects`, `bullets[]` | company, title, dates, keyProjects locked |
| `education` | `degree`, `school`, optional `cgpa` | yes |
| `certifications` | Array of strings (may be empty) | yes |
| `extraSections` | Optional, for example `[{"heading": "Domain Expertise", "rows": [["Label", "items"]]}]` | no |

Tips for a strong base resume:
- Put real numbers in most bullets (percentages, counts, time). The linter warns below 85%.
- Start every bullet of your most recent job with a different verb.
- Use en dashes in dates (`Mar 2022 – Present`) and keep the exact same dates on LinkedIn.
- Do not use the words "efficient", "framework" or "toolkit" in bullets (tool names in Skills are fine).
- Keep it to the page limit. Two pages fit about 10 skills-row lines plus 10 to 13 bullets for the latest job.

Check your file any time:
```
npm run lint -- resume/base_resume.json
```
`LINT OK` means the structure and rules pass.

## config.json
```json
{
  "outputRoot": "output",
  "outputFileName": "{first}_{last}_resume.pdf",
  "coverLetterFileName": "{first}_{last}_cover_letter.pdf",
  "maxPages": 2,
  "summaryEnding": "",
  "lockTitle": true,
  "requireAiToolsBullet": false,
  "minNumberCoveragePercent": 85,
  "skillRows": [11, 14],
  "recentJobBullets": [10, 13],
  "extraTools": []
}
```

| Key | Meaning |
|---|---|
| `outputRoot` | Where PDFs go. Relative to the project, or absolute, or starting with `~` (for example `~/Desktop/resume`). The environment variable `RESUME_ROOT` overrides it |
| `outputFileName` | File name pattern. `{first}` and `{last}` come from `name`; `{name}` is the full name with underscores |
| `maxPages` | Page limit (1 or 2). If a build is over the limit it first retries with tighter margins, then stops |
| `summaryEnding` | If set (for example "Available immediately."), the summary must end with it |
| `lockTitle` | `true` blocks changing the title line per JD |
| `requireAiToolsBullet` | `true` warns when your latest job has no bullet about AI coding tools plus reviewing their output |
| `minNumberCoveragePercent` | Share of bullets that must contain a number |
| `skillRows`, `recentJobBullets` | Allowed ranges before the linter warns |
| `extraTools` | Extra tool names the consistency check should know about (for example `["Terraform", "Snowflake"]`) |

Next: [03 Connect an LLM](03-CONNECT-AN-LLM.md).
