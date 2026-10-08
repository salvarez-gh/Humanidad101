# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured with Session Replay, Error Tracking, and Support enabled; health, error, and support signal sources are also enabled. The built-in scout troop was tuned for this interactive web experience, two custom scouts were added, and two Replay Vision monitors were armed.

Findings will start appearing in the [Self-driving inbox](https://us.posthog.com/project/607301/inbox) within about 30 minutes after eligible activity is recorded.

## AI data processing

Approved by the wizard’s organization-level gate.

## GitHub

The GitHub App was already connected before this setup. GitHub Issues was not selected as a Self-driving source in this run, so no GitHub Issues responder was enabled.

## Products enabled

| Product | Result | Client check |
|---|---|---|
| Session Replay | Already enabled | The existing `posthog-js` initialization does not disable recording. |
| Error Tracking | Enabled | The existing client initialization does not disable exception capture. |
| Support (Conversations) | Enabled | Tickets will begin arriving only after an inbound email, inbox, or Slack channel is connected in PostHog. |

## Signal sources

| Signal source | Action | Notes |
|---|---|---|
| `signals_scout` / `cross_source_issue` | Skipped — on by default | Scout findings may enter the inbox without a config row. |
| `health_checks` / `health_issue` | Enabled | Detects actionable setup and instrumentation health issues. |
| `error_tracking` / `issue_created` | Enabled | Detects new error issues. |
| `error_tracking` / `issue_reopened` | Enabled | Detects recurring error issues. |
| `error_tracking` / `issue_spiking` | Enabled | Detects sharply increasing error issues. |
| `conversations` / `ticket` | Enabled | Armed now; remains idle until an inbound Support channel is connected. |
| `session_replay` / `session_analysis_cluster` | Skipped | Retired source type; Replay Vision scanners provide replay coverage. |
| `replay_vision` | Skipped | Replay Vision scanners self-authorize through `emits_signals: true`; no source row is needed. |

## Connected tools

No connected-tool source was selected. No external warehouse source or dormant external responder was created.

## Scout troop

### Active scouts

The enforced budget is **100 runs/day**; **0** runs had been used at setup time, with **100** remaining. The project is enrolled in early access. PostHog’s current banner says: “Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.”

| Scout | Why it is active |
|---|---|
| `signals-scout-general` | Cross-product coverage and surfaces without a specialist. |
| `signals-scout-product-analytics` | Monitors the app’s captured engagement flow. |
| `signals-scout-web-analytics` | Monitors web traffic, attribution, and landing-page health. |
| `signals-scout-web-vitals` | Monitors Core Web Vitals and page-performance regressions. |
| `signals-scout-observability-gaps` | Identifies meaningful activity without sufficient analytical coverage. |
| `signals-scout-reading-journey` | Custom coverage for content-reading progression. |
| `signals-scout-outbound-engagement` | Custom coverage for outbound community, social, and support engagement. |

Seven scouts are active, leaving room under the ten-scout quality ceiling.

### Disabled built-in scouts

| Scout | Why it remains disabled |
|---|---|
| `signals-scout-ai-observability` | No AI or LLM telemetry was found. |
| `signals-scout-anomaly-detection` | No saved dashboards or insights were identified for it to watch. |
| `signals-scout-apm` | No tracing or APM surface was found. |
| `signals-scout-conversations` | Support has no connected inbound channel yet. |
| `signals-scout-csp-violations` | No Content-Security-Policy reporting surface was found. |
| `signals-scout-customer-analytics` | No account-level/B2B analytics surface was found. |
| `signals-scout-data-pipelines` | No CDP pipeline, batch export, or Hog flow surface was found. |
| `signals-scout-data-warehouse` | No warehouse source was selected or detected. |
| `signals-scout-error-tracking` | Covered by enabled native Error Tracking sources; avoiding duplicate reports. |
| `signals-scout-experiments` | No active experiment surface was found. |
| `signals-scout-feature-flags` | No feature-flag usage was found. |
| `signals-scout-health-checks` | Native health source already provides this coverage. |
| `signals-scout-inbox-validation` | No resolved Self-driving reports exist yet to validate. |
| `signals-scout-insight-alerts` | No configured insight-alert surface was found. |
| `signals-scout-logs` | No PostHog Logs surface was found. |
| `signals-scout-mcp-tool-calls` | No application MCP-tool telemetry surface was found. |
| `signals-scout-replay-vision` | New scanner observations do not yet exist for cross-scanner analysis. |
| `signals-scout-revenue-analytics` | No payment or revenue telemetry was found. |
| `signals-scout-session-replay` | Covered by the Replay Vision monitors below; avoiding duplicate replay findings. |
| `signals-scout-skills-store` | Skill-store hygiene is not a primary application surface. |
| `signals-scout-surveys` | No survey activity was found. |
| `signals-scout-tasks` | No PostHog Tasks surface was found. |

## Custom scouts

| Scout | Watches | Discriminator | Why it adds coverage |
|---|---|---|---|
| `signals-scout-reading-journey` | The progression from entering the experience to opening and advancing through content. | Downstream progression rates versus their trailing baseline, not raw traffic. | The generic product scout focuses on saved flows; this is a product-specific reader journey. |
| `signals-scout-outbound-engagement` | Follow-through to community, social, and support destinations. | Each destination’s click-through rate and share among engaged visitors versus its own baseline. | Web analytics covers traffic and landing health, but does not directly own destination-specific outbound engagement. |

The user approved both candidates; none were declined. The existing captured flow supports them: the landing component records entry and outbound clicks, the timeline records content opens, and the reader records page progression.

Surfaces considered but ruled out: revenue (no payment telemetry), AI/LLM (no AI telemetry), surveys (no survey activity), feature flags/experiments (no active usage), and error/session replay scouts (each is covered by its dedicated inbox route).

If a custom scout becomes noisy, set `emit: false` on its configuration in PostHog to switch it to dry-run mode.

## Replay Vision scanners

A scanner is an LLM that watches individual session recordings on a schedule and pushes eligible findings to the Self-driving inbox. It is the only component in this setup that spends Replay Vision quota. Findings enter at half weight and need independent corroboration before a report is promoted.

There were no recordings at setup time, so both monitors are armed and will begin work when recordings arrive. The organization had 2,500 Replay Vision credits remaining; both estimates were zero observations and zero credits per month because no matching recordings existed in the recent measurement window.

| Scanner | Status | What it watches | Query scope | Sampling | Estimate |
|---|---|---|---|---|---|
| `Self-driving: experience breakage` | Created | Clear visible breakage across entry, timeline exploration, content opening, reading, and return navigation. | Sessions on the app’s single-page experience (`$pathname` contains `/`). This covers the primary experience flow because the app transitions from landing to timeline to reader without a route change. | Balanced, 5% | 0 observations/month; 0 credits/month. |
| `Self-driving: user frustration` | Created | Visible friction or blocked interaction in sessions with repeated rapid clicks. | Sessions containing `$rageclick`; intentionally has no URL scope to avoid materially widening overlap with the breakage monitor. | Focused, 10% | 0 observations/month; 0 credits/month. |

Replay Vision documentation: [Getting started](https://posthog.com/docs/replay-vision/start-here) and [creating scanners](https://posthog.com/docs/replay-vision/creating-scanners).

## Follow-ups

- [ ] Connect an inbound Support channel (email, inbox, or Slack) in PostHog so the enabled Support responder has tickets to process.
- [ ] Generate live traffic and recordings; no recordings, Error Tracking issues, or surveys were present in the initial probes.
- [ ] The current MCP connection lacks property-definition read permission, so the custom scouts should confirm their event schema on their first eligible run. The code-level event contract was used for their initial design.
- [ ] After Replay Vision observations arrive, rate the scanner observations to refine each monitor’s recommendations: [experience breakage scanner](https://us.posthog.com/project/607301/replay-vision/01a09b69-baeb-7d70-af49-e28fffe4e132) and [user frustration scanner](https://us.posthog.com/project/607301/replay-vision/01a09b69-bb94-7f61-8f29-35a0d2f36bd9).

## Files modified or created

| File | Change |
|---|---|
| `posthog-self-driving-report.md` | Created this setup report. |

No application source files or environment files were modified.

## What happens next

Fresh scout configurations are picked up by the coordinator within about 30 minutes and draw from the project’s daily run budget. Eligible findings cluster into reports in the [Self-driving inbox](https://us.posthog.com/project/607301/inbox), where immediately actionable items can start coding tasks.
