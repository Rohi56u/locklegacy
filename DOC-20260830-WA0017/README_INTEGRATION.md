# LegacyLock — Frontend Wiring (Integration Notes)

Everything here was added on top of your 51 existing HTML files.
**No CSS, Tailwind classes, colors, layout, or grid structure was changed anywhere.**
Every file received exactly two additions, both invisible to the design:

1. `data-page="<filename>.html"` on `<body>` — lets `app.js` know which
   screen it's on without depending on `location.pathname` (so it also
   works opened directly from disk, not just from a server).
2. `<script src="app.js"></script>` right before `</body>`.

Everything else — routing, forms, sliders/toggles, localStorage — lives in
the one file: **`app.js`**.

## How navigation works

`app.js` has a `ROUTES` map with all 51 screens (`next` / `back`, plus
named actions like `skip`, `edit`, `pause`, `deleteAccount` where a screen
has more than one exit). Two layers wire it up:

- **23 screens with bespoke logic** (forms that save real data, the
  check-in policy screen, the vault, the claims dossier, sign-in/up,
  nominees, etc.) — hand-written against their actual markup.
- **The remaining 28 screens** use a generic nav engine: it scans the
  page's own buttons/links for its primary action (text like "Continue",
  "Verify", "Confirm", "Save…", or — failing that — the last
  brand-colored button) and its back action (an `arrow_back` icon or
  "Back"/"Cancel" text), then wires it to `ROUTES[currentPage].next` /
  `.back`. This is why every screen is clickable end‑to‑end even though
  only a third of them needed custom data logic.

Every `next`/`back` target in `ROUTES` was cross-checked against the real
filenames — there are no dead links in the map.

## The 6-phase journey, as built

```
Landing/Marketing → Sign Up → Confirm Identity → Vault Passphrase
  → Recovery Setup → Recovery Kit → What to Secure → Onboarding Checklist
  → Dashboard ⇄ Encrypted Vault ⇄ Add/Review Bank/Crypto/Insurance/
    Investment/Digital-Legacy records ⇄ Asset Details/Edit

Dashboard → Check-in Policy (live timeline preview)
          → Check-in action (Yes I'm active / Need more time / Pause)
          → Escalation Center → Pause Release

Dashboard → Trustees/Nominees → Invite → Contact status

Nominee invite link → Nominee Auth → Identity Verification
  → Death Certificate Upload → AI Document Review → Controlled Release
    Approval → Claim Dossier (AI-generated, pulls every saved record)
  → Nominee Claim Dashboard → Release Complete
```

## Mock data layer (localStorage)

One JSON blob under the key `legacylock_db_v1`. Shape:

```js
{ user, passphraseSet, vaultCategories, checkInPolicy, checkInHistory,
  remindersPaused, records: { bank, crypto, insurance, investment, digital_legacy },
  nominees, caseId, draft }
```

- `add_bank_record` → `review_bank_record`: bank form fields are read by
  **label text** (most of these forms have no `id`/`name` attributes at
  all), saved to `records.bank`, and the review screen re-populates the
  "Institution / Branch / Account Type / Account Number" fields from that
  same object.
- `add_crypto/insurance/investment/digital_legacy_record` all save the
  same way and drop the user back on the **Encrypted Vault**, which now
  renders every saved record as a real row in "Recent Records" (cloned
  from your existing row markup) and bumps the matching category card's
  item count.
- `claim_dossier_preview` generates a Case ID once, stamps today's date,
  and appends every saved record into the Asset Inventory table — this
  is the actual "AI Claims Dossier" data flow you asked about, sourced
  from whatever the owner added earlier in the flow.
- Check-in frequency (30/60/90-day pills) and grace period (7/14/30-day
  select) update the "Policy Timeline Preview" text live on change —
  this is the "slider" behavior from the brief; the screen uses a
  segmented pill control rather than an `<input type="range">`, so I
  wired real-time updates to that control instead of changing it to a
  slider (which would've meant redesigning it).

## Two things worth knowing before you ship this

1. **Inconsistent product name across the mockups.** The 51 files
   currently say four different names depending on which one you open:
   `LegacyLock`, `VaultGuard`, `Aethelgard`, and `Aeterna` (e.g. compare
   `encrypted_vault_desktop.html`'s header vs. `add_bank_record_desktop.html`'s
   vs. `claim_dossier_preview_desktop.html`'s footer). I left this
   exactly as-is since it's copy, not something you asked me to touch —
   flagging it in case it wasn't intentional across 51 files.
2. **localStorage is a mock layer, not a production one.** For an app
   whose whole job is holding banking/insurance/crypto details, plain
   `localStorage` (unencrypted, readable by any script on the page) is
   fine for this prototype but shouldn't hold real user data once a
   backend exists. `loadDB`/`saveDB` in `app.js` are the only two
   functions that would need to become real API calls — everything else
   is written against the same data shape either way.

## QA pass (post-delivery)

After the first build, every screen was statically checked — do the
nav-detection patterns actually find a clickable primary action on each
of the 51 files, and does every `back` route have a real back element to
bind to. This caught two real bugs, both now fixed in `app.js`:

1. **`recovery_kit_confirmation_desktop.html`** — its CTA text ("I stored
   my recovery kit safely") didn't match any pattern, and its button uses
   an arbitrary `bg-[#4b41e1]` color instead of the shared design-token
   classes, so the styled-button fallback missed it too. Added a specific
   pattern for it, and broadened the fallback to also recognize
   arbitrary-hex button backgrounds generally (in case other screens use
   the same style).
2. **The persistent left sidebar** (Vault / Beneficiaries / Recovery /
   Security / Settings / Lock Vault, present on the dashboard, Trustees,
   and other authenticated screens) was only wired on one page, and used
   an exact text match that could never succeed — each link's text is an
   icon ligature name immediately followed by its label with no
   separator (e.g. `"vape_free\nVault"`, not `"Vault"`), so `=== 'Vault'`
   never matched. Replaced with a scoped "contains" match (`wireSidebarShell`)
   that runs globally wherever that sidebar appears, ordered so "Lock
   Vault" is never swallowed by the shorter "Vault" match.

The `back`-route check also flagged ~30 screens with no detectable back
icon/button — investigated individually and confirmed these pages
genuinely don't have a dedicated back element in the design (they rely on
the sidebar, top nav, or are hub pages reachable from multiple places), so
there was nothing to wire; those `back` values in `ROUTES` are simply
unused on those screens rather than broken.

What this pass did **not** cover: live rendering in an actual browser.
Everything above was verified at the code/markup level (pattern matching,
DOM structure, link-target completeness) — a quick click-through on your
end, especially of the ~28 screens using the generic nav engine rather
than a bespoke module, is still worth doing before you treat this as
final.

## Testing it

Everything is plain static files — open `legacylock_landing_page.html`
directly in a browser, or serve the folder (`python3 -m http.server`)
and click through. Run `LL.dump()` in devtools console any time to see
the full mock vault as JSON.
