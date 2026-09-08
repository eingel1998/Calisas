# Turso CLI — less-common commands

Pulled in from SKILL.md only when the task actually needs one of these.
Source: https://docs.turso.tech/llms.txt (full command index).

## Backup / restore a hosted database

```bash
turso db export <name> [--output-file db.sqlite] [--overwrite] [--with-metadata]
turso db import ~/path/to/database.db [--group <group-name>]
```

`export` writes a local snapshot — note it may lag the very latest writes.
`import` requires the source file to be in WAL journal mode.

## Groups

```bash
turso group list
turso group create <name> [--location <region-code>] [--canary] [-w|--wait]
turso group update <name>          # apply pending upgrades to the group
turso group destroy <name>         # irreversible — confirm with the user first
turso group transfer <name> <org>  # move a group to another org
turso group unarchive <name>       # bring back an auto-archived (free-tier idle) group
```

Group-scoped tokens (cover every database in the group):

```bash
turso group tokens create <group-name> [--expiration <dur>] [--read-only]
turso group tokens invalidate <group-name>
```

## Database inspection

```bash
turso db inspect <name>            # storage/row-level stats
turso db locations                 # list available region codes for --location
```

## Access-rule config (network allow-listing)

```bash
turso db config allow-rules show <name>
turso db config allow-rules set <name> --allow "0.0.0.0/0"
turso db config allow-rules clear <name>
```

## Org / billing / members

```bash
turso org list
turso org switch <org>
turso org create <name>
turso org billing
turso org members list
turso org members invite <email>
turso org members add <username>
turso org members rm <username>
```

## API tokens (account-level, not per-database)

Used for programmatic access to the Turso platform API itself (CI/CD
pipelines that manage infrastructure), distinct from the per-database
connection tokens covered in the main SKILL.md.

```bash
turso auth api-tokens mint <name>
turso auth api-tokens list
turso auth api-tokens revoke <name>
```

## Plan management

```bash
turso plan show
turso plan select
turso plan upgrade
turso plan overages enable
turso plan overages disable
```
