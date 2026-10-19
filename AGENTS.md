<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep financial benchmark/gap calculations in browser-safe pure modules, shared by the dashboard and executive report, so both use identical diagnostic rules.
- Keep the root route's loader/component split grouping intact to avoid the previously failing dynamic component chunk.
- Export the executive dossier through a print window with captured chart images; open it synchronously and wait for images before printing to preserve browser activation and visual fidelity.
