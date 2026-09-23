# @core/scaffold

The `create-core-app` CLI. Copies the `platform-core` template into a new
directory and runs the scaffold transforms (rename scope, prune the `items`
example, reset git).

## Usage

```bash
# from a clone of platform-core
node packages/scaffold/bin/create-core-app.mjs my-app
# or, if installed/linked
pnpm create core-app my-app
```

Non-interactive (CI):

```bash
SCAFFOLD_NAME=my-app SCAFFOLD_SCOPE=acme SCAFFOLD_KEEP_UI=1 \
  node packages/scaffold/bin/create-core-app.mjs my-app
```

## In-place alternative

If you cloned the template yourself:

```bash
pnpm setup
```

Both paths run the same logic in `scripts/scaffold.mjs`.
