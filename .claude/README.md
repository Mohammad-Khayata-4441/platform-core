# Claude Code — Team Setup

This folder configures **Claude Code** for the platform-core monorepo.
Cursor teammates use `.cursor/`; Claude teammates use `.claude/` + root `CLAUDE.md`.

## First-time setup

1. Install [Claude Code](https://code.claude.com/docs/en/overview)
2. Open this repo and run Claude Code from the project root
3. When prompted, **install and trust** project plugins:
   - `superpowers@claude-plugins-official` — brainstorming, plans, verification
   - `typescript-lsp@claude-plugins-official` — TypeScript intelligence
4. Sync skills (after pulling skill updates):
   ```bash
   node scripts/sync-claude-artifacts.mjs
   ```

## What loads automatically

| Artifact | Location | Purpose |
|----------|----------|---------|
| Project memory | `CLAUDE.md` (root) | Rules + skills via `@` imports |
| Claude extras | `.claude/CLAUDE.md` | Workflow, commands, team conventions |
| Path rules | `apps/api/CLAUDE.md`, `apps/dashboard/CLAUDE.md`, … | Auto-load when cwd is under that path |
| Skills | `.claude/skills/*/SKILL.md` | Invocable via `/skill-name` (synced from `.ai/skills/`) |
| Plugins | `.claude/settings.json` → `enabledPlugins` | Superpowers + TypeScript LSP |
| Permissions | `.claude/settings.json` → `permissions` | Allow `pnpm`, deny `.env` reads |

## Canonical source

**`.ai/`** is the portable source of truth (Claude, Cursor, OpenCode).

| Change | Edit | Then |
|--------|------|------|
| Rule | `.ai/rules/<name>.md` | Update matching `CLAUDE.md` @ import if needed |
| Skill | `.ai/skills/<name>/SKILL.md` | Run `node scripts/sync-claude-artifacts.mjs` |
| Plugin | `.claude/settings.json` | Commit — team gets on next pull |
| Spec / plan | `docs/superpowers/` | No sync needed |

## Common workflows

### New CRUD feature

```
/caveman Add brands catalog CRUD
```

Or manually:

1. Copy `docs/superpowers/templates/spec-template.md` → `docs/superpowers/specs/`
2. Get design approval
3. Use skills: `add-crud-feature`, `feature-scaffold`

### Check available skills

```
/skills
```

### Browse plugins

```
/plugin
```

## Superpowers plugin skills (external)

When superpowers is enabled, these load from the official marketplace:

- `brainstorming` — design before code
- `writing-plans` / `executing-plans` — plan lifecycle
- `verification-before-completion` — evidence before "done"
- `systematic-debugging` — structured debugging
- `subagent-driven-development` — parallel task execution

## Local overrides (not committed)

Create `.claude/settings.local.json` for personal permission tweaks.
Create `CLAUDE.local.md` for personal preferences.

## Related docs

- [docs/ai-engineering.md](../docs/ai-engineering.md) — full AI workflow
- [docs/superpowers/README.md](../docs/superpowers/README.md) — spec-driven development
- [AGENTS.md](../AGENTS.md) — agent entry point (all tools)
