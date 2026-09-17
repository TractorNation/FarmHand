# AI Disclosure

FarmHand was initially build entirely by Team 3655 students, with mentor assistance. As the project expanded and additional features were added, we began utilizing [Claude](https://claude.com/claude-code) (Anthropic) as a coding assistant and review tool.

This document records where Claude was used, which features were developed using Claude (and to what extent), and the process through which Claude reviewed code and made assessments to provide guidance during development. The intent of this document is to allow anyone reading, contributing to, or forking this codebase to be aware of the role AI has played in development of this application.

Every change described here was requested, reviewed, and committed by a human. No commit reached `main` without someone reading it first. This document will continue to be updated to correlate with AI usage throughout development and maintenance of this application.

## Scope

| | |
| --- | --- |
| Assistant | Claude (Opus and Sonnet) via Claude Code |
| Active period | April 2026, July - August 2026 |
| Sessions | ~13 substantive working sessions |
| Commits Co-Authored by Claude | 5 |
| Commits with AI-assisted content overall | Substantially more than 5 - see [Commit attribution](#commit-attribution) |
| Human review | All changes; every commit reviewed, authored, and pushed by a real person |

## Commit attribution

Five commits are explicitly Co-Authored by Claude.
All five are from August 2, 2026:

| Commit | Subject |
| --- | --- |
| `2d13d81` | Fix QR scanner holding three concurrent camera handles |
| `c5ae140` | Disable WebKitGTK's DMA-BUF renderer on Linux |
| `8eaa88a` | Update Rust dependencies to realign Tauri crates with JS packages |
| `f4e034b` | Upgrade react-router to 8.3.0 to clear CSRF advisory |
| `792d702` | Ignore machine-local cargo build tuning |

**This attribution understates the actual contribution.** This was a small portion of a much larger effort over the course of multiple weeks without regular commits to the branch. Additionally, most AI-assisted changes landed in commits authored solely by one contributor, including the largest one in the project's history:

| Commit | Date | Subject | Diff |
| --- | --- | --- | --- |
| `493c3ba` | 2026-07-31 | Refactoring + New Features | 148 files, +18,311 / -4,295 |
| `98e3677` | 2026-08-02 | Various fixes | 14 files, +216 / -82 |
| `39b530c` | 2026-08-02 | Fix malformed eol attribute in .gitattributes | 1 file |
| `d815419` | 2026-08-03 | iOS file saving fix | 5 files, +53 / -3 |
| `b90167a` | 2026-08-25 | Bug fixes from 7/30 | 17 files, +778 / -311 |
| `8723476` | 2026-08-25 | Commit 2 electric boogaloo | 2 files, +21 |
| `70e2e2d` | 2026-08-25 | Fixing versioning | 6 files, +7 / -7 |

Consider the July 30 - August 25, 2026 window as the timeframe where AI assistance was routine, rather than treating the five Co-Authored commits as the boundary.

## Usage

### Refactor and cleanup

Codebase-wide review for dead code, oversized functions, and duplicated logic, followed by a staged refactor. Significant structural changes include:

- `ChartRenderer.tsx` 624 lines decreased to ~70. Now a rendering-only utility, with one component per
  chart type extracted to [`src/ui/charts/`](src/ui/charts/).
- `useProcessedData.ts` ~799 lines relocated into a new [`src/analysis/`](src/analysis/)
  module - `aggregate.ts`, `coerceValue.ts`, `fieldRefs.ts`, `groupData.ts`, and a
  `series/` directory per chart family.
- The original QR encoding path was removed rather than kept behind a version check,
  on the developer's decision that old codes did not need to remain readable (see [QR code payload size reduction](#qr-code-payload-size-reduction) below).
- Consolidated field-reference parsing into `analysis/fieldRefs.ts`. Functionality originally duplicated across nine call sites.

ESLint config, CI workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), were added in the same pass. An `npm run check` script was also added, running typecheck, lint, and tests all at once.

### QR code payload size reduction

Almost entirely written by Claude, with oversight from a developer. This was a particularly complex change to improve data transfer functionality for schemas and match data. QR codes for matches were changed from a JSON payload to a bit-packed binary encoding wrapped in Base45 (RFC 9285), so payloads stay inside the QR alphanumeric charset at 5.5 bits per character instead of byte mode's 8. This was a change that was originally proposed by Claude during a codebase review, looking for ways to help the application operate more efficiently.

This also ended up bringing about a new feature. Since the codes have decreased in size so drastically, they can now be imported in batches- depending on schema complexity, source device screen size, and receiving device camera quality, we estimate up to 30 scouting reports can now be communicated with a single QR code.

New codec modules supporting the QR payload changes are located in [`src/utils/`](src/utils/): `BitStream.ts`, `Base45.ts`, `MatchCodec.ts`, `PathCodec.ts`, `BatchCodec.ts`, `settingsCodec.ts`. A typical match payload is around 114 characters. Path data uses Ramer-Douglas-Peucker (RDP) simplification, grid quantization, and delta encoding before being packed into the payload.

Supporting functionality:

- CRC8 integrity check, validated before parsing.
- Batch container- default cap of 30 reports per code, lowered dynamically when the active schema is text-heavy enough that 30 reports would exceed QR v40 capacity at error-correction level Q.
- [`docs/WIRE_FORMAT.md`](docs/WIRE_FORMAT.md) - a 704-line specification written for use outside this repository, since our data-analysis pipeline has to decode these payloads independently (when being processed outside the Data Analysis page of this app)

### Linux build compatibility

Packaging and runtime support for Linux.

- Added `.AppImage`, `.deb`, and `.rpm` to the release workflow.
- Disabled WebKitGTK's DMA-BUF renderer to prevent graphical issues.
- Realigned Rust dependencies with JS Tauri packages. This needed to happen anyway, but wasn't really an issue until we tried to get this working on Linux.
- Added info in README for prerequisites, download guidance, and a Linux troubleshooting section addressing potential blank-window and camera-access issues.

### UI changes to the Scouting and QR pages

**Scouting:** Restructured flow of the form so each section is its own screen. Added a Next button that validates required fields in that section before allowing the scouter to progress the form ([`src/ui/scout/ScoutStepper.tsx`](src/ui/scout/ScoutStepper.tsx)).

**QR page:** Dialogs now scrollable. Preview added so a saved code can show recorded data in-app. Updated dialogue layout according to device orientation (or window proportions on a desktop):

- Landscape: QR code/match data (depending on view option selected) on left, action buttons on right
- Portrait: No change (vertically-stacked layout)

### Path drawing component

Almost entirely written by Claude, with oversight from a developer. We had an approximate idea of how we wanted to go about this, but no knowledge of the algorithms required to handle data compression and consolidation for QR code packing.

Created [`src/ui/components/PathInput.tsx`](src/ui/components/PathInput.tsx) - a component for
drawing robot paths over an image of the playing field. Built with intent to be used specifically for tracking robot activity during an autonomous period, but could be used to trace pathing during other match phases as well.

- Path and robot actions trackable in same UI (incl. full screen button to reduce accidental scrolling).
  - Fullscreen overlay shown via MUI [portal](https://mui.com/material-ui/react-portal/) in body to resolve a graphical flickering bug.
- Robot actions and game pieces defined in schema. Game pieces capped at 3.
  - Will be increased if a FTC/FRC game releases with 4+ game pieces.
- Default playing field saved in app, can be overridden per-schema, and/or updated to a user-defined default image by uploading your own.
  - Because schemas transfer between devices by QR code, images aren't transferred directly, and the image shown will be the default/system setting if the image reference in the schema is invalid on the receiving device.
- Field orientation rotation button, so a scout on the opposite side of the arena sees the field from their own perspective. The choice persists across matches until changed. Pathing data in QR code is absolute, such that the same path drawn from either perspective will be identically stored.
- Full-width layout within its section (defined by new config flag to set components as 'full width', see [`src\config\componentTypes.ts`](src\config\componentTypes.ts)) while keeping schema configuration consistent with other components.

### Test coverage

Fully written/implemented by Claude. There was no automated testing before this work. The current suite is 28 test files and 458 test cases, built after a risk-ranked review of which untested areas mattered most.

Coverage concentrates on the codec layer (`Base45`, `BitStream`, `MatchCodec`, `PathCodec`,
`BatchCodec`, `QrRoundTrip`), state and storage (`StoreManager`,
`useFolderManager`, `SchemaResolve`, `SchemaWire`), and UI behavior (`DynamicComponent`,
`ScoutStepper`, `InputCard`). Shared harness code found in [`src/test/`](src/test/).

### Maintenance and bug fixes

- 2x iOS file export failures: First fix using save-dialog fallback, fixed again later when a branch was merged incorrectly.
- Added functionality to the "Clear All Data" button in Settings that originally did nothing.
- QR scanner holding three camera handles concurrently - fixed during Linux compatibility effort.
- react-router updated to 8.3.0 to clear a CSRF advisory.
- Schemas in `src/config/schema` are now discovered automatically instead of requiring
each filename to be registered elsewhere.
- Version number updates throughout app/documentation to meet various workflow requirements.

## How the work was reviewed

- Every change was reviewed by a developer before being committed to the repository. Hands-on testing regularly uncovered various bugs, which were reported back and addressed via several follow-up sessions.
- A dedicated review pass was run over the diff specifically to strip AI-generated artifacts: over-explanatory comments, unnecessary defensive branches, `any` casts used to sidestep type errors, and patterns inconsistent with the surrounding code.
  - This was done not to obfuscate AI impact/usage, but to reduce bloat and lower potential for misunderstandings arising from in-line documentation of historical information that holds no long-term relevance. Keeping the code following a standard 'style' allows for students to learn patterns established in the codebase, and help with future development and troubleshooting.
- `npm run check` (typecheck, lint, tests) was run after each refactor step, and CI runs it on every push.
- Larger refactorign efforts were planned prior to implementation, including a documented mapping of which existing functions were being split into what and which call sites would use them.

## Disclosure Purpose

FarmHand is licensed and used by FTC and FRC teams who may want to fork, audit, or otherwise use, and trust its data handling. The specifics of what AI has touched, and how closely it was supervised, must be available for transparency, and accountability for our organization, as well as the long-term sustainability of the application itself. This file will be updated if AI assistance is used substantially again.
