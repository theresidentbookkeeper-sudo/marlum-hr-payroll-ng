# Architecture and roadmap

## Today (Phase 1, done)
Single 700 KB `index.html` split into `public/index.html`, 10 CSS files and
18 JS files. Behavior is unchanged: the split rebuilds byte-for-byte into the
original file, and the page loads identically in a headless browser. Cloudflare
Pages config added. Nothing deployed.

## Phase 2: real backend
- Move the single JSON state row into Supabase tables (employees, loans, cycles,
  attendance, adjustments, audit_log) with row-level security by role.
- Move payroll calculation and cycle locking server-side so the browser can no
  longer overwrite figures (the stale-tab problem).
- Replace the shared global scripts with ES modules, one per area.

## Phase 3: Fidelity Bank payments
Needs a signed API agreement between Fidelity and the account holder (Marlum).
Design rules:
- Payment calls run only in `functions/` with secrets in Cloudflare.
- Maker-checker approval before any payment file is released.
- Idempotency key per payment line so a retry can never pay twice.
- Immutable audit log of who approved what and the bank response.
- Reconcile Fidelity status callbacks against locked cycles.

## Phase 4: Biometrics
Clock-in feed from the chosen device into the attendance tables (the CSV
import format is the interim path). Needs a sample export from the device.

## Phase 5: Android
Installable app (PWA first, Play Store wrapper after) over the same backend.
