# 4. Daily usage

## For each job
Start the agent in the project folder and send:
```
Company: <name>
JD:
<paste the full job description>
```
What the agent does:
1. Saves the JD as `work/<company>_jd.txt` and copies your base resume to `work/<company>.json`.
2. Picks out the required skills, responsibilities and nice-to-haves (using the JD's exact spelling).
3. Rewrites the location line, summary, skills rows and the bullets of your most recent job in the JD's order.
4. Runs `node kit/make_resume.js work/<company>.json "<Company>" --jd work/<company>_jd.txt`, which lints, builds, checks and saves the PDF.
5. Replies with the PDF path, what changed, estimated numbers and things to double-check.

Your PDF: `output/<Company>/<first>_<last>_resume.pdf` (folder and name come from `config.json`).

## Before you send a resume
- Open the PDF and read it once.
- Remove anything you could not explain in an interview. The agent mirrors the JD on purpose; you decide what is true for you.
- Replace estimated numbers with real ones (tell the agent: "the page-load improvement was 22 percent" and it will update the bullet and rebuild).

## Giving feedback
Tell the agent what was wrong in plain words ("do not use the company's product name", "keep the 25 percent in the component-library bullet"). It adds a lesson to `LESSONS.md`, and where possible a lint check, so it does not repeat the mistake.

## Other things you can ask
- "Cover letter too" creates `work/<company>_cover.json` and `output/<Company>/<first>_<last>_cover_letter.pdf`.
- "Why this role and what have I built?" gives two short paste-ready answers for application forms.
- "Write the application email."
- "Give me the top 8 skills to type into the application form."
- "Rebuild with these changes: ..." edits `work/<company>.json` and rebuilds.

## Without the agent
```
npm run resume -- work/acme.json "Acme" --jd work/acme_jd.txt
npm run lint -- work/acme.json --jd work/acme_jd.txt
npm run cover -- work/acme_cover.json "Acme"
```

## Cover letter JSON
```json
{ "greeting": "Dear Hiring Team,", "paragraphs": ["Paragraph one.", "Paragraph two."] }
```
The header (name, email, phone, links) comes from your base resume.

## Updating your base resume
When you change jobs or learn something new, edit `resume/base_resume.json` (or ask the agent: "update my base resume with this new role: ..."). Then run `npm run lint -- resume/base_resume.json`. Old resumes in `output/` are not changed.
