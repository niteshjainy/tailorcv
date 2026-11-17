# 3. Connect an LLM (the AI agent)

The "brain" of this project is an AI **coding agent**: a tool that can read the project's files and run commands in a terminal. It reads `CLAUDE.md` (also copied as `AGENTS.md`), follows the process there, edits JSON files and runs `node kit/make_resume.js`. The scripts in `kit/` do the formatting and checking, so the agent only has to write good content.

Pick one option.

## Option A: Claude Code (recommended and tested)

**Account.** Claude Code needs a paid Claude plan (Pro, Max, Team or Enterprise) or an Anthropic Console (API) account. The free Claude.ai plan does not include it. Check the current requirements on the official page: https://code.claude.com/docs/en/setup

**Install.**
- Windows (PowerShell): `irm https://claude.ai/install.ps1 | iex`
- macOS / Linux: `curl -fsSL https://claude.ai/install.sh | bash`

Close and reopen the terminal, then check:
```
claude --version
```

**Log in and start in this project.**
```
cd tailorcv
claude
```
The first start opens a browser to log in with your Claude account (or lets you choose an API account). Claude Code reads `CLAUDE.md` in the folder automatically.

When the agent asks for permission to run a command or write a file, review and approve. You can approve "always for this project" for the safe commands (`node kit/...`, `npm run ...`) if you want fewer prompts.

**First message (checks that the agent follows the rules):**
```
Read CLAUDE.md, LESSONS.md and kit/FORMAT_SPEC.md. Run "npm run doctor" and tell me what is missing. If the base resume is the sample, start onboarding.
```
A correct agent answers with: the doctor result, which rules it will follow (build only with `kit/make_resume.js`, no PDF drawing, no inventing facts in onboarding), and asks for your resume if onboarding is needed.

## Option B: Claude Code with an API key
If you use an Anthropic API account instead of a subscription, set the key as an environment variable before starting (the exact variable and billing details are in the official docs above):
- Windows (PowerShell): `$env:ANTHROPIC_API_KEY = "sk-ant-..."`
- macOS / Linux: `export ANTHROPIC_API_KEY="sk-ant-..."`

Never write the key into any file in this repository. `.env` files are git-ignored, but keep keys out of the project folder anyway. API use is billed per token; one resume is a small request.

## Option C: another coding agent
Any agent that can read files and run shell commands can drive this project. Many agents read `AGENTS.md` automatically; if yours does not, start with:
```
Read AGENTS.md in this folder and follow it exactly. Then run "npm run doctor".
```
Look for the agent's own instructions on logging in or adding a model/API key. The project does not care which model is used, but keep these in mind:
- The agent must be able to run `node` commands (terminal access). A plain chat window cannot run the build.
- Use a strong model. Weak models tend to skip the rules (for example, drawing the PDF themselves). If that happens, say: "Read AGENTS.md section 5. Use only kit/make_resume.js."

## Option D: no agent (manual mode)
You can still use everything except the AI writing:
1. Copy `resume/base_resume.json` to `work/acme.json` and edit the summary, skills and bullets yourself (or ask any chat AI to rewrite them and paste the result in).
2. Run `npm run resume -- work/acme.json "Acme"`.
The linter and the layout work the same way.

## Privacy and cost
- Your resume and the JD are sent to the AI provider you connect. Read their data policy.
- Subscription plans have usage limits; do not send many JDs in one burst.

## How to test the whole chain
After onboarding, send a real or made-up JD:
```
Company: Test
JD:
We need a Senior React Developer with TypeScript, Next.js and AWS experience...
```
Expected: the agent saves `work/test_jd.txt` and `work/test.json`, runs the build, fixes any lint warnings, and replies with the PDF path (`output/Test/<first>_<last>_resume.pdf`), what changed, which numbers are estimates and what to double-check. Delete `output/Test` and the `work/test*` files afterwards.

Next: [04 Usage](04-USAGE.md).
