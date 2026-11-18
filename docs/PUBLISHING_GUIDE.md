# Publish the visual guide after review

The guide source is `docs/index.html`, with two original launch illustrations in `docs/assets/`. CSS and JavaScript are inline, with no CDN or build step. Keep the assets folder beside the HTML. It works locally and from a GitHub Pages `/docs` source.

## Review locally first

Open `docs/index.html` in a browser. Check Windows/macOS/Linux instructions, the separate installation and launch commands, launch illustrations, setup message, master-folder map and full-post message. There is no checklist, side tracker, JD form or browser storage. Launch illustrations are labelled examples, not screenshots of the reader's actual session.

No GitHub upload or Pages deployment should happen before the owner finishes this review.

## Upload the approved documentation

From the project terminal, **after review**:

```sh
npm run check:public
git add README.md docs/index.html docs/assets/ docs/03-CONNECT-AN-LLM.md docs/PUBLISHING_GUIDE.md AGENTS.md CLAUDE.md LESSONS.md
git commit -m "Add visual beginner guide for Claude Code and Codex"
git push
```

Use `npm.cmd` in place of `npm` in Windows PowerShell if needed. If README links were changed as part of the final review, include `README.md` too.

## Show the guide as a page, not raw HTML

GitHub's ordinary file viewer shows the HTML source. For a browser-rendered guide, configure **GitHub Pages**:

1. Open the repository's **Settings → Pages**.
2. Choose **Deploy from a branch** as the source.
3. Select **main** and **/docs**, then **Save**.
4. Wait for the Pages deployment to finish. Use the **Visit site** link shown by GitHub.

This repository uses the custom Pages URL `https://tailorcv.niteshjainy.online/`. Add that URL to the repository's About section and README after confirming the deployment is live.

GitHub Free requires a **public repository** for Pages. Other plans may support private repositories, but a Pages site can still be publicly accessible. Change visibility only when the owner is ready to launch. See [GitHub's current Pages requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

The guide links the project ZIP on GitHub; readers need repository access while the repository is private. Once the project is public, the ZIP can be downloaded without collaborator access.

## Share on GitHub or LinkedIn

Use the published **GitHub Pages guide URL** in the README and LinkedIn post so beginners see the walkthrough first. The repository URL can be a secondary link for the code. An HTML file uploaded as a normal GitHub file is displayed as source; LinkedIn does not render the HTML guide as an interactive page.

The direct ZIP URL is `https://github.com/niteshjainy/tailorcv/archive/refs/heads/main.zip`. It is a normal HTTPS download link and can be shared from either place; readers still need access while the repository is private. On mobile/in-app browsers they may need to open the link in their regular browser. See [GitHub's source-archive documentation](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives).
