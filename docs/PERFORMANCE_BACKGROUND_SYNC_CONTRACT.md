# Performance, Background Sync and Network Lifecycle Contract

## Status and Purpose

This contract incorporates the user's `pasted_content.txt` requirement into the AP Service MPA migration. It supplements `ARCHITECTURE_CONTRACT.md`, `DATA_CONTRACTS.md` and `PAGE_ROUTE_MANIFEST.md`; it does not replace or delete the legacy applications.

> **Invariant:** A document navigation must render its static shell immediately. Data requests, notifications, badges, statistics and secondary content must never delay the navigation or first usable UI.

## Data Priority Model

| Priority | Definition | Examples | Runtime rule |
|---|---|---|---|
| P0 | Required to protect access or render the shell correctly | Session state, page shell, role guard | Resolve first. Do not wait for non-security data. |
| P1 | Main data needed for the page's primary task | The current order, store/menu list, Admin order table | Start after the shell mounts. Render a local loading region rather than blocking the document. |
| P2 | Useful operational context that can arrive later | Badge count, notifications, dashboard counters, recent activity | Cache-first, background refresh; update only its own component. |
| P3 | Data requested only after explicit intent | Reports, historical data, media outside viewport, proof viewer | Load on demand only. |

## Request Lifecycle Rules

Every new MPA request layer must provide the following behavior.

| Rule | Required behavior |
|---|---|
| Shell first | Render navigation and interactive structure before issuing P1/P2/P3 work. |
| Parallel only when independent | Start unrelated requests together; keep dependent operations in their required order. |
| Request deduplication | Reuse a request already in flight for the same page key and parameters. |
| Cancellation / stale protection | Associate requests with a page lifecycle token or abort signal. A response from a page that the user has left must not mutate the new page. |
| Cache boundary | Cache static/non-critical data only. Auth, permissions, finance, payment and server-enforced rules remain verified against Supabase/RLS. |
| Partial update | A background response may update its component; it must not reload the full page, reset a form or redirect the user. |
| Error isolation | A P2/P3 failure must show a Thai error state in that region and must not make the page unusable. |

## Scoped Background Sync

The system must not poll every table on a fixed interval. When a foreground page needs refresh, it may monitor only the role-specific scope below, preferring Supabase Realtime/event-driven updates for high-freshness changes.

| Application | Scoped data | Preferred model |
|---|---|---|
| Customer | Current order/delivery status and customer notifications | Realtime for current order; bounded background refresh only when needed |
| Merchant | New orders, owned-store order status and store notifications | Realtime for assigned/owned order scope; no catalog-wide polling |
| Rider | Available jobs, current delivery status and rider notifications | Realtime for job/current delivery; bounded refresh when page is foreground |
| Admin | Pending orders, operational badges and important notifications | Cache-first counters with background refresh; event-driven operational updates where configured |

If an update returns unchanged data, the DOM must not be rewritten. Background sync must pause or be reduced while a document is hidden.

## Media Lifecycle

Media cannot delay first render. Files outside the viewport must be lazy-loaded where appropriate. Upload operations follow the mandatory path below and report only measurable progress.

```text
Select image → validate MIME/size → resize/compress → upload bytes → verify Storage URL → persist database path/URL → reload/render check
```

The Shared Media Service enforces final image size at or below 1 MB and reports green progress stages/byte progress. Public catalog media uses `catalog-media`; payment and identity proofs remain private workflows and must not be moved into the public bucket.

## Measurement and Reporting Gate

No performance claim may say that the application is faster without recorded evidence. Before a milestone is reported as passing, record the following for the relevant routes and workflow.

| Measurement | Required comparison |
|---|---|
| Network waterfall and request count | Before/after route request list, including duplicate request count |
| First render | Time until shell and primary controls are usable |
| Navigation timing | Click/document navigation to shell render; network must not block it |
| Background sync | Scope, cadence/event source, changed-vs-unchanged DOM updates, and hidden-page behavior |
| Image pipeline | JPG, PNG, WebP, large source image, Android and desktop end-to-end results |
| Role behavior | Customer, Admin, Merchant and Rider authorization/RLS results |

The final report must identify measured before/after values, request counts, timing, problems found, fixes, changed files, commit SHA and test results. Any untested authenticated/device-specific path must be stated as pending rather than inferred.

## Legacy and Rollback Safety

No legacy application, function or data contract may be removed until the applicable MPA workflow passes functional, security, performance and regression tests with a documented rollback commit.
