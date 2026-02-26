# OpenWork i18n Refactor Checklist

- [ ] Phase 0: Freeze scope and confirm target languages (en/zh first).
- [ ] Phase 0: Define string ownership by layer (app/web/server/orchestrator/router/tauri).
- [ ] Phase 0: Decide non-localized surfaces (internal logs/diagnostics).

- [ ] Phase 1: Fix locale parity (missing keys in en/zh).
- [ ] Phase 1: Add parity CI check (fail build when en/zh key sets diverge).
- [ ] Phase 1: Normalize key naming conventions and namespaces.

- [ ] Phase 2: Migrate all P0 rows from CSV (UI visible copy first).
- [ ] Phase 2: Replace hardcoded placeholders/titles/toasts/errors with i18n keys.
- [ ] Phase 2: Remove direct English literals from settings/session/dashboard critical paths.

- [ ] Phase 3: Migrate P1 rows (API/user-facing backend and CLI status/errors).
- [ ] Phase 3: Keep internal diagnostics/logs in English unless product explicitly requires localization.

- [ ] Phase 4: AI language alignment.
- [ ] Phase 4: Ensure session prompt context carries current language.
- [ ] Phase 4: Ensure thinking/reasoning labels and surfaced summaries follow selected language.
- [ ] Phase 4: Add fallback rule: user language -> English -> key.

- [ ] Phase 5: Verification.
- [ ] Phase 5: UI walkthrough in zh and en for all user-visible pages.
- [ ] Phase 5: Integration tests for language switch persistence and runtime propagation.
- [ ] Phase 5: Re-run this audit script and require P0=0 before merge.
