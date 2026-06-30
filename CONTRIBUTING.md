# Contributing to RenewablePulse

This is a portfolio project, but it is developed with the same discipline as a
production codebase. The git history is intended to be readable as a record of how the
work was reasoned about and shipped.

## Workflow — GitHub Flow

1. **Branch off `main`.** `main` is always deployable and is protected (no direct
   pushes; changes land via pull request).
2. **One focused change per branch/PR.** A PR should be reviewable in ~15 minutes and
   describable in a single sentence without the word "and". Prefer several small PRs
   over one large one.
3. **Open a PR** using the template. Explain *why*, not just *what*, and link the
   relevant issue.
4. **CI must pass** (`ruff` + `ty` + `pytest`) before merge.
5. **Squash-merge** into `main`; the head branch is deleted automatically. This keeps
   `main` linear, with one commit per reviewed change.

## Branch naming

`<type>/<short-kebab-summary>` — e.g. `feat/fuelinst-ingestion`,
`chore/compose-stack`, `ci/github-actions`, `docs/readme-update`.

## Commit & PR titles — Conventional Commits

Use `feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`, `test:`, `perf:`.
The squash-merge commit takes the PR title, so the PR title *is* the changelog entry.

## Planning

- **Milestones** track the five delivery phases.
- **Issues** are individual units of work (≈ one PR each), assigned to a milestone.
- Reference issues from PRs with `Closes #<n>`.

## Local checks

```bash
uv run ruff check .
uv run ty check
uv run pytest
```
