# Install, launch, then let the agent guide setup

The [visual guide](guide.html#step-1) shows the setup for both assistants, including clearly labelled launch-screen illustrations.

## Claude Code

Install with the [official quickstart](https://code.claude.com/docs/en/quickstart):

- Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`
- macOS/Linux: `curl -fsSL https://claude.ai/install.sh | bash`

Reopen a terminal in your chosen local work folder. **Run `claude` and press Enter to launch the chat.** Complete browser sign-in using a supported subscription, Console/API or organization account. The first-run trust/access prompts depend on the installed version. `claude --version` is only an optional version check.

## Codex

The [official standalone installer](https://github.com/openai/codex#quickstart) does not require Node.js first.

Windows PowerShell:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

macOS/Linux:

```sh
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Reopen a terminal in your chosen local work folder. **Run `codex` and press Enter to launch the chat.** Choose **Sign in with ChatGPT** if that is your account route, complete browser sign-in, and return to the prompt. `codex --version` only checks the version. Older Windows npm installations may use `codex.cmd` if PowerShell blocks the `.ps1` launcher.

## What to paste after launch

Use the [setup message](guide.html#step-3). It gives the agent the repository URL and asks it to obtain the project, read its instructions, check/install permitted prerequisites, run setup/doctor, and pause to guide you when the master resume is needed. A project that already exists locally should be reused.

The agent needs local files, terminal and network access; authentication/installation prompts may need you to act. Keep your original resume intact and share a file path or copy it into the named `resume/source/` folder when asked.

Once the master is ready, paste the **whole individual job-posting page text**. The agent should identify the company and role and ignore page clutter. A separate company-name field is not required.

| What you type | Where it goes |
|---|---|
| Installation command, `claude` or `codex` | Terminal / PowerShell |
| Project setup message, master path, copied job post | Inside the launched assistant chat |

The repository includes both `CLAUDE.md` and `AGENTS.md`. Either assistant can use the same saved master; don't edit the same resume concurrently with both. A normal website chat does not automatically have access to the local project. Your AI provider controls account access, usage limits and charges.
