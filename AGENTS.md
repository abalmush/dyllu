<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# 1C integration context

Before work on 1C connectivity, catalog sync, price sync, or MCP analysis, read
[`docs/one-c-integration.md`](docs/one-c-integration.md). It contains the
verified endpoints, data rules, security limits, live test results, and open
questions.

# DYLLU MCP context

Before MCP authentication, user onboarding, permission, ChatGPT setup, or tool
work, read [`docs/dyllu-mcp.md`](docs/dyllu-mcp.md).

# Concurrent sessions — work in a git worktree

More than one agent session often runs against this repo at the same time. Do
feature work in your own worktree, never in the shared checkout:

```bash
git worktree add ../DYLLU-<feature> -b codex/<feature>
```

The shared checkout has one git index and one set of dev-server ports, so a
second session in it will collide with the first. Observed failures: commits
landing on another session's feature branch, and `git commit` sweeping up a
file another session had staged.

When you must work in the shared checkout anyway:

- Never `git add -A` or `git commit -a`. Stage explicit paths and prefer
  `git commit --only <path>`, which ignores anything else already staged.
- Run `git show --stat HEAD` after committing and confirm only your files
  landed. If not, `git reset --soft HEAD~1` and redo it with `--only`.
- Before killing a dev server or taking a port, check `ps -ef` for who owns it.
  Start your own on a free port (`PORT=9091 …`) instead of reclaiming 9000.

# Production safety — non-negotiable

Production availability takes priority over cleanup, hardening, refactoring, and
deployment convenience.

- Never invent or infer production configuration, infrastructure topology,
  environment variables, credentials, network behavior, or provider settings.
  Inspect the real configuration read-only. If it cannot be verified, stop and
  ask the user.
- Never add, rename, remove, validate, or change the meaning of a production
  environment variable without first inventorying the variables currently
  configured in the deployment platform and confirming compatibility.
- A new production-required variable is forbidden in a one-step rollout. Use a
  backward-compatible default first, deploy and verify it, then ask the user for
  explicit approval before making the variable mandatory in a later rollout.
- Before changing startup configuration, container commands, health checks,
  migrations, deployment workflows, ports, CORS, authentication, databases,
  Redis, storage, DNS, or CDN/security rules, present the discovered production
  facts, the proposed change, required values and their sources, expected
  impact, verification procedure, and rollback procedure. Wait for explicit
  user approval before mutating production or committing a change that can
  prevent startup.
- Never assume that a successful build, typecheck, unit test, or local container
  test proves production compatibility. Preflight the built artifact against a
  sanitized inventory of the actual production configuration and verify the
  startup path before deployment.
- Deployments must preserve the last known-good service until the replacement is
  healthy. Do not introduce a workflow that removes or stops the healthy
  container before the candidate passes its health check.
- After any approved production-affecting change, verify the container status,
  restart count, internal health check, public health endpoint, admin endpoint,
  and storefront. Report the exact results.
- If production becomes unhealthy, stop feature work. Diagnose read-only first,
  state the exact cause and recovery action, and ask for approval before any
  destructive action, credential rotation, rollback, migration, or data change.
- Never modify seeds, catalog data, migrations, or production data unless the
  user explicitly places that data work in scope.

If any rule conflicts with speed or convenience, follow the safer rule and ask
the user.
