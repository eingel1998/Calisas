---
name: turso-cli
description: Use the Turso CLI (the hosted libSQL/SQLite-edge platform at turso.tech — not the embedded tursodb engine) to create and inspect databases, mint auth tokens, manage groups/replicas, and run SQL from the terminal. Trigger this whenever the user mentions Turso, TURSO_URL, TURSO_TOKEN, libsql deployment, "turso db", moving a local SQLite file to production, or asks to promote a local sqlite/libsql app to a hosted/edge database — even if they don't say "CLI" explicitly.
---

# Turso CLI

Turso is a hosted, SQLite-compatible database platform (libSQL) with edge
replication. This skill covers the `turso` command-line tool for creating and
operating databases — not `tursodb`, the separate in-process embedded engine
(different product, different CLI).

## Before running anything destructive

`turso db destroy`, `turso group destroy`, and `turso db tokens invalidate`
are irreversible or immediately break running connections. Confirm the target
database/group name with the user before running them — never infer intent
from a vague "clean up the databases" request.

## Install

Turso's own installer is a `curl | bash` one-liner. That pattern executes
whatever is at that URL with no local review, so prefer Homebrew when
possible and only fall back to curl if Homebrew isn't available. Tell the
user which path you're taking before running it.

```bash
# macOS/Linux, preferred
brew install tursodatabase/tap/turso

# fallback (macOS/Linux/WSL) — only if brew is unavailable
curl -sSfL https://get.tur.so/install.sh | bash
```

Windows requires WSL; run the curl command inside a WSL shell.

Verify: `turso --version`

## Authenticate

```bash
turso auth login          # opens a browser
turso auth login --headless   # for WSL/remote/no-GUI environments — prints a URL instead
turso auth whoami
```

## Everyday database workflow

```bash
turso db list [--group <name>]
turso db create <name> [--group <name>]
turso db show <name>                # id, group, region, size
turso db show <name> --url          # the libsql:// URL your app connects to
turso db shell <name>               # interactive SQL shell
turso db shell <name> "SELECT * FROM muestras LIMIT 5"   # one-off query, no interactive session
turso db destroy <name>             # irreversible — confirm with the user first
```

## Minting an app connection token

This is almost always what the user actually wants when they say "connect my
app to Turso" or ask about `TURSO_TOKEN`.

```bash
turso db tokens create <name> --expiration 30d
turso db tokens create <name> --read-only --expiration 30d   # read-only client
turso db tokens create <name> --expiration never              # long-lived; prefer a real expiration unless the user asks for never
```

`turso db show <name> --url` + a minted token are exactly `TURSO_URL` and
`TURSO_TOKEN` — the two env vars a `@libsql/client` (or any libSQL SDK)
config expects. When wiring up an app, set both in the project's `.env`, not
the shell history.

## Groups and replication

Groups are how you place a database in a region and add read replicas near
your users.

```bash
turso group list
turso group create <name> --location <region-code>   # e.g. sjc, fra, syd
turso db create <name> --group <group-name>
```

See `references/commands.md` for group/org/token subcommands not covered
above (transfers, AWS migration, API tokens, org member management) — only
pull that file in if the task actually needs one of those.

## Local dev without a hosted database

```bash
turso dev              # runs a local libSQL server for development
turso db shell http://127.0.0.1:8080   # connect to it
```

Useful when the user wants to test libSQL-specific behavior without creating
a hosted database yet.

## Moving a local SQLite/libSQL app to Turso

This is the most common reason this skill triggers: a project that currently
points at `file:./something.db` and wants to go live.

1. `turso db create <name> --from-file ./local.db` (or `--from-dump` for a
   `.sql` dump) — seeds the hosted database from what already exists locally.
2. `turso db show <name> --url` → set as `TURSO_URL`.
3. `turso db tokens create <name> --expiration 30d` → set as `TURSO_TOKEN`.
4. Point the app's libSQL client config at both. If the app already branches
   on `TURSO_URL` being set (common pattern: `file:./x.db` fallback when
   unset), no code change is needed — only the env vars.
