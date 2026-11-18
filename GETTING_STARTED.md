# Start with your assistant

Open the [visual guide](docs/index.html) in a browser for launch illustrations, copyable messages and the master-resume folder map.

You only need **Claude Code or Codex**. Install one, launch its chat, and let it guide the project setup. TailorCV is free; AI-provider access, limits and charges are separate.

## 1. Install an assistant, if needed

Already installed? Skip to step 2.

**Claude Code — Windows PowerShell:**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Claude Code — macOS/Linux:**

```sh
curl -fsSL https://claude.ai/install.sh | bash
```

**Codex — Windows PowerShell:**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

**Codex — macOS/Linux:**

```sh
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

These native installers do not need Node.js first. See [Claude's official quickstart](https://code.claude.com/docs/en/quickstart) and [Codex's official quickstart](https://github.com/openai/codex#quickstart) for current accounts and installation options.

## 2. Launch the chat

Create an empty local folder, such as `Documents/TailorCV`, and open a terminal in it. If you already have the project downloaded, use its existing folder instead.

- Windows: in File Explorer, open the folder, click the address bar, type `powershell`, press Enter.
- macOS: type `cd ` in Terminal, drag the folder into the window, press Enter.
- Linux: use the file manager's Open in Terminal option, or `cd` to the folder.

**Launch Claude Code:**

```sh
claude
```

**Or launch Codex:**

```sh
codex
```

Press Enter. Complete first-run browser sign-in and folder prompts. For Codex, choose **Sign in with ChatGPT** if that is your account route. For Claude Code, use an account with supported subscription, Console/API or organization access.

`claude --version` and `codex --version` only print versions; they do **not** open a chat. If a Windows npm installation is blocked through `codex.ps1`, use `codex.cmd` to launch instead. Keep the launched assistant open for the next message.

## 3. Give the assistant the project link

Paste this into the **running assistant chat**, not into a separate PowerShell window:

```text
Set up TailorCV for me from:
https://github.com/niteshjainy/tailorcv

Use this folder if the project is already here; otherwise get it in a new tailorcv subfolder. Use Git or the project ZIP as available. Read AGENTS.md, CLAUDE.md, LESSONS.md and kit/FORMAT_SPEC.md.

Check Node.js 22.13+ and LibreOffice, installing missing components where permitted. If I must complete a manual step, explain it and wait. Run setup and doctor.

Then guide me to add my master resume. Give me the full resume/source/ path and wait for my PDF/DOCX, or use a readable file path I provide. Preserve the original file, extract its actual design, keep maxPages auto and show the professional summary only once. Don't tailor the fictional example as my resume.
```

The assistant needs local file/terminal/network access. Login, installation permissions or a missing installer can require your action; this is guided setup, not a promise of unattended installation from a URL.

If you prefer manual download, use **Code → Download ZIP** on the [repository](https://github.com/niteshjainy/tailorcv), extract it and open the folder containing `package.json` before sending the same message. The agent will reuse it.

## 4. Add your master when asked

Copy a selectable-text PDF or DOCX into the project's `resume/source/` folder and say **“Done, I've added my master resume.”** Any filename is fine.

Alternatively, tell the assistant the full path to your existing resume. It can copy a readable file into the project without moving the original. If the path isn't accessible, it will explain where to copy it yourself.

The assistant prepares your master content and design, then shows a preview. Check your fixed facts—name, contact details, employers, dates and education—once. No manual JSON editing is needed.

If tools need manual installation, use [Node.js LTS](https://nodejs.org/en/download) (22.13+) and [LibreOffice](https://www.libreoffice.org/installation-instructions/). Return to the assistant and say **“Done—continue setup.”**

## 5. Paste the whole job-posting page

Copy all text from the **individual job's page**, including the company name, title, location and JD. No cleanup or separately typed company field is needed.

```text
Tailor my resume for the job in the page text below. Use my saved master content and design. Identify the company, role and requirements yourself; ignore menus, cookie notices and unrelated recommended jobs. Follow the project instructions and build the PDF.

Full job-posting page text:
<paste everything copied from the individual job page>
```

The agent extracts the target job, saves the relevant JD and builds the PDF. It only needs clarification if multiple target roles are equally plausible. If asked about pages, reply **“Keep it to one page”** or **“Two pages are fine.”**

## 6. Open the saved PDF

The assistant gives you its full path, usually `output/<Company>/<first>_<last>_resume.pdf`. Check its layout/contact details and any estimated figures.

For the next job, open the same local project folder, launch your assistant and paste the next job posting. No repeat installation or onboarding is needed for the same master.
