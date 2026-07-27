<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

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
