# Deferred: Main-App Biometric Management UI

**Date:** 2026-09-07  
**Status:** Deferred intentionally — do not start implementation yet.

## Context

The attendance integration itself is already working through the current production path:

```text
ZKTeco device
→ biometric-service (local Windows Service)
→ outbound HTTPS Web Bridge
→ main app / Railway
→ production TiDB
```

The current main-app sidebar item **"وحدة البصمة"** opens the local biometric-service Admin UI at `http://127.0.0.1:9096`.

The user clarified that older biometric-related UI/code inside the main app is legacy/dead code from an earlier attempt and must **not** be treated as the current biometric implementation baseline.

## Deferred goal

Later, replace the direct local link with a true **"وحدة البصمة" page inside the main application**.

The new page should reuse the existing live biometric-service administration concepts/features as much as practical, rather than rebuilding biometric logic from zero.

Expected sections may include:

- Overview / service status
- People
- Devices
- Events
- Reports
- Issues / review
- Person/device linking
- Historical Final Event reprocessing

## Required architecture direction

Do **not** expose local ports `9096` or `9097` directly to the public Internet.

Because Railway cannot reach local `127.0.0.1`, the future main-app page must use a secure management communication layer (Management Bridge or equivalent) between the public main app and the local biometric-service.

Conceptual direction:

```text
Main app UI
→ secured main-app API
→ secured outbound management channel
→ local biometric-service
→ ZKTeco device / biometric-service data
```

The exact management-channel design has **not** been implemented yet and must be reviewed before coding.

## Important constraints

- Do not rebuild the proven attendance/Web Bridge flow.
- Do not relink existing workers from scratch.
- Do not rerun all completed attendance tests unless a change affects those paths.
- TiDB actual production database remains the source of truth.
- No SQL mutation, Migration, or `drizzle push` without explicit user approval.
- Keep the biometric device in `mode=test` until the user explicitly approves changing it.
- Never expose tokens, biometric templates, images, passwords, or raw sensitive device payloads.
- Legacy/dead biometric UI files inside the main app must not be assumed authoritative.

## Future portability requirement

Design the management integration so that a later move of the main application from Railway to a company-local server requires mainly configuration/endpoint changes, not rebuilding the biometric UI or attendance integration from scratch.

## Resume point

When this topic is resumed, start with:

1. Inspect the **live** biometric-service Admin UI and its current API contracts.
2. Define a secure Management Bridge contract between main app and biometric-service.
3. Only after that, integrate the management UI into the main app.

Do not start by reviving the old/dead biometric UI code in the main application.
