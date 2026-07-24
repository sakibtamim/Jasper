# Jasper current-state and hosted-readiness audit

Audit date: **2026-07-24**
Repository baseline: `sakibtamim/Jasper@a08a0fcca50daef50c40aba66ac0c665fc0a60d9`
Deployment baseline: `deploy@1d1935ad5ccfffe4664f8649824b730e1f1865bf`

## Method and limits

This audit combined:

- every root onboarding, authentication, deployment, environment, contribution,
  plugin, plugin-development, plugin-workflow, and media-tool guide;
- repository and agent instructions and the existing plugin audit notes;
- static analysis of bot startup, Discord clients, commands, voice, queueing,
  AFR, database adapters, authentication, Fastify APIs, plugin loading and
  packaging, dashboard integration, Garage Band, and Soundboard;
- a clean local build, tests, lint, and type-check sequence;
- live GitHub repository, issue, pull-request, branch, release, Actions, secret
  inventory, and organization-permission queries; and
- current Discord, discord.js, voice, and Fastify documentation.

The GitHub token could not read organization Project V2 boards. The deployment
host is secret-only and exposes no discoverable health endpoint, so actual
Discord sessions, worker readiness, database engine, and audio playback on that
host could not be verified. Those are audit findings, not assumed successes.

No remote or runtime state was changed.

## Product architecture today

```text
Discord slash interaction
        │
        ▼
controller Client ── command/event loaders ── queue manager
        │                                      │
        ▼                                      ▼
process-global worker pool / AFR          track resolver
        │                                      │
        ▼                                      ▼
controller or worker Client ── voice ── yt-dlp / FFmpeg / cache

same Node process:
  Fastify API + Discord OAuth + React dashboard
  plugin manager + trusted in-process plugins
  SQLite or PostgreSQL adapter + filesystem plugin/media storage
```

### Startup and bot identities

[Startup](../../apps/bot/src/index.ts) creates the controller and every worker,
logs them in, loads plugins, optionally bulk-replaces commands for one
`GUILD_ID`, and then starts the HTTP server. Workers and the controller share one
Node process.

[Environment discovery](../../apps/bot/src/config/env.ts) treats every
environment variable ending in `_TOKEN`, other than `DISCORD_TOKEN`, as a worker
credential. This is convenient for a hand-maintained `.env`, but dangerous in a
hosted container: `NPM_TOKEN`, `API_TOKEN`, or an infrastructure credential can
be sent to Discord as if it were a bot token. Worker identities are fixed at
module initialization and require restart to rotate.

Every client requests `Guilds` and `GuildVoiceStates`. The controller
additionally requests `GuildMessages` and the privileged `MessageContent`
intent. Core playback does not need message content; the optional Soundboard
message-collector upload flow does. That one optional plugin path therefore
turns the controller into an application-verification dependency. Discord
application verification becomes material for every bot application at 100
guilds; `MessageContent` adds privileged-intent approval specifically for the
controller. Hosted Soundboard must use an interaction attachment flow or be
disabled before the hosted profile removes those intents.

### AFR and voice allocation

[The worker pool](../../apps/bot/src/core/worker-pool.ts) implements Jasper’s
important behavior:

- reuse the cat already serving the requested voice channel;
- probabilistically prefer the Jasper controller according to
  `AFR_JASPER_WEIGHT`;
- otherwise choose an available worker randomly; and
- fall back to Jasper when no worker is available.

The controller is therefore an audio worker. This contradicts the current
onboarding overview’s claim that the controller never handles playback.

Its state model is single-instance: each bot has one process-global `busy`,
`guildId`, and `voiceChannelId`. A Discord bot can actually join one voice
channel **per guild**, so a cat serving guild A should remain available in guild
B. The current model incorrectly consumes that cat globally. Release is keyed
only by voice-channel ID, and allocation needs a per-guild/channel critical
section to retain the race fix established in earlier work.

[Allocation](../../apps/bot/src/core/worker-pool.ts) initially filters only
global `busy` and client readiness. Guild membership and channel permissions are
checked after a random selection in
[music-player](../../apps/bot/src/core/music-player.ts); failure releases the
cat but does not try the next eligible cat. Partial worker onboarding would
therefore create avoidable playback failures.

[Music playback](../../apps/bot/src/core/music-player.ts) uses the client user ID
as the discord.js voice connection group. That correctly separates different
bot applications in the same guild. It releases a worker before the retained
five-minute voice connection expires, however, which can make the next request
encounter a connection still associated with earlier work.

The queue map is in memory. Discord snowflakes make channel IDs globally unique,
but guild context must still be carried explicitly for authorization,
observability, deletion, and future placement.

### Commands and events

Slash commands are registered as guild commands for one `GUILD_ID` both in CI
and during runtime startup. This is suitable for a self-hosted test guild, not
multi-guild hosted installation. Hosted releases should publish global commands
once as a release job; sandbox builds should use immediate guild commands.
Runtime startup must not mutate the Discord command surface.

Workers load the common event set but only the controller receives the command
collection. `music-status` iterates the controller and then a worker list that
already contains the controller, so controller state may be counted twice.

Two commands are immediate multi-guild blockers:

- `/catastrophic-reset` clears every queue and releases every worker in the
  process rather than the invoking guild; and
- `/music-status` reads the process-wide worker and queue state, potentially
  exposing another guild’s activity.

Neither has the tenant-aware authorization required for a shared service.
Ordinary playback controls are limited to members in the active voice channel
but have no configurable DJ/admin policy; richer intra-guild delegation is a
later product decision, not a substitute for the MVP’s cross-guild boundary.

### Data and storage

Core supports `node:sqlite` and PostgreSQL. Schemas are created during adapter
initialization, with no migration ledger, distributed lock, or expand-contract
discipline. This cannot safely coordinate rolling hosted processes.

Adapter parity is incomplete despite the README’s parity claim. SQLite stores
and incrementally adds play thumbnails, while PostgreSQL’s play schema/write path
does not. There are no PostgreSQL tests. SQLite also does not explicitly enable
foreign keys, so documented cascades cannot be assumed.

Some play records contain `guildId`, but aggregate queries and dashboard routes
are global. Plugin key/value data is keyed only by `(plugin_name, key)`.
Filesystem plugin storage is `data/plugins/<pluginId>` and cached audio is one
global `cache/audio` tree. The current PostgreSQL adapter disables server
certificate verification in production.

A global `search_cache.query` and `audio_metadata.search_terms` also persist raw
user search intent, and cache storage logs raw queries. Those mappings must not
become cross-tenant metadata: only eligible public media bytes and normalized
source identity may be shared; raw query mappings need scope, minimization,
expiry and log redaction.

A shared content-addressed media cache can be a deliberate optimization, but
ownership, access, usage, uploads, playlists, logs, and deletion must be
installation-scoped with guild correlation. The cache and customer data must
not be conflated.

Core accepts arbitrary non-YouTube playback URLs, and direct stream fetches do
not centrally enforce private-network denial, redirect revalidation, timeout,
or response-size limits. Garage Band performs similar remote downloads into
memory. A shared safe-fetch/asset contract is therefore an MVP security
dependency, not plugin-specific polish.

### API and authentication

[The Fastify server](../../apps/bot/src/api/server.ts) attaches an optional user
to requests but does not protect most routes. Status, queues, cache, logs,
statistics, plugin registry, and plugin storage reads expose global runtime data.
Plugin install/delete/upload checks only for a logged-in user, not a guild or
operator role.

The same authentication-only policy gives any logged-in Discord user global
DevTools mutations: session/user administration, cache/stat deletion, plugin
toggle/removal, and media-cookie management. Database methods used there return
decrypted OAuth access/refresh tokens and decrypted media cookie content.
The session cookie is read as raw state even though the auth guide describes a
signed session. These surfaces must be disabled—not merely omitted from
navigation—in hosted mode.

Existing Discord OAuth requests `identify`, stores encrypted access and refresh
tokens, and has no guild membership or role model. A hosted customer control
plane needs `identify guilds`, manageable-guild checks, refresh handling,
tenant membership, and revocation. Staff access needs a separate organization
identity provider, MFA, RBAC, and audited actions.

Fastify `register()` encapsulation is useful for scoping hooks, decorators,
prefixes, and schemas. It is not a security sandbox. Jasper’s custom dynamic
plugin router does not currently give plugins normal Fastify schemas or
default-deny authorization.

### Plugin system

The plugin platform is a strong basis for an out-of-tree hosted adapter:

- manifests and compatibility metadata;
- backend and dashboard extensions;
- scoped logger, key/value store, filesystem storage, hooks, routes, commands,
  audio, and scheduled tasks;
- source submodules during development and ZIP installation for consumers; and
- hot enable/disable plus database/filesystem reconciliation.

Its current trust and scope limits are decisive:

- plugin code runs in-process with ordinary Node privileges and can read the
  environment or import internals;
- `PluginContext.workers` contains mutable worker-state references and tokens;
- there is no authenticated principal, guild context, entitlement resolver,
  runtime profile, health contributor, migration capability, or lifecycle
  observation for guild install/remove;
- route input and output use `any`;
- plugin database and storage scope is global; and
- hook registration has no disposal handle, unload does not remove all hooks,
  command collisions can overwrite a core command, and unload can then delete
  that command rather than restore it;
- a nominally read-only core data accessor can toggle plugin state;
- compatibility mismatch logs a warning and continues loading; and
- plugin uniqueness is partly keyed by display name instead of stable manifest
  ID; and
- a missing plugin directory can cause startup reconciliation to delete its
  database metadata.

Hosted production must load only pinned, allowlisted operator plugins. A future
untrusted marketplace requires a process, container, or capability sandbox and
is not an MVP extension of this mechanism.

### Plugin packaging and Garage Band

The export script copies the compiled entry file, manifest, web output, and
assets, but not an arbitrary compiled backend module tree. That happens to fit
the present Garage Band artifact and is not a complete hosted adapter contract.

The private Garage Band source and public compiled release workflow prove the
desired out-of-tree development model. Live verification also found a release
regression:

- the
  [v1.0.5](https://github.com/purrfectsoft/jasper-plugin-garage-band/actions/runs/28726742584)
  and
  [v1.0.6](https://github.com/purrfectsoft/jasper-plugin-garage-band/actions/runs/28727120814)
  “Release Plugin” Actions runs failed with `Bad credentials`;
- public artifacts appeared minutes later, apparently through an out-of-band
  path;
- current Jasper points to private source commit `b6ad6b2`, while the public
  v1.0.6 artifact and staging use older `987f836`; and
- the plugin manifest remains 1.0.6 despite later gain work.

The current [v1.0.6 public
artifact](https://github.com/purrfectsoft/jasper-plugin-garage-band-releases/releases/tag/v1.0.6)
reports asset digest
`sha256:ce186e3bd84b57d063fa4bcf867a826510c1fa986daa5281d6c46081191e6620`.

Garage Band itself is not tenant-safe today. Playlists are stored as one JSON
array at one global key, names are globally unique, whole-array updates can lose
concurrent writes, recorded `userId` ownership is not enforced, API mutations
use the synthetic owner `api`, and routes are unauthenticated. Upload and remote
media paths need guild quotas, validation, and SSRF controls. The plugin imports
a core music-player file directly instead of staying behind its declared
contract.

Soundboard stores sounds and plays in global keys, lets most mutating routes run
without authorization, records dashboard ownership as `dashboard-user`, and
uses the privileged message-collector path described above. Other persistent
plugins have the same guild-context migration need.

## Current staging pipeline

The bot has no modeled “staging” environment. Its staging lane is an unprotected
`deploy` branch that performs an in-place production-mode rollout to one secret
SSH host:

```text
push to deploy
  → recursive private-submodule checkout
  → pnpm install and build
  → bulk-replace one guild's commands
  → upload partial monorepo artifact
  → PM2 stop
  → delete live files except selected state
  → SCP and checksum
  → production install and mutable latest yt-dlp download
  → PM2 startOrRestart
```

### Live state

- `deploy` is 18 commits behind `master` and 0 ahead.
- The last rollout, [Actions run
  28727451132](https://github.com/sakibtamim/Jasper/actions/runs/28727451132),
  succeeded on 2026-07-05.
- History contains 63 successful and 22 failed bot deployment runs out of 85.
- The latest run’s confirmed PM2 stopped-to-online interval was about 61
  seconds.
- Its only post-start signal was PM2 reporting `online` at zero seconds uptime.
- Both `master` and `deploy` are unprotected and have no required checks.
- The bot workflow is not associated with a GitHub Environment or Deployment.
- No deployment-configured liveness/readiness probe, discoverable bot health
  URL, service inventory, smoke playback, rollback, or read-only host telemetry
  could be discovered.

The public OSS website at <https://sakibtamim.github.io/Jasper/> returned HTTP 200. That Pages site is separate from the proposed proprietary acquisition
site.

### Pipeline hazards

1. Commands change before the runtime artifact; a failed rollout can leave new
   commands backed by old code.
2. `/ping-plugin` came from the production-enabled Sound Effect Plugin, showing
   that production lacks an explicit plugin allowlist. Separately, command
   discovery does not set raw `NODE_ENV`, so plugins that are classified as
   tests can also participate.
3. Command discovery executes plugin `onLoad` with mocks rather than consuming a
   pure manifest; top-level database initialization and test-plugin writes can
   run while merely calculating Discord commands.
4. The running tree is deleted before transfer, with no release directory,
   previous artifact, deployment lock, or rollback.
5. Tests, lint, typecheck, migrations, readiness, Discord client state, database
   access, and audio are not checked.
6. Runtime dependencies, package-manager bootstrapping, and “latest” yt-dlp are
   mutable in place; the media binary is not checksum-verified, download failure
   is non-fatal, and the host sources nvm without running `nvm use`.
7. The partial artifact omits shared packages and relies on current type-only
   imports or residual installation behavior. Uploaded `apps/bot/package.json`
   and `apps/bot/scripts` are also outside the generated checksum set.
8. Worker, database, OAuth, encryption, cookie, and cache configuration lives in
   a manually preserved host `.env`, outside a versioned secret/config contract.
9. PM2 stop invokes shutdown that clears active queues rather than draining
   them; `online` is then insufficient because individual Discord login failures
   are
   caught and do not fail process startup.

This lane can remain a documented manual/self-hosted option, but it must not be
stretched into hosted fleet orchestration.

## Local verification

The audit ran against Node 24.9.0 and pnpm 9.15.9:

| Check                 | Result                                                           |
| --------------------- | ---------------------------------------------------------------- |
| Bot tests             | 13 files, 81 tests passed                                        |
| Build                 | Passed                                                           |
| Lint                  | Passed with 40 warnings, all in Garage Band tests                |
| Cold typecheck        | Failed because generated `@jasper/types` declarations were stale |
| Typecheck after build | Passed                                                           |
| Plugin validation     | All 7 discovered plugins passed                                  |
| Worktree after checks | Clean                                                            |

There is no pull-request CI. Vitest discovers only bot source tests. Garage Band
uses Fastify injection for some plugin routes, but no suite injects the real core
server/auth/DevTools policy boundary. There are no PostgreSQL integration,
Discord gateway, OAuth journey, yt-dlp/FFmpeg, runtime packaging, deployment
smoke, or tenant-isolation suites. Test sources are also compiled into
production output.

## Onboarding-document drift

The guides are unusually thorough for the self-hosted workflow, but several
claims no longer match executable configuration:

| Documented claim                                     | Verified state                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| README supports Node 18+                             | package engines and `.nvmrc` require Node 24                         |
| Root `pnpm start` and `pnpm deploy:commands`         | scripts live in the bot workspace                                    |
| Deployment PM2 process is `jasper-bot`               | ecosystem process is `Jasper`                                        |
| Web port defaults to 3000                            | runtime defaults to disabled/port 0                                  |
| Deployment env list is complete                      | `GUILD_ID` and private-submodule checkout credentials are omitted    |
| Native `better-sqlite3` deployment caveat            | core now uses `node:sqlite`                                          |
| Auth roadmap treats PostgreSQL auth as unimplemented | PostgreSQL adapter code exists, but live use is unverifiable         |
| Plugin examples and inventory are current            | some examples, versions, sample names, and React guidance are stale  |
| Controller never plays audio                         | controller is a weighted AFR participant and fallback                |
| One queue per server                                 | queues are per voice channel                                         |
| Dashboard is real-time                               | major pages poll every 2–10 seconds                                  |
| PostgreSQL has full adapter parity                   | thumbnail/schema behavior differs and PostgreSQL has no tests        |
| Plugin page receives a documented context prop       | the current app mounts plugin pages without props                    |
| Uploaded plugin immediately restarts/loads           | management currently moves files but does not activate a new backend |

Hosted work should not replace these guides. It should correct them, retain the
manual path, and add a tested single-instance container/Compose path plus an
independent-provider operations guide.

## Open GitHub work: complete impact review

At the audit baseline, before this definition PR was opened, live pagination
found 7 open issues and no open pull requests in Jasper, and no open issues or
PRs in the private Garage Band source or its public release repository. No
milestone exists and no issue is already a Hosted Jasper epic.

| Open issue                                                                                                     | Hosted impact                                                                                                                           | Proposed disposition                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#122 PostgreSQL production migration and multi-cloud backup](https://github.com/sakibtamim/Jasper/issues/122) | Strong foundation, but currently single-deployment and script-oriented                                                                  | Include early after re-scoping around guild identity, versioned migrations, managed PostgreSQL/PITR, encryption, RPO/RTO, restore drills, and public/private ownership |
| [#101 Garage Band Phase 3 epic](https://github.com/sakibtamim/Jasper/issues/101)                               | Mixes completed [#100](https://github.com/sakibtamim/Jasper/issues/100), billing, and collaboration                                     | Split and defer remainder; do not reuse as hosted epic                                                                                                                 |
| [#99 WebSocket collaborative playlists](https://github.com/sakibtamim/Jasper/issues/99)                        | Process-local fan-out conflicts with horizontal hosted runtime                                                                          | Defer; later place Garage Band behavior in its repo and add a generic realtime contract only if proven                                                                 |
| [#98 Stripe webhooks and premium tiers](https://github.com/sakibtamim/Jasper/issues/98)                        | Directly conflicts with no-billing MVP and private commerce boundary                                                                    | Defer and later supersede with proprietary commerce behind a provider-neutral OSS entitlement interface                                                                |
| [#48 agentic infrastructure standardization](https://github.com/sakibtamim/Jasper/issues/48)                   | Likely completed by [PR #49](https://github.com/sakibtamim/Jasper/pull/49) and [PR #116](https://github.com/sakibtamim/Jasper/pull/116) | Discuss, verify residual checklist, then close or narrow                                                                                                               |
| [#38 automatic JSX runtime for plugins](https://github.com/sakibtamim/Jasper/issues/38)                        | Relevant to plugin build ABI but current workaround is proven                                                                           | Time-box an early compatibility spike; block MVP only on a reproduced hosted-plugin issue                                                                              |
| [#36 realtime soundboard mixing](https://github.com/sakibtamim/Jasper/issues/36)                               | Adds CPU and noisy-neighbor risk, unrelated to onboarding                                                                               | Defer until isolation, quotas, and load capacity exist                                                                                                                 |

The active token lacked `read:project`, so Project V2 content is the only known
GitHub planning blind spot.

## Hosted-readiness gap summary

| Capability         | Current state                             | Required MVP state                                                   |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------------- |
| Guild tenancy      | Incidental guild IDs; global APIs/storage | Mandatory installation context and tested isolation                  |
| Worker/AFR         | One process-global busy state per cat     | One lease per cat per guild with atomic allocation                   |
| Worker credentials | Wildcard `_TOKEN` discovery               | Explicit named identities from a secret provider                     |
| Commands           | One guild, startup and CI mutation        | Release job with global/allowlisted-guild strategies                 |
| Plugins            | Trusted in-process, globally scoped       | Still trusted, pinned; typed policy/context/lifecycle contracts      |
| Customer auth      | Core `identify` OAuth                     | Private `identify guilds`, tenant membership and revocation          |
| Staff auth         | None                                      | Separate MFA-backed OIDC and RBAC                                    |
| Data               | Startup-created schema, global plugin KV  | Versioned migrations and installation-scoped durable records         |
| Storage            | Local global filesystem                   | Installation namespace/provider interface; object storage hosted     |
| Runtime health     | Process online / generic status           | Live, ready, degraded, drain, shard and worker signals               |
| Deployment         | Mutable in-place SCP                      | Signed compatible release promotion, migration, smoke and rollback   |
| Scale              | One process/one assumed guild             | One aligned multi-app shard cell serving many guilds                 |
| Self-hosting       | Manual Node/PM2 path                      | Preserved plus public image, Compose, and operator contract          |
| Commerce           | Stripe proposal in core issue             | No MVP commerce; future private implementation behind open interface |

## External constraints verified

- Discord bot installation URLs are application-specific; one URL cannot
  authorize the controller and all worker applications.
- A user needs `MANAGE_GUILD` to install a server application.
- Bot authorization can use Discord’s callbackless special flow, so runtime
  guild observations are the reliable completion signal.
- Guild commands update immediately and are appropriate for sandbox testing;
  global commands are appropriate for a broadly installed application and use
  read-repair propagation.
- Discord routes guild events to a shard using
  `(guild_id >> 22) % num_shards`. Under Jasper’s proposed co-located-cell
  topology, all cat applications use aligned shard counts/IDs so a guild’s
  controller and workers meet in one cell; Discord itself permits other session
  layouts.
- Discord requires sharding at 2,500 guilds and exposes session start and
  concurrency limits before then.
- Fastify plugin encapsulation scopes hooks and decorators but does not constrain
  the filesystem, process environment, network, or arbitrary Node imports.

## Evidence links

### Repository

- [README](../../README.md)
- [Authentication guide](../../AUTH.md)
- [Deployment guide](../../DEPLOY.md)
- [Environment reference](../../ENV.md)
- [Plugin guide](../../PLUGINS.md)
- [Plugin development guide](../../PLUGINS_DEV.md)
- [Plugin workflow](../../PLUGIN_WORKFLOW.md)
- [Bot deployment workflow](../../.github/workflows/deploy.yml)
- [Worker pool](../../apps/bot/src/core/worker-pool.ts)
- [Plugin manager](../../apps/bot/src/core/plugins/plugin-manager.ts)
- [Plugin type contract](../../packages/types/src/plugin-types.ts)
- [API server](../../apps/bot/src/api/server.ts)

### Current platform documentation

- [Discord application commands](https://discord.com/developers/docs/interactions/application-commands)
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [Discord gateway and sharding](https://discord.com/developers/docs/events/gateway)
- [Discord gateway intents](https://discord.com/developers/docs/events/gateway#gateway-intents)
- [discord.js sharding guide](https://discordjs.guide/sharding/)
- [discord.js voice connections](https://discord.js.org/docs/packages/voice/0.19.0/getVoiceConnection%3AFunction)
- [Fastify encapsulation](https://fastify.dev/docs/latest/Reference/Encapsulation/)
- [Fastify plugin guide](https://fastify.dev/docs/latest/Guides/Plugins-Guide/)
