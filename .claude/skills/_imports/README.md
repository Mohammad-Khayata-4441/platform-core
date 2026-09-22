# `.ai/skills/_imports/` — Imported Skills

Curated subset of skills imported from
[`sickn33/antigravity-awesome-skills`](https://github.com/sickn33/antigravity-awesome-skills)
(V12.0.0) under the upstream MIT license.

## What lives here

| Layer | File | Purpose |
|-------|------|---------|
| Wrapper | `<id>/SKILL.md` | Loads into the agent. Contains the ERP-specific trigger + the upstream body verbatim. |
| Upstream copy | `<id>/UPSTREAM.md` | Verbatim original from `sickn33/antigravity-awesome-skills`. Used for diff/refresh. |

The wrapper's frontmatter tags it with `source`, `upstream`, and `license` so the
provenance is auditable in the agent.

## Currently imported (28)

### Stack-specific
`nestjs-expert` · `prisma-expert` · `monorepo-architect` · `turborepo-caching` ·
`zod-validation-expert` · `openapi-spec-generation` ·
`nextjs-app-router-patterns` · `typescript-expert`

### Backend / API design
`backend-dev-guidelines` · `api-design-principles` · `api-patterns` ·
`database-migration`

### Frontend
`frontend-developer` · `react-best-practices` · `shadcn`

### Architecture / DDD
`ddd-tactical-patterns` · `architecture-patterns` ·
`architecture-decision-records`

### Testing / quality
`test-driven-development` · `systematic-debugging` · `e2e-testing-patterns` ·
`playwright-skill` · `code-review-checklist`

### Security
`api-security-best-practices` · `auth-implementation-patterns`

### Anti-slop / quality workflow (also promoted to `.ai/rules/code-quality.md`)
`andrej-karpathy` · `verification-before-completion` · `lint-and-validate`

## Refresh procedure

1. Update the snapshot:
   ```powershell
   git -C C:\Users\LOQ\AppData\Local\Temp\aas-snapshot fetch --depth 1 origin v12.0.0
   git -C C:\Users\LOQ\AppData\Local\Temp\aas-snapshot reset --hard origin/v12.0.0
   ```
2. Re-run the wrapper generator:
   ```bash
   pnpm tsx scripts/wrap-imported-skills.mjs
   ```
3. Review diffs in `UPSTREAM.md` files for breaking changes.
4. Commit.

The trigger table is hand-curated inside `scripts/wrap-imported-skills.mjs`.
If a skill's purpose in this ERP changes, edit only its entry in the
`TRIGGERS` map.

## Rollback

To remove all imported skills:

```bash
git rm -r .ai/skills/_imports/
```

…then revert the two lines referencing `_imports/` in `AGENTS.md` and the
entry for `code-quality` in `.ai/rules/` (if desired).

## License

All imported content is MIT, © the original authors of
`sickn33/antigravity-awesome-skills` and the cited source repositories
(linked in each wrapper's frontmatter).
