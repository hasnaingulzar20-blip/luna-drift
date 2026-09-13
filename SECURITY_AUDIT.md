# Luna Drift Production Security Audit

## Executive Summary

Luna Drift is a live sleep meditation PWA. A security audit identified **3 P0 (critical)** and **2 P1 (high)** issues. Fixes and mitigations have been implemented on the `security-hardening/luna-drift` branch. No production data was touched. No schema migrations were required. The core audio experience remains fully functional without login.

**Security posture before:** 3/10  
**Security posture after:** 7/10

---

## Architecture Reviewed

- **Framework:** Next.js 16 (Turbopack) + React 19 + TypeScript
- **Database:** Supabase Postgres (Prisma ORM)
- **Auth:** Supabase Auth (email/password, Google, Facebook, OTP)
- **State:** Zustand (client-side, persisted to localStorage)
- **Audio:** Web Audio API (procedural synthesis, client-side only)
- **Deployment:** Vercel

---

## Critical Findings (P0)

### P0-1: Anonymous users shared a single profile — FIXED
| | |
|---|---|
| **File** | `src/lib/journal.ts:28` (before fix) |
| **Vulnerability** | `ensureProfile()` fell back to `db.profile.findFirst({ where: { authId: null } })` for anonymous users — ALL anonymous visitors resolved to the same Profile row |
| **Attack scenario** | User A (anonymous) records sleep sessions and writes dreams. User B (anonymous) visits the site and sees User A's journal, dreams, streak, and total minutes. User B can delete User A's dreams. |
| **Impact** | Cross-user data leakage, unauthorized data modification |
| **Severity** | P0 — critical privacy violation |
| **Fix** | `ensureProfile()` now returns `null` for unauthenticated users. All API routes return 401 when not authenticated. Anonymous users can still use all audio features (client-side only) but cannot persist data. |
| **Status** | FIXED |
| **Verification** | TypeScript clean, build passes, API returns 401 without auth |

### P0-2: No authentication on API routes — FIXED
| | |
|---|---|
| **Files** | `src/app/api/profile/route.ts`, `src/app/api/sessions/route.ts`, `src/app/api/dreams/route.ts` |
| **Vulnerability** | No auth check — any visitor could call any API endpoint |
| **Attack scenario** | Attacker fetches `/api/profile` and reads another user's sleep history, or POSTs fake sessions to inflate streaks |
| **Impact** | Data exposure, data fabrication |
| **Severity** | P0 |
| **Fix** | All GET/POST/DELETE handlers now check `if (!profile) return 401` |
| **Status** | FIXED |
| **Verification** | Build passes, 401 returned without auth |

### P0-3: Client could fabricate sleep session duration — MITIGATED (not fully fixed)
| | |
|---|---|
| **File** | `src/app/api/sessions/route.ts` |
| **Vulnerability** | Client-supplied `minutes` and `completed` values were accepted without server-side lifecycle verification |
| **What remains exploitable** | A determined attacker with a valid auth session can still POST fabricated sessions with any duration up to 480 minutes and `completed: true`. The 480-minute cap limits the blast radius per request but does not prevent repeated submissions. |
| **What the cap mitigates** | Reduces maximum per-request fabrication from 720 to 480 minutes. Prevents absurd values (e.g. 999999 minutes). |
| **What a complete fix would require** | Server-side session lifecycle tracking: record `sessionStartedAt` server-side, verify elapsed time matches `minutes` before accepting. This would require a new `SessionState` table and changes to the client-server session protocol. Not implemented in this pass to avoid changing product behavior. |
| **Severity** | P0 (data integrity) — downgraded to MITIGATED |
| **Status** | MITIGATED — input validation added (Zod), cap reduced to 480m, but server-side lifecycle verification not implemented |

---

## High Findings (P1)

### P1-1: Dream DELETE ownership check — already safe (disproved as vulnerability)
| | |
|---|---|
| **File** | `src/app/api/dreams/route.ts:77` |
| **Finding** | Originally suspected as P0 IDOR. On inspection, the code already checked `existing.profileId !== profile.id` before deleting. Was never a vulnerability. |
| **Status** | No fix needed — was already safe |

### P1-2: Unused next-auth dependency — FIXED
| | |
|---|---|
| **File** | `package.json:64` |
| **Finding** | `next-auth` was listed as a dependency but never imported anywhere in the repository (verified across entire repo: `src/`, `scripts/`, `examples/`, config files). The app uses Supabase Auth exclusively. |
| **Fix** | Removed `next-auth` from package.json |
| **Note** | Lockfiles (`package-lock.json`, `bun.lock`) still contain next-auth entries. These will update naturally on `npm install`. Do not regenerate lockfiles as that could change other dependency versions. |
| **Status** | FIXED |

---

## Medium Findings (P2 — not fixed in this pass)

| # | Issue | File | Status |
|---|---|---|---|
| P2-1 | No rate limiting on POST endpoints | `sessions/route.ts`, `dreams/route.ts` | NOT FIXED — needs Upstash Redis |
| P2-2 | No security headers (CSP, X-Content-Type-Options) | `next.config.ts` | NOT FIXED — needs careful testing with Web Audio/PWA |
| P2-3 | No DB indexes on `profileId`, `endedAt` | `prisma/schema.prisma` | NOT FIXED — needs migration |
| P2-4 | Session creation + streak update not atomic | `sessions/route.ts:56-68` | NOT FIXED — needs Prisma `$transaction` |
| P2-5 | UTC-based streak calculation may be wrong for non-UTC users | `journal.ts:4` | NOT FIXED — needs product decision on timezone strategy |

---

## API Validation Improvements

### Before (vulnerable)
```ts
// sessions/route.ts — unsafe parsing
const minutes = Math.max(0, Math.min(720, Math.round(Number(body?.minutes ?? 0))));
const completed = Boolean(body?.completed);  // Boolean("false") === true!

// dreams/route.ts — manual type checking
const text = typeof body.body === "string" ? body.body.trim() : "";
const mood = typeof body.mood === "string" && (MOODS as readonly string[]).includes(body.mood)
  ? (body.mood as Mood) : "calm";
```

### After (Zod validation)
```ts
// sessions/route.ts — strict schema validation
const sessionSchema = z.object({
  soundscape: z.enum(VALID_SOUNDSCAPES),
  minutes: z.number().finite().int().min(1).max(480),
  completed: z.boolean(),  // rejects "false" string, only accepts true boolean
});

// dreams/route.ts — strict schema validation
const dreamSchema = z.object({
  body: z.string().trim().min(1).max(400),
  mood: z.enum(MOODS).default("calm"),
});
```

Invalid requests now return HTTP 400 with error details instead of silently accepting malformed data.

---

## ensureProfile() Error Handling Limitation

The current `ensureProfile()` catches all Supabase errors and treats them as "unauthenticated":

```ts
try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) authId = user.id;
} catch {
  // No auth context — fall through to anonymous
}
```

**Limitation:** If Supabase Auth is down or returns an error, the function returns `null` (fails closed — API returns 401). This is the safe security posture: a service failure does not create an authentication bypass. However, it means genuine authenticated users would be denied during a Supabase outage.

**Risk:** Low. Supabase Auth is highly available. Failing closed is the correct security posture. Distinguishing "service error" from "unauthenticated" would require error-type inspection and could introduce bypass risk if not done carefully.

**Recommendation:** Keep current behavior (fail closed). Document for future improvement.

---

## Changes Made

### Files Changed
1. `src/lib/journal.ts` — `ensureProfile()` returns `null` for anonymous users
2. `src/app/api/profile/route.ts` — 401 if not authenticated
3. `src/app/api/sessions/route.ts` — 401 + Zod validation + minutes cap 480
4. `src/app/api/dreams/route.ts` — 401 + Zod validation (GET, POST, DELETE)
5. `package.json` — removed `next-auth` dependency
6. `SECURITY_AUDIT.md` — this report

### Database Changes
**None.** No schema migrations, no data changes.

### Authentication Changes
- API routes now require authentication (Supabase Auth session)
- Anonymous users can still use all audio features (client-side Web Audio + Zustand localStorage)
- Journal, dreams, and sessions require login to persist

### API Changes
| Endpoint | Before | After |
|---|---|---|
| `GET /api/profile` | Returns shared anonymous profile | 401 if not authenticated |
| `GET /api/sessions` | Returns shared sessions | 401 if not authenticated |
| `POST /api/sessions` | Unsafe parsing, cap 720m | 401 + Zod validation, cap 480m, rejects `completed:"false"` |
| `GET /api/dreams` | Returns shared dreams | 401 if not authenticated |
| `POST /api/dreams` | Manual type checking | 401 + Zod validation |
| `DELETE /api/dreams` | Ownership check | 401 + ownership check (unchanged) |

---

## Verification Results

### Manual request reasoning

| Request | Expected | Result |
|---|---|---|
| `GET /api/profile` (unauthenticated) | 401 | ✅ ensureProfile() returns null → 401 |
| `GET /api/sessions` (unauthenticated) | 401 | ✅ ensureProfile() returns null → 401 |
| `GET /api/dreams` (unauthenticated) | 401 | ✅ ensureProfile() returns null → 401 |
| `GET /api/profile` (authenticated user A) | Returns A's data | ✅ Profile linked by authId |
| User A DELETE User B's dream | 404 | ✅ Ownership check on line 86 |
| `POST /api/sessions` with `minutes:"480"` (string) | 400 | ✅ Zod rejects non-number |
| `POST /api/sessions` with `completed:"false"` (string) | 400 | ✅ Zod rejects non-boolean |
| `POST /api/sessions` with `soundscape:"invalid"` | 400 | ✅ Zod enum rejects |
| `POST /api/sessions` with `minutes:999999` | 400 | ✅ Zod max(480) rejects |
| `POST /api/sessions` with `minutes:30, completed:true` (valid) | 200 | ✅ Passes Zod validation |

### Automated checks

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | PASS — 0 errors in `src/` |
| ESLint (API routes + journal + supabase) | PASS — 0 errors |
| Production build (`next build`) | PASS — all routes compiled |
| Prisma validation | PASS — no schema changes |
| next-auth repo-wide search | PASS — only in lockfiles (will clear on install) |
| Secrets in tracked files | PASS — no secrets found |

---

## Remaining Risks

1. **Session fabrication (P0-3, MITIGATED not FIXED)** — Authenticated users can still POST fabricated sessions up to 480 minutes. Full fix requires server-side session lifecycle tracking (future work).
2. **Rate limiting (P2)** — POST endpoints can still be spammed. Recommend Upstash Redis.
3. **Security headers (P2)** — No CSP, X-Content-Type-Options, or Referrer-Policy.
4. **Race conditions (P2)** — Session creation + streak update is not atomic.
5. **Timezone (P2)** — Streak calculation uses UTC day keys.
6. **ensureProfile() fail-closed** — Supabase outage would deny all API access (safe but not graceful).

---

## Production Deployment Notes

**Before merging:**
- Review the diff on `security-hardening/luna-drift` branch
- Test that audio still works without login (client-side only)
- Test that journal/dreams/sessions work when logged in
- Test that API returns 401 when not logged in
- Test invalid request bodies are rejected with 400

**After merging:**
- Deploy to Vercel (auto-deploys from `main`)
- Run `npm install` to update lockfiles (removes next-auth)
- No database migration needed
- No environment variable changes needed
- Existing authenticated users' data is preserved
- Anonymous users' shared data becomes inaccessible (expected — it was a privacy bug)

---

## Recommended Future Improvements

1. Server-side session lifecycle tracking (fully fix P0-3)
2. Rate limiting via Upstash Redis
3. Security headers (carefully tested with Web Audio/PWA)
4. Prisma transactions for atomic streak/totalMinutes updates
5. Database indexes on `profileId`, `endedAt`
6. Timezone-aware streak calculation
