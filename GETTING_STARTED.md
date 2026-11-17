# Getting started (follow these steps in order)

This guide takes you from zero to your first tailored resume PDF. It takes about 20 to 30 minutes the first time. After that, each resume takes a minute or two.

## What you need
- A computer with Windows 10/11, macOS or Linux.
- An internet connection.
- An AI coding agent account. This guide uses **Claude Code**, which needs a paid Claude plan (Pro, Max, Team or Enterprise) or an Anthropic API account. Other agents work too: see [docs/03-CONNECT-AN-LLM.md](docs/03-CONNECT-AN-LLM.md).
- Your current resume as text (you will paste it once).

## How it works in one minute
1. You keep **one** resume of yours in this project (`resume/base_resume.json`).
2. For each job you paste the **job description (JD)** to the AI agent.
3. The agent rewrites your summary, skills and latest-job bullets to match the JD, checks its own work, and builds a **2-page PDF** with a fixed, professional layout.
4. You read the PDF, remove anything that is not true for you, and apply.

> **Important:** the agent matches each JD on purpose (it adds the JD's skills and keywords). You are responsible for your resume. Delete anything you could not explain in an interview, and replace estimated numbers (the agent flags them) with your real figures.

---

## Step 1: Install Node.js
1. Go to https://nodejs.org and download the **LTS** version. Install it with the default options.
2. Open a terminal:
   - **Windows:** press the Windows key, type `PowerShell`, open it.
   - **Mac:** open the Terminal app.
   - **Linux:** open your terminal.
3. Check it works:
   ```
   node -v
   ```
   You should see a version number such as `v22.x.x` (22.13 or higher is required).

## Step 2: Download the project
Pick one:
- **With git:**
  ```
  git clone https://github.com/niteshjainy/tailorcv.git
  cd tailorcv
  ```
- **Without git:** on the GitHub page click **Code**, then **Download ZIP**. Extract it, and open a terminal in the extracted folder (Windows: in File Explorer open the folder, click the address bar, type `powershell`, press Enter).

Tip: if you plan to keep your own resume in the project, click **Fork** or **Use this template** on GitHub and make your copy **private**.

## Step 3: Run the setup
In the project folder run:
```
npm run setup
```
It checks everything and **asks before installing** anything:
- the Node packages (runs `npm install`),
- **LibreOffice** (the free program that creates the PDF),
- the Calibri-compatible font (Linux only).

Answer `y` to each question. When it finishes you should see `All set.` If it says something is still missing, follow the message, close and reopen the terminal, and run `npm run doctor` to re-check.

## Step 4: Test that PDF creation works
```
npm run example
```
Expected output ends with:
```
SAVED: .../output/Example/alex_morgan_resume.pdf
  pages: 2 ... | fonts: Carlito ... | text OK
```
Open that PDF. It is a sample resume, so you know the layout works on your computer.

## Step 5: Install and connect the AI agent (Claude Code)
1. Install Claude Code (official instructions: https://code.claude.com/docs/en/setup):
   - **Windows (PowerShell):** `irm https://claude.ai/install.ps1 | iex`
   - **Mac / Linux:** `curl -fsSL https://claude.ai/install.sh | bash`
2. Close and reopen the terminal, then in the project folder run:
   ```
   claude
   ```
3. The first start opens your browser. Log in with your Claude account. (If you use an API account instead, see [docs/03-CONNECT-AN-LLM.md](docs/03-CONNECT-AN-LLM.md).)
4. When the agent asks for permission to run a command or create a file, read it and approve.

Using a different agent? Start it in this folder and say: `Read AGENTS.md and follow it exactly.`

## Step 6: Put your own resume into the project (one time)
Copy your old resume file (PDF, Word or text) into the folder `resume/source/`. Then paste this to the agent:
```
Read CLAUDE.md, LESSONS.md and kit/FORMAT_SPEC.md. Run "npm run doctor". My base resume is still the sample, so start onboarding. My resume is the file in resume/source/. If you cannot read it, I will paste the text.
```
No file? Paste your resume text into the chat instead.
The agent converts it into `resume/base_resume.json` without changing your facts and checks it. **Read the result.** Your job titles, company names, dates, education and certifications must be exactly right, because the tool locks them so that tailored resumes can never change them.

You can also edit `resume/base_resume.json` by hand: see [docs/02-CONFIGURE-YOUR-RESUME.md](docs/02-CONFIGURE-YOUR-RESUME.md).

## Step 7: Create your first tailored resume
Send this (replace the company name and paste the full JD):
```
Company: Acme
JD:
<paste the complete job description here>
```
The agent will:
1. save the JD and a working copy of your resume in `work/`,
2. rewrite the summary, skills and latest-job bullets for the JD,
3. run the build (lint, Word file, LibreOffice, checks),
4. fix any warnings and reply.

Your PDF is here:
```
output/Acme/<first>_<last>_resume.pdf
```
(You can change the folder and file name in `config.json`, for example `"outputRoot": "~/Desktop/resume"`.)

## Step 8: Review before you apply
1. Open the PDF and read it fully.
2. Remove any skill, tool or claim you could not explain in an interview.
3. Replace estimated numbers with your real ones. Just tell the agent, for example: `The page-load improvement was 22 percent. Update it and rebuild.`
4. If something is wrong, tell the agent in plain words. It saves a lesson in `LESSONS.md` so it does not repeat the mistake.

Then apply with that PDF.

---

## Next time (every new job)
1. Open a terminal in the project folder and run `claude`.
2. Send `Company: <name>` and `JD: <paste>`.
3. Review the PDF in `output/<Company>/` and apply.

## Other things you can ask the agent
- `Cover letter too.`
- `Why this role and what have I built?` (short answers for application forms)
- `Write the application email.`
- `Give me the top 8 skills to type into the application form.`
- `Rebuild with these changes: ...`

## If something goes wrong
| Problem | What to do |
|---|---|
| `LibreOffice not found` | Run `npm run setup`, or install it from https://www.libreoffice.org, then reopen the terminal |
| `Cannot find module 'docx'` | Run `npm install` |
| `page count is 3` | Ask the agent to shorten the content. Do not change fonts or margins |
| The agent tries to draw the PDF itself | Say: `Read CLAUDE.md section 5. Use only kit/make_resume.js.` |
| Anything else | Run `npm run doctor` and see [docs/05-TROUBLESHOOTING-AND-CUSTOMIZING.md](docs/05-TROUBLESHOOTING-AND-CUSTOMIZING.md) |

## Keep your data private
Your resume text is sent to the AI provider you connect. If you publish your own copy of this project, do **not** commit your real `resume/base_resume.json`, and keep `work/` and `output/` out of git (they are already git-ignored).
