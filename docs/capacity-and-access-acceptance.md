# Capacity and account access acceptance

Date: 2026-10-24. Canonical units: `index.html#knowledge-gui-features`
(bounded trees, independent panes and invalidation) and KN-02 (private evidence).

## Corrected sustained execution on 2026-11-03 UTC

Run `02688f9f0a08` is RUNNING under distinct successor412. It retains the same
million-note corpus, four actual authorization populations,20rps three900-second
windows and100rps one300-second window per population:12000 measured seconds.
Only the declared harness free-socket policy and duplicate-inventory cleanup are
corrected after their separate actual/local RED/GREEN verification. Preparation415
checks unchanged seed/resource methods, operation logic and measurement definitions;
the new host's cleanup tests416 pass3/3. Active deadlines and retry0 are unchanged.

Current direct approval253 covers isolated tests. The operator-selected bound is
10:11:54.073682–15:11:54.073682UTC; it does not reserve the shared host. Supervisor413,
its child and the2GiB/zero-swap systemd scope are observed live at checkpoint420.
Actual SQL verifies1000000 corpus notes and API-readable populations match
1000000/100000/10000/1000. Proof423 verifies the first warmup's1200 raw samples,
all successful with zero errors/missed and exact operation counts. First-window
proof427/432/439 preserve earlier windows. At12:02UTC, proof451 verifies168000
successful measured samples across all eight100%/10% windows, zero unexpected
errors/missed, unique complete request indexes and exact operation counts. Both
populations include three900-second20rps and one300-second100rps window. Independent
SQL452 verifies both completed mutable notes' original owner, structured HUMAN
body and revision/history4261 each,8522 history rows combined. Only8/16 measured
windows are complete; the1% population's first steady window is active. Consult
live checkpoint420 for subsequent observations.
The full workload and final preservation/cleanup are not yet accepted.
Follow the live execution rather than launch another run. Audit completed raw
windows with421/422, then verify independent SQL/S3, input identity and owned cleanup.

Independent read-only observer429 is also running against this exact owned
fixture, bounded by the same end time and the existing main scope. Baseline SQL
verifies1000000 notes/100000 roots/900000 children. Actual S3 LIST/GET verifies the
single16384-byte object and its checksum. These reads are additional to the paced
load. Final four-note revisions/history and a fresh object GET remain pending
before cleanup; the observer performs no writes, stops or restarts.

The target remains the published GUI0.8.0/KMS f40e7a2 frozen tuple. A successful
result would qualify that declared workload, not the unpublished0.8.1 patch.
No new capacity result is claimed yet; the prior failure below remains unchanged.

## Prior sustained result on 2026-11-03 UTC

Run `995d5221d4f9` completes all16 measured windows/3h20min and is FAIL/exit1.
The unchanged20rps workload runs three900-second windows and one300-second100rps
stress window for each100%/10%/1%/0.1% population. Actual readable note counts are
1000000/100000/10000/1000. Raw proof355 verifies336000 measured requests:
335999 successful, one root-read socket hang up, zero missed. Four separate
warmups complete4800 successful requests. No latency SLO or provider/search-quality
claim is made. The zero-error condition is not met; preserve this failure.

The failed request occurs approximately06:58:46.610UTC in the second10% steady
window. Sanitized proof356 retains the raw digest and observations: nearby WEB/API
logs are empty, containers have no restart/OOM and memory/database samples show
no OOM or lock waiter. Its root cause is unproven; no retry hides the failure.
All four mutable notes reach revision4261 with original owners; page errors are0.

The original cleanup preserves resources after a duplicate exclusive inventory
filename. Separate359 captures fresh135-table SQL/storage inventory, unchanged
original roles/organizations and exact declared corpus addition,1000000 corpus
notes/1017040 revisions, four owner/revision4261 rows and actual S3 GET1 object/
16384 bytes. It then normally stops/removes only the seven owned containers and
network. Independent360 confirms absence; both original failures remain unchanged.
Public proof361 records workload failure and completed cleanup separately.

All frozen source/API/worker/WEB/driver hashes remain unchanged. Driver/browser
scope peaks at2060517376 bytes under2GiB with zero swap/OOM kills; component peaks
and memory-event observations remain in proof361. Existing data/services are
preserved. Execution has ended; further diagnostics must use distinct declared
inputs after investigating the failure, not retry this consumed run until green.

Separate read-only diagnostic384 reproduces idle-connection resets in
`ae54aaffa376`:1200 continuous reads succeed;320 idle-boundary reads include nine
ECONNRESET errors, all on reused sockets idle for approximately6002–6006ms.
Proof389 preserves connection metadata without payloads/authentication headers,
unchanged note rows/roles and independent owned cleanup388. The original failed
request has no socket metadata, so this does not establish its cause.

The proposed harness-only policy retires sockets still in the HTTP free pool
after4000ms, preserving retries and active-request deadlines. Two local HTTP
regressions pass, including a4300ms active response. Actual KMS successor394 is
refused before startup because another verification is active. Its failure stays
recorded; do not stop that work or weaken the admission guard. The separate
cleanup successor399 passes three local regressions after the original duplicate
inventory failure is reproduced. Neither correction is a new workload result.

After the competing process exits without intervention, fresh successor401
passes in `442e558a8630`:1200 continuous and320 idle-boundary reads all succeed;
256 free sockets retire and zero active sockets retire. Retries and deadlines
are unchanged. Proof409 verifies raw events, original note rows/roles and exact
declared source/artifact/WEB/driver inputs. Independent408 confirms all seven
owned containers/network absent. This qualifies the harness policy on the old
published host. The original sustained failure remains; final workload evidence
must identify the qualified consumer tuple it actually executes.

## Environment and data

The run used a separate PostgreSQL database whose name starts with
`knowledge_engine_note_gui_acceptance_`. The existing application database,
API on 9086 and integrated note client on 9094 were preserved. The acceptance
API listened on loopback 9092 and this client on loopback 9090. No external
model was called and no existing database was reset.

The capacity corpus contained 1,000,000 notes and their initial revisions:
100,000 roots and 900,000 children, with ten children per populated parent.
Notes included space, private and administrator visibility. A guarded SQL
fixture prepared this controlled corpus in the empty acceptance database.
Functional note edits and permission changes used the real API. This measures
note navigation and editing, rather than ingestion throughput or search quality.

The Linux host reported 16 logical CPUs and approximately 57 GiB RAM. The
database occupied about 1.56 GB after fixture creation. Measurements used warm
data and shared host resources; they establish this observed workload, rather
than a production latency guarantee or a cold-start result.

## Million-note observations

Each API run made 100 root-page reads, 100 child-page reads, 100 note reads,
128 reads with concurrency eight and 30 revision-checked saves. Times include
the local HTTP and CSRF preparation used by the harness.

| API p95, milliseconds | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Root page | 20.29 | 12.91 | 15.28 |
| Child page | 10.82 | 10.90 | 8.57 |
| Note read | 12.07 | 10.09 | 10.13 |
| Eight concurrent readers | 19.33 | 18.28 | 20.66 |
| Revision-checked save | 13.35 | 11.30 | 13.21 |

The repeatable browser scenario traversed 50 root pages per run. Every tree
response contained at most 50 notes and 5,223 bytes. At most 21 tree rows were
rendered. Returning to the first page required a new request after cache
eviction, confirming that visited pages were not retained without a bound.

| Browser observation | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Page navigation p95, milliseconds | 158.26 | 147.00 | 153.05 |
| Retained heap after 20 pages, bytes | 25,060,088 | 24,173,612 | 24,700,136 |
| Retained heap after 50 pages, bytes | 24,929,992 | 24,992,140 | 26,098,192 |

Heap values follow explicit browser garbage collection; they are retained
JavaScript heap, not peak browser or operating-system memory. The test also
restored an authorized child location, saved structured content and verified
the stored document after a reload. This run does not cover million-note
subtree moves, million-item relationship traversals or large attachments.

## Live account access observations

Three separate browser sessions represented an owner, an editor and an account
without membership. The editor could read shared content and its own private
note, but could not read the owner's private note or administrator content.
The unrelated account could not read the shared note.
The note picker's title lookup also excluded the owner's private note and
administrator note, retained the editor's own private note, and rejected the
account without space membership. This checks the client's bounded database
lookup, separately from search-engine indexing.

After promoting the editor to administrator, the test opened an administrator
note and changed its draft without saving. A real API role demotion removed
the protected editor and draft during the next polling cycle, observed at
about 31 seconds. Removing space membership likewise cleared both panes and
their cached private draft. Direct API reads were denied after each change.
These cases did not mock network responses or replace the permission service.

A later live demotion from editor to viewer retained the still-readable draft
and disabled body editing and saving. The tree now reads the API's effective
`myRole`, removes creation and movement controls, disables bulk selection and
dragging, and offers only writable destination spaces. A direct save attempt
from the viewer was denied and the stored note remained unchanged. Both the
component and real-API tests reproduced the former tree-control gap before
the fix.

## Repeating the browser checks

The user approved the current GUI workload definition on 2026-11-02: one million
isolated notes with actual Next/API/storage; paced20 requests/second steady load,
three15-minute measured windows per authorized population,100 requests/second
stress for five minutes per population, and separate100%,10%,1%,0.1% authorized populations. Steady measurement
therefore totals three hours, excluding warmup and stress. Record achieved rate,
latency percentiles, errors and memory; no unagreed latency SLO or search/model
quality claim is implied. This definition is COMPLETE; its execution is NOT YET
VERIFIED. Unachieved scenarios remain open. Preserve the historical receipts
above without relabeling them as this new workload.

The user separately confirmed five-minute stress windows for all four
populations. Measured steady/stress time totals three hours20minutes; four
one-minute warmups and seed/drain/cleanup time are additional. A separate
unexecuted workload candidate reflects that definition; the old900-second
candidate remains unchanged. Definition checks pass3/3 and the unchanged
scheduler checks pass4/4. Neither result is a capacity measurement.

### Current-host attempt on 2026-11-02

Run `d88bd5e5cebb` starts at15:00UTC and fails with exit1 after386.884seconds.
Actual seed contains1000000 notes and1000000 initial revisions. API-readable
populations are1000000,100000,10000 and1000. Warmups and measured windows are0.
The harness reads byteSize from FileReceipt, which does not expose it; actual
S3 payload is16384bytes with the same checksum and size recorded in SQL.
No achieved load rate, sustained latency or final save count is established.

The complete135-table inventories are preserved at three phases. Audit152
confirms unchanged original organization rows/roles, exactly one declared corpus
organization added and exact post-setup membership rows retained. The old
whole-organization equality rejects this authorized addition. The actual2GiB,
zero-swap driver/browser scope peaks at1527455744bytes with no OOM kill; this
describes setup only. Source/API/worker/WEB/driver identity remains unchanged.

Cleanup154 stops/removes web but times out on the hash keepalive. After separate
explicit approval, continuation159 preserves fresh SQL/S3 and sends SIGKILL once
each to hash/storage-admin. The other four containers stop normally; all removals
are non-force. Independent proof161 confirms all seven original containers and
the network absent and the original workload and cleanup154 failures unchanged.
The first proof160 fails on Docker's network-absence diagnostic and is retained.
This completes resource cleanup, while sustained workload acceptance remains open.
The conditional corrected-run deadline passes before its approval is observed;
no corrected workload run is started.

Separate correction preparation is complete in helper156/157 and host168/live169.
Each original defect is reproduced, followed by4/4 passing tests per helper.
Verification171 checks syntax, unchanged seed/resource methods and measurement
assertions/timeouts, input identity and direct runtime denial. Original FAIL,
cleanup154, proof160 and verifier170 failures remain readable. The normal metadata
API path and sustained measurement were unexecuted at that preparation
checkpoint. Successor337 has now ended with one measured transport error and
separately completed owned cleanup, as recorded above; preparation171 does not
supply its result.

The user approved this exact isolated frozen-tuple seed and measurement scope
within a maximum five-hour reservation. Keep20GiB available memory and10GiB
disk headroom, container ceilings totaling15.25GiB and a separate2GiB
driver/browser limit. This caps owned cgroups, not the whole host. Execution
requires its own bounded interval and immediate guards; a finite note-host
reservation cannot cover this workload. Current successor337 binds the direct
user approval and its separate operator-selected bound, without claiming a peer
reservation or host exclusivity.

The owning backend prepares the isolated data and session files. It supplies
`NOTE_GUI_E2E_FIXTURE`, a JSON object with UUID fields `space`, `destination`,
`corpus`, `owner`, `peer`, `outsider`, `sharedNote`, `privateNote`,
`administratorNote` and `peerPrivateNote`. The same directory contains scoped
Playwright cookie states named `owner-auth.json`, `peer-auth.json` and
`outsider-auth.json`. Keep them under `.tmp/` with restricted file permissions.

`NOTE_GUI_E2E_SCALE_FIXTURE` names the corpus record with `verifiedRows`,
`rootNotes` and `probeIds`, including keys `1`, `2` and `100001`. The probes
must identify existing notes in that corpus. Missing fixture configuration
skips these external-API cases; a skip does not establish acceptance.

Set `NOTE_GUI_API_ORIGIN` when starting the client to proxy the isolated API.
Set `NOTE_GUI_E2E_BASE_URL` if the test client uses another origin. Then run:

```sh
pnpm test:browser e2e/authorization.spec.ts e2e/capacity.spec.ts
```

The capacity browser scenario records its measurements in
`.tmp/acceptance/browser-capacity.json`. Native Windows execution, cold caches,
production concurrency and hardware-specific service limits remain outside
this Linux run.
