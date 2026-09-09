/* =====================================================================
   LegacyLock — app.js
   Central routing, UI interactivity, and mock localStorage data layer
   for the 51-screen static frontend. Pure vanilla JS, no build step.

   Drop this file next to the HTML files and add, before </body>:
       <script src="app.js"></script>
   (already done for you in every file — see inject_report.txt)

   HOW THIS FILE IS ORGANIZED
   ----------------------------------------------------------------
   1. ROUTES        the full 51-screen sequential map (next / back)
   2. DB             localStorage-backed mock database + helpers
   3. UTIL           small generic DOM / string helpers
   4. NAV ENGINE     finds the "primary" and "back" action on ANY
                      page by reading its own button text, and wires
                      it to ROUTES automatically — this is what makes
                      the ~30 screens with no bespoke module below
                      still fully clickable end‑to‑end
   5. GLOBAL WIRING  header icons (bell/account/lock/menu/help),
                      top-nav text links, check-in live preview
   6. PAGE MODULES   bespoke logic for the screens that actually move
                      data: add/review records, check-in policy,
                      the claims dossier, the vault, notifications,
                      auth, nominees, check-in itself, etc.
   7. BOOTSTRAP      runs everything on DOMContentLoaded

   NOTE ON localStorage AS THE DATA LAYER
   ----------------------------------------------------------------
   This is intentionally a MOCK layer per the brief (no backend yet).
   Every add_*_record screen, the check-in policy, nominees, and the
   claims dossier all read/write a single JSON blob under one key
   (DB_KEY below) so the whole app is exportable/inspectable from
   devtools. Real banking/insurance/crypto data should never ship to
   production sitting in plain localStorage — swap loadDB/saveDB for
   real API calls later; every other function in this file is written
   against that same DB shape, so the rest of the app won't need to
   change.
   ===================================================================== */

(function () {
  'use strict';

  /* ============================== 1. ROUTES ============================== */
  var ROUTES = {
    // Marketing (public)
    'legacylock_landing_page.html':          { next: 'create_secure_account_desktop.html' },
    'a_calmer_way_to_prepare_desktop.html':  { next: 'legacylock_landing_page.html', back: 'legacylock_landing_page.html' },
    'legacylock_pricing_plans.html':         { next: 'create_secure_account_desktop.html', back: 'legacylock_landing_page.html' },
    'contact_legacylock.html':               { next: 'legacylock_landing_page.html', back: 'legacylock_landing_page.html' },

    // Auth & account setup
    'create_secure_account_desktop.html':    { next: 'confirm_identity_desktop.html', back: 'legacylock_landing_page.html' },
    'confirm_identity_desktop.html':         { next: 'create_vault_passphrase_desktop.html', back: 'create_secure_account_desktop.html' },
    'create_vault_passphrase_desktop.html':  { next: 'recovery_setup_desktop.html', back: 'confirm_identity_desktop.html' },
    'secure_sign_in_desktop.html':           { next: 'legacylock_dashboard_desktop.html', back: 'legacylock_landing_page.html' },

    // Onboarding
    'recovery_setup_desktop.html':           { next: 'recovery_kit_confirmation_desktop.html', back: 'create_vault_passphrase_desktop.html' },
    'recovery_kit_confirmation_desktop.html':{ next: 'what_would_you_like_to_secure_desktop.html', back: 'recovery_setup_desktop.html' },
    'what_would_you_like_to_secure_desktop.html': { next: 'onboarding_dashboard_desktop.html', back: 'recovery_kit_confirmation_desktop.html', skip: 'legacylock_dashboard_desktop.html' },
    'onboarding_dashboard_desktop.html':     { next: 'legacylock_dashboard_desktop.html', back: 'what_would_you_like_to_secure_desktop.html' },

    // Hub (authenticated, ongoing use)
    'legacylock_dashboard_desktop.html':     { next: 'encrypted_vault_desktop.html' },
    'encrypted_vault_desktop.html':          { next: 'what_would_you_like_to_secure_desktop.html', back: 'legacylock_dashboard_desktop.html' },
    'notification_center_desktop.html':      { next: 'legacylock_dashboard_desktop.html', back: 'legacylock_dashboard_desktop.html' },
    'secure_document_vault_desktop.html':    { next: 'encrypted_vault_desktop.html', back: 'encrypted_vault_desktop.html' },

    // Asset records
    'add_bank_record_desktop.html':          { next: 'review_bank_record_desktop.html', back: 'encrypted_vault_desktop.html' },
    'review_bank_record_desktop.html':       { next: 'encrypted_vault_desktop.html', back: 'add_bank_record_desktop.html' },
    'add_crypto_record_desktop.html':        { next: 'encrypted_vault_desktop.html', back: 'encrypted_vault_desktop.html' },
    'add_insurance_record_desktop.html':     { next: 'encrypted_vault_desktop.html', back: 'encrypted_vault_desktop.html' },
    'add_investment_record_desktop.html':    { next: 'encrypted_vault_desktop.html', back: 'encrypted_vault_desktop.html' },
    'add_digital_legacy_record_desktop.html':{ next: 'encrypted_vault_desktop.html', back: 'encrypted_vault_desktop.html' },
    'asset_record_details_desktop.html':     { next: 'institution_document_checklist_desktop.html', back: 'encrypted_vault_desktop.html', edit: 'edit_asset_record_desktop.html' },
    'edit_asset_record_desktop.html':        { next: 'asset_record_details_desktop.html', back: 'asset_record_details_desktop.html' },
    'institution_document_checklist_desktop.html': { next: 'encrypted_vault_desktop.html', back: 'asset_record_details_desktop.html' },

    // Check-in / inactivity trigger
    'check_in_configuration_desktop.html':   { next: 'legacylock_dashboard_desktop.html', back: 'legacylock_dashboard_desktop.html' },
    'legacylock_check_in_desktop.html':      { next: 'check_in_confirmed_desktop.html', back: 'legacylock_dashboard_desktop.html' },
    'check_in_confirmed_desktop.html':       { next: 'legacylock_dashboard_desktop.html', back: 'legacylock_dashboard_desktop.html' },
    'check_in_history_desktop.html':         { next: 'legacylock_dashboard_desktop.html', back: 'legacylock_dashboard_desktop.html' },
    'escalation_center_desktop.html':        { next: 'legacylock_check_in_desktop.html', back: 'legacylock_dashboard_desktop.html', pause: 'pause_release_process_desktop.html' },
    'pause_release_process_desktop.html':    { next: 'escalation_center_desktop.html', back: 'escalation_center_desktop.html' },

    // Nominee / trustee management (owner side)
    'trustees_nominees_desktop.html':        { next: 'invite_trusted_person_desktop.html', back: 'legacylock_dashboard_desktop.html' },
    'invite_trusted_person_desktop.html':    { next: 'trustees_nominees_desktop.html', back: 'trustees_nominees_desktop.html' },
    'contact_detail_status_desktop.html':    { next: 'trustees_nominees_desktop.html', back: 'trustees_nominees_desktop.html' },

    // Nominee claim flow (nominee side — reached via an external invite link)
    'nominee_invitation_landing_page_desktop.html': { next: 'nominee_authentication_mobile.html' },
    'nominee_authentication_mobile.html':    { next: 'nominee_identity_verification_desktop.html', back: 'nominee_invitation_landing_page_desktop.html' },
    'nominee_identity_verification_desktop.html':   { next: 'death_certificate_upload_desktop.html', back: 'nominee_authentication_mobile.html' },
    'death_certificate_upload_desktop.html': { next: 'ai_assisted_document_review_desktop.html', back: 'nominee_identity_verification_desktop.html' },
    'ai_assisted_document_review_desktop.html': { next: 'controlled_release_approval_desktop.html', back: 'death_certificate_upload_desktop.html' },
    'controlled_release_approval_desktop.html': { next: 'claim_dossier_preview_desktop.html', back: 'ai_assisted_document_review_desktop.html' },
    'claim_dossier_preview_desktop.html':    { next: 'nominee_claim_dashboard_desktop.html', back: 'controlled_release_approval_desktop.html' },
    'nominee_claim_dashboard_desktop.html':  { next: 'release_complete_desktop.html', back: 'claim_dossier_preview_desktop.html' },
    'release_complete_desktop.html':         { next: null },
    'release_complete_mobile.html':          { next: null },

    // Utility / settings
    'security_center_desktop.html':          { next: 'check_in_configuration_desktop.html', back: 'legacylock_dashboard_desktop.html' },
    'security_privacy_console.html':         { next: 'settings_data_controls_desktop.html', back: 'security_center_desktop.html' },
    'settings_data_controls_desktop.html':   { next: 'legacylock_dashboard_desktop.html', back: 'legacylock_dashboard_desktop.html', deleteAccount: 'account_deletion_warning_desktop.html' },
    'account_deletion_warning_desktop.html': { next: 'legacylock_landing_page.html', back: 'settings_data_controls_desktop.html' },
    'audit_log_desktop.html':                { next: 'security_center_desktop.html', back: 'security_center_desktop.html' },
    'support_state_hub_desktop.html':        { next: 'support_ticket_detail_desktop.html', back: 'legacylock_dashboard_desktop.html' },
    'support_ticket_detail_desktop.html':    { next: 'support_state_hub_desktop.html', back: 'support_state_hub_desktop.html' }
  };

  /* ============================== 2. DB (localStorage) ============================== */
  var DB_KEY = 'legacylock_db_v1';

  function defaultDB() {
    return {
      user: null,
      passphraseSet: false,
      vaultCategories: [],
      checkInPolicy: { frequency: 60, gracePeriod: 14, notifyEmail: true, notifySms: true, notifyPush: false, escalationEnabled: true },
      checkInHistory: [],
      remindersPaused: false,
      records: { bank: [], crypto: [], insurance: [], investment: [], digital_legacy: [] },
      nominees: [],
      caseId: null,
      draft: {}
    };
  }

  function loadDB() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (!raw) return defaultDB();
      var parsed = JSON.parse(raw);
      var base = defaultDB();
      return Object.assign(base, parsed, {
        records: Object.assign(base.records, parsed.records || {}),
        checkInPolicy: Object.assign(base.checkInPolicy, parsed.checkInPolicy || {}),
        draft: parsed.draft || {}
      });
    } catch (e) {
      console.warn('LegacyLock: could not read local vault, starting fresh.', e);
      return defaultDB();
    }
  }

  function saveDB(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); return true; }
    catch (e) { console.warn('LegacyLock: could not persist to localStorage.', e); return false; }
  }

  function updateDB(mutator) {
    var db = loadDB();
    mutator(db);
    saveDB(db);
    return db;
  }

  function genId(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function addRecord(type, data) {
    var record = Object.assign({ id: genId(type), createdAt: new Date().toISOString() }, data);
    updateDB(function (db) {
      if (!db.records[type]) db.records[type] = [];
      db.records[type].push(record);
    });
    return record;
  }

  function allRecords() {
    var db = loadDB(), out = [];
    Object.keys(db.records).forEach(function (type) {
      (db.records[type] || []).forEach(function (r) { out.push(Object.assign({ _type: type }, r)); });
    });
    return out;
  }

  /* ============================== 3. UTIL ============================== */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function currentPage() {
    var p = location.pathname.split('/').pop();
    return (p && p.length ? p : (document.body.getAttribute('data-page') || ''));
  }

  function go(url) { if (url) location.href = url; }

  function bindOnce(el, evt, handler) {
    if (!el || el.dataset.llBound === '1') return;
    el.dataset.llBound = '1';
    el.addEventListener(evt, handler);
  }

  function slugify(s) {
    return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fieldKey(el) {
    if (el.name) return el.name;
    if (el.id) return el.id;
    var wrap = el.closest('div, label');
    var label = wrap && wrap.querySelector('label');
    if (label && label.textContent.trim()) return slugify(label.textContent);
    if (el.placeholder) return slugify(el.placeholder);
    return slugify(el.tagName + '_' + $all(el.tagName, document).indexOf(el));
  }

  // Reads every input/select/textarea under `root` into a plain object keyed
  // by its <label> text, name, id, or placeholder (in that priority). Several
  // of the record forms in this project have no id/name at all, so the label
  // fallback is what makes generic saving work without touching the markup.
  function collectContainerData(root) {
    var data = {};
    $all('input, select, textarea', root).forEach(function (el) {
      var key = fieldKey(el);
      if (el.type === 'checkbox') { data[key] = el.checked; return; }
      if (el.type === 'radio') { if (el.checked) data[key] = el.value; return; }
      if (el.value !== undefined && el.value !== '') data[key] = el.value;
    });
    return data;
  }

  // Finds elements whose text matches a known label (e.g. "Institution"),
  // and overwrites the text of the very next sibling element — this is the
  // "label div, then value div" convention used throughout the review /
  // dossier / detail screens in this design system.
  function populateLabeledFields(map) {
    $all('[class*="label-caps"]').forEach(function (labelEl) {
      var key = labelEl.textContent.trim();
      if (!Object.prototype.hasOwnProperty.call(map, key)) return;
      var valueEl = labelEl.nextElementSibling;
      if (!valueEl) return;
      if (valueEl.children.length === 0) {
        valueEl.textContent = map[key];
      } else {
        for (var i = 0; i < valueEl.childNodes.length; i++) {
          if (valueEl.childNodes[i].nodeType === 3 && valueEl.childNodes[i].textContent.trim()) {
            valueEl.childNodes[i].textContent = map[key] + ' ';
            break;
          }
        }
      }
    });
  }

  function fmtDate(d) {
    d = d ? new Date(d) : new Date();
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  function toast(msg, tone) {
    var host = document.getElementById('ll-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'll-toast-host';
      host.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none';
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.textContent = msg;
    el.className = (tone === 'error' ? 'bg-error text-on-error' : 'bg-primary text-on-primary') +
      ' px-5 py-3 rounded-lg shadow-lg font-label-md text-label-md opacity-0 transition-opacity duration-200';
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.remove('opacity-0'); });
    setTimeout(function () {
      el.classList.add('opacity-0');
      setTimeout(function () { el.remove(); }, 250);
    }, 2600);
  }

  /* ============================== 4. NAV ENGINE ============================== */
  var CTA_PATTERNS = [
    /encrypt and save/i, /save (check-in )?polic/i, /save (and )?continue/i, /save changes/i,
    /save securely/i, /save safe recovery/i, /save record/i, /secure record/i,
    /create secure account/i, /continue securely/i, /request reviewer approval/i,
    /upload and encrypt/i, /check in now/i, /^yes,?\s*i.?m active/i, /confirm/i, /verify/i,
    /continue/i, /^next$/i, /^get started/i, /^sign up/i, /^sign in/i, /submit/i,
    /^send$/i, /invite/i, /add trusted person/i, /^add record/i, /^proceed/i, /^done$/i,
    /^resend invite$/i, /^continue securely/i, /stored my recovery kit/i, /recovery kit safely/i
  ];
  var SKIP_PATTERNS = /cancel|save for later|save draft|^back$|not now|remind me later/i;
  var BACK_PATTERNS = /^back(\s|$)|back to |^cancel$/i;

  function findPrimaryCTA(root) {
    root = root || document.querySelector('main') || document.body;
    var candidates = $all('button, a', root).filter(function (el) {
      var t = el.textContent.trim();
      return t && el.dataset.llBound !== '1';
    });
    for (var i = 0; i < CTA_PATTERNS.length; i++) {
      var pat = CTA_PATTERNS[i];
      var found = candidates.filter(function (el) {
        var t = el.textContent.trim();
        return pat.test(t) && !SKIP_PATTERNS.test(t);
      });
      if (found.length) return found[found.length - 1];
    }
    var styled = candidates.filter(function (el) {
      return /bg-secondary(?!-fixed)|bg-indigo-cta|(^|\s)bg-primary(\s|$)|bg-\[#/.test(el.className) && !SKIP_PATTERNS.test(el.textContent.trim());
    });
    return styled.length ? styled[styled.length - 1] : null;
  }

  function findBackAction(root) {
    root = root || document;
    var candidates = $all('header button, header a, main button, main a', root);
    return candidates.find(function (el) {
      if (el.dataset.llBound === '1') return false;
      var t = el.textContent.trim();
      return /arrow_back/.test(el.innerHTML) || BACK_PATTERNS.test(t);
    });
  }

  function bindGenericNav(page) {
    var route = ROUTES[page];
    if (!route) return;
    var cta = findPrimaryCTA();
    if (cta) {
      bindOnce(cta, 'click', function (e) {
        e.preventDefault();
        try {
          var data = collectContainerData(document.querySelector('main') || document.body);
          if (Object.keys(data).length) updateDB(function (db) { db.draft[page] = data; });
        } catch (err) { /* best-effort only */ }
        go(route.next);
      });
    }
    if (route.back) {
      var back = findBackAction();
      if (back) bindOnce(back, 'click', function (e) { e.preventDefault(); go(route.back); });
    }
  }

  /* ============================== 5. GLOBAL WIRING ============================== */
  function iconName(el) {
    var span = el.querySelector('[data-icon]');
    if (span) return span.getAttribute('data-icon');
    return el.textContent.trim();
  }

  function wireHeaderIcons() {
    $all('header button, nav button, header a').forEach(function (el) {
      if (el.dataset.llBound === '1') return;
      var icon = iconName(el);
      if (/^notifications/.test(icon)) {
        bindOnce(el, 'click', function (e) { e.preventDefault(); go('notification_center_desktop.html'); });
      } else if (icon === 'account_circle') {
        bindOnce(el, 'click', function (e) { e.preventDefault(); go('legacylock_dashboard_desktop.html'); });
      } else if (icon === 'lock' && el.tagName === 'BUTTON' && el.children.length <= 1) {
        bindOnce(el, 'click', function (e) { e.preventDefault(); go('secure_sign_in_desktop.html'); });
      } else if (icon === 'menu') {
        bindOnce(el, 'click', function (e) {
          e.preventDefault();
          document.body.classList.toggle('ll-mobile-nav-open');
          var sidebar = document.querySelector('aside, [class*="sidebar"]');
          if (sidebar) {
            if (/(^|\s)hidden(\s|$)/.test(sidebar.className)) sidebar.classList.toggle('hidden');
            else if (/-translate-x-full/.test(sidebar.className)) sidebar.classList.toggle('-translate-x-full');
          }
        });
      } else if (icon === 'help') {
        bindOnce(el, 'click', function (e) { e.preventDefault(); go('support_state_hub_desktop.html'); });
      }
    });

    var NAV_TEXT_MAP = {
      'vault': 'encrypted_vault_desktop.html', 'vaults': 'encrypted_vault_desktop.html',
      'security': 'security_center_desktop.html', 'support': 'support_state_hub_desktop.html',
      'pricing': 'legacylock_pricing_plans.html', 'beneficiaries': 'trustees_nominees_desktop.html',
      'trustees': 'trustees_nominees_desktop.html', 'recovery': 'recovery_setup_desktop.html',
      'settings': 'settings_data_controls_desktop.html', 'product': 'legacylock_landing_page.html',
      'dashboard': 'legacylock_dashboard_desktop.html', 'digital assets': 'encrypted_vault_desktop.html',
      'legacy plan': 'onboarding_dashboard_desktop.html', 'audit log': 'audit_log_desktop.html',
      'contact support': 'support_state_hub_desktop.html', 'secure login': 'secure_sign_in_desktop.html',
      'portfolio': 'encrypted_vault_desktop.html'
    };
    $all('header nav a, nav a').forEach(function (a) {
      if (a.dataset.llBound === '1') return;
      var key = a.textContent.trim().toLowerCase();
      if (NAV_TEXT_MAP[key]) bindOnce(a, 'click', function (e) { e.preventDefault(); go(NAV_TEXT_MAP[key]); });
    });
  }

  // Check-in policy screen: radio pills + grace-period <select> update the
  // "Policy Timeline Preview" text live, exactly like a slider+counter would.
  function wireCheckInTimelinePreview() {
    var freqInputs = $all('input[name="frequency"]');
    if (!freqInputs.length) return;
    var graceSelect = $all('select').find(function (s) {
      return $all('option', s).some(function (o) { return /Days?$/.test(o.textContent.trim()); });
    });
    function apply() {
      var freq = (freqInputs.find(function (r) { return r.checked; }) || {}).value || '60';
      var grace = graceSelect ? graceSelect.value : '14';
      $all('p, div').forEach(function (node) {
        if (node.children.length) return;
        var t = node.textContent.trim();
        if (/^Day \d+$/.test(t)) node.textContent = 'Day ' + freq;
        if (/^\d+ days to resolve$/.test(t)) node.textContent = grace + ' days to resolve';
      });
    }
    freqInputs.forEach(function (r) { r.addEventListener('change', apply); });
    if (graceSelect) graceSelect.addEventListener('change', apply);
    apply();
  }

  // Best-effort autosave of any checkbox/radio/select change into a draft
  // bucket, so toggles/selects are never purely decorative even on pages
  // with no bespoke module below.
  function wireToggleValuePersistence(page) {
    $all('input, select').forEach(function (el) {
      if (el.dataset.llValueBound === '1') return;
      el.dataset.llValueBound = '1';
      el.addEventListener('change', function () {
        try {
          updateDB(function (db) {
            if (!db.draft[page]) db.draft[page] = {};
            db.draft[page][fieldKey(el)] = el.type === 'checkbox' ? el.checked : el.value;
          });
        } catch (e) { /* non-fatal */ }
      });
    });
  }

  /* ============================== 6. PAGE MODULES ============================== */

  function initCheckInConfiguration() {
    wireCheckInTimelinePreview();
    var save = findPrimaryCTA();
    if (!save) return;
    bindOnce(save, 'click', function (e) {
      e.preventDefault();
      var freq = (document.querySelector('input[name="frequency"]:checked') || {}).value || '60';
      var graceSelect = document.querySelector('select');
      var checks = $all('input[type="checkbox"]');
      updateDB(function (db) {
        db.checkInPolicy.frequency = parseInt(freq, 10);
        if (graceSelect) db.checkInPolicy.gracePeriod = parseInt(graceSelect.value, 10);
        if (checks[0]) db.checkInPolicy.notifyEmail = checks[0].checked;
        if (checks[1]) db.checkInPolicy.notifySms = checks[1].checked;
        if (checks[2]) db.checkInPolicy.notifyPush = checks[2].checked;
        var toggle = document.querySelector('input[type="checkbox"].peer, input.peer[type="checkbox"]');
        if (toggle) db.checkInPolicy.escalationEnabled = toggle.checked;
      });
      toast('Check-in policy saved');
      setTimeout(function () { go(ROUTES[currentPage()].next); }, 450);
    });
  }

  function initAddBankRecord() {
    var main = document.querySelector('main') || document.body;
    var cta = findPrimaryCTA();
    if (!cta) return;
    bindOnce(cta, 'click', function (e) {
      e.preventDefault();
      var data = collectContainerData(main);
      var record = addRecord('bank', {
        bankName: data['bank_name'] || '',
        branch: data['branch_city'] || '',
        accountType: data['account_type'] || 'Checking',
        last4: data['last_4_digits'] || ''
      });
      updateDB(function (db) { db.draft.lastAddedRecord = { type: 'bank', id: record.id }; });
      toast('Deposit record saved — continuing to review');
      setTimeout(function () { go('review_bank_record_desktop.html'); }, 400);
    });
  }

  function initReviewBankRecord() {
    var db = loadDB();
    var last = db.draft.lastAddedRecord;
    var record = (last && last.type === 'bank') ? db.records.bank.find(function (r) { return r.id === last.id; }) : db.records.bank[db.records.bank.length - 1];
    if (record) {
      populateLabeledFields({
        'Institution': record.bankName || '—',
        'Branch': record.branch || '—',
        'Account Type': record.accountType || '—',
        'Account Number': record.last4 ? '•••• ' + record.last4 : '•••• ••••'
      });
    }
    var editBtn = $all('button, a').find(function (el) { return /edit details/i.test(el.textContent.trim()); });
    if (editBtn) bindOnce(editBtn, 'click', function (e) { e.preventDefault(); go('add_bank_record_desktop.html'); });
    var saveBtn = findPrimaryCTA();
    if (saveBtn) bindOnce(saveBtn, 'click', function (e) {
      e.preventDefault();
      toast('Record encrypted and saved to your vault');
      setTimeout(function () { go('encrypted_vault_desktop.html'); }, 450);
    });
  }

  function genericAddRecordHandler(type) {
    return function () {
      var main = document.querySelector('main') || document.body;
      var cta = findPrimaryCTA();
      if (!cta) return;
      bindOnce(cta, 'click', function (e) {
        e.preventDefault();
        var data = collectContainerData(main);
        var record = addRecord(type, data);
        updateDB(function (db) { db.draft.lastAddedRecord = { type: type, id: record.id }; });
        toast('Record saved to your encrypted vault');
        setTimeout(function () { go('encrypted_vault_desktop.html'); }, 400);
      });
    };
  }

  function initEncryptedVault() {
    var records = allRecords();
    var icons = { bank: 'account_balance', crypto: 'currency_bitcoin', insurance: 'health_and_safety', investment: 'trending_up', digital_legacy: 'cloud' };
    var catLabels = { bank: 'Bank & deposits', crypto: 'Crypto', insurance: 'Insurance', investment: 'Investments', digital_legacy: 'Cloud & digital' };

    var tbody = $all('table tbody')[0];
    if (tbody && records.length) {
      records.slice().reverse().forEach(function (r) {
        var name = escapeHtml(r.bankName || r.provider || r.exchange || r.platform || r.assetName || (catLabels[r._type] + ' record'));
        var tr = document.createElement('tr');
        tr.className = 'hover:bg-surface-container-low transition-colors cursor-pointer group';
        tr.innerHTML =
          '<td class="py-4 px-4"><div class="flex items-center gap-3">' +
            '<div class="w-8 h-8 rounded bg-surface border border-border-subtle flex items-center justify-center">' +
            '<span class="material-symbols-outlined text-on-surface-variant text-[18px]">' + (icons[r._type] || 'description') + '</span></div>' +
            '<div><p class="font-label-md text-label-md text-primary">' + name + '</p>' +
            '<p class="font-body-sm text-body-sm text-outline group-hover:text-secondary transition-colors text-[10px]">Added just now</p></div></div></td>' +
          '<td class="py-4 px-4 font-body-sm text-body-sm text-on-surface-variant">' + escapeHtml(catLabels[r._type] || r._type) + '</td>' +
          '<td class="py-4 px-4 font-body-sm text-body-sm text-primary tracking-widest">••••••••</td>' +
          '<td class="py-4 px-4 font-body-sm text-body-sm text-outline text-right">' + fmtDate(r.createdAt) + '</td>';
        tr.addEventListener('click', function () {
          updateDB(function (db) { db.draft.lastViewedRecord = { type: r._type, id: r.id }; });
          go('asset_record_details_desktop.html');
        });
        tbody.insertBefore(tr, tbody.firstChild);
      });
    }

    var counts = {};
    records.forEach(function (r) { counts[r._type] = (counts[r._type] || 0) + 1; });
    $all('.grid > div h3').forEach(function (h3) {
      var label = h3.textContent.trim();
      var type = Object.keys(catLabels).find(function (t) { return catLabels[t] === label; });
      if (type && counts[type]) {
        var p = h3.parentElement.querySelector('p');
        if (p) {
          var m = p.textContent.match(/(\d+)/);
          var base = m ? parseInt(m[1], 10) : 0;
          p.textContent = (base + counts[type]) + ' items';
        }
      }
    });

    var CARD_TARGET = {
      'Bank & deposits': 'add_bank_record_desktop.html', 'Investments': 'add_investment_record_desktop.html',
      'Insurance': 'add_insurance_record_desktop.html', 'Crypto': 'add_crypto_record_desktop.html',
      'Cloud & digital': 'add_digital_legacy_record_desktop.html', 'Documents': 'secure_document_vault_desktop.html'
    };
    $all('.grid > div').forEach(function (card) {
      var h3 = card.querySelector('h3');
      var target = h3 && CARD_TARGET[h3.textContent.trim()];
      if (target) bindOnce(card, 'click', function (e) { e.preventDefault(); go(target); });
    });

    var addBtn = $all('button').find(function (b) { return /add record/i.test(b.textContent.trim()); });
    if (addBtn) bindOnce(addBtn, 'click', function (e) { e.preventDefault(); go('what_would_you_like_to_secure_desktop.html'); });

    $all('table tbody tr').forEach(function (tr) {
      if (tr.dataset.llBound === '1') return;
      bindOnce(tr, 'click', function () { go('asset_record_details_desktop.html'); });
    });
  }

  function initAssetRecordDetails() {
    var db = loadDB();
    var ref = db.draft.lastViewedRecord;
    var record = ref ? (db.records[ref.type] || []).find(function (r) { return r.id === ref.id; }) : null;
    if (record) {
      var titleEl = $('main h1') || $('h1');
      var name = record.bankName || record.provider || record.exchange || record.platform || record.assetName || 'Asset record';
      if (titleEl) titleEl.textContent = name;
      populateLabeledFields({
        'Account Number': record.last4 ? '•••• ' + record.last4 : '—',
        'Routing Number': record.branch || '—'
      });
      updateDB(function (d) { d.draft.currentAssetRef = ref; });
    }
    var editBtn = $all('button, a').find(function (el) { return /edit record/i.test(el.textContent.trim()); });
    if (editBtn) bindOnce(editBtn, 'click', function (e) { e.preventDefault(); go('edit_asset_record_desktop.html'); });
    var vaultBtn = $all('button, a').find(function (el) { return /vault$/i.test(el.textContent.trim()) || /arrow_back/.test(el.innerHTML); });
    if (vaultBtn) bindOnce(vaultBtn, 'click', function (e) { e.preventDefault(); go('encrypted_vault_desktop.html'); });
    var guidanceBtn = $all('button, a').find(function (el) { return /claim guidance/i.test(el.textContent.trim()); });
    if (guidanceBtn) bindOnce(guidanceBtn, 'click', function (e) { e.preventDefault(); go('institution_document_checklist_desktop.html'); });
  }

  function initEditAssetRecord() {
    var main = document.querySelector('main') || document.body;
    var save = $all('button').find(function (b) { return /save changes/i.test(b.textContent.trim()); });
    if (!save) return;
    bindOnce(save, 'click', function (e) {
      e.preventDefault();
      var db = loadDB();
      var ref = db.draft.currentAssetRef;
      if (ref) {
        var data = collectContainerData(main);
        updateDB(function (d) {
          var rec = (d.records[ref.type] || []).find(function (r) { return r.id === ref.id; });
          if (rec) Object.assign(rec, data);
        });
      }
      toast('Changes saved');
      setTimeout(function () { go('asset_record_details_desktop.html'); }, 400);
    });
  }

  function initCategoryPicker() {
    var cards = $all('main button').filter(function (b) { return b.querySelector('h3'); });
    function markSelected(card, on) {
      if (on) {
        card.classList.add('border-secondary', 'ring-1', 'ring-secondary');
        if (!card.querySelector('.ll-check')) {
          var h3 = card.querySelector('h3');
          var wrap = h3 && h3.parentElement;
          if (wrap) {
            if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
            var mark = document.createElement('span');
            mark.className = 'material-symbols-outlined absolute top-0 right-0 text-secondary ll-check';
            mark.style.fontVariationSettings = "'FILL' 1";
            mark.textContent = 'check_circle';
            wrap.appendChild(mark);
          }
        }
      } else {
        card.classList.remove('border-secondary', 'ring-1', 'ring-secondary');
        var existing = card.querySelector('.ll-check');
        if (existing) existing.remove();
      }
    }
    var db = loadDB();
    var selected = {};
    cards.forEach(function (card) {
      var label = (card.querySelector('h3') || {}).textContent || '';
      var key = slugify(label);
      var alreadyOn = /border-secondary/.test(card.className);
      selected[key] = db.vaultCategories.length ? db.vaultCategories.indexOf(key) > -1 : alreadyOn;
      markSelected(card, selected[key]);
      bindOnce(card, 'click', function (e) {
        e.preventDefault();
        selected[key] = !selected[key];
        markSelected(card, selected[key]);
      });
    });
    var continueBtn = $all('button').find(function (b) { return /^continue/i.test(b.textContent.trim()); });
    var laterBtn = $all('button').find(function (b) { return /save for later/i.test(b.textContent.trim()); });
    if (continueBtn) bindOnce(continueBtn, 'click', function (e) {
      e.preventDefault();
      updateDB(function (db2) { db2.vaultCategories = Object.keys(selected).filter(function (k) { return selected[k]; }); });
      go('onboarding_dashboard_desktop.html');
    });
    if (laterBtn) bindOnce(laterBtn, 'click', function (e) {
      e.preventDefault();
      updateDB(function (db2) { db2.vaultCategories = Object.keys(selected).filter(function (k) { return selected[k]; }); });
      go('legacylock_dashboard_desktop.html');
    });
  }

  function initClaimDossierPreview() {
    var db = loadDB();
    if (!db.caseId) {
      updateDB(function (d) { d.caseId = 'LL-' + Math.floor(1000 + Math.random() * 9000) + '-' + genId('').slice(-2).toUpperCase(); });
      db = loadDB();
    }
    populateLabeledFields({ 'Case ID': db.caseId, 'Prepared Date': fmtDate(new Date()) });

    var records = allRecords();
    var tbody = $('table tbody');
    if (tbody && records.length) {
      var icons = { bank: 'account_balance', crypto: 'currency_bitcoin', insurance: 'health_and_safety', investment: 'trending_up', digital_legacy: 'cloud' };
      var typeLabels = { bank: 'Bank Account', crypto: 'Crypto Asset', insurance: 'Insurance Policy', investment: 'Investment', digital_legacy: 'Digital Legacy' };
      records.forEach(function (r) {
        var name = escapeHtml(r.bankName || r.provider || r.exchange || r.platform || r.assetName || (typeLabels[r._type] + ' record'));
        var idf = r.last4 ? '••••' + escapeHtml(r.last4) : '—';
        var tr = document.createElement('tr');
        tr.className = 'hover:bg-surface-container-lowest transition-colors';
        tr.innerHTML =
          '<td class="p-4 flex items-center gap-3"><span class="material-symbols-outlined text-[20px] text-on-surface-variant w-6 h-6 flex items-center justify-center">' + (icons[r._type] || 'description') + '</span> ' + name + '</td>' +
          '<td class="p-4">' + escapeHtml(typeLabels[r._type] || r._type) + '</td>' +
          '<td class="p-4 flex items-center gap-2">' + idf + ' <span class="material-symbols-outlined text-[16px] text-verified-emerald">lock</span></td>' +
          '<td class="p-4"><span class="inline-flex items-center gap-1 text-verified-emerald bg-verified-emerald/10 px-2 py-0.5 rounded font-label-caps text-[10px]">Added</span></td>';
        tbody.appendChild(tr);
      });
    }

    var approveBtn = $all('button').find(function (el) { return /request reviewer approval/i.test(el.textContent.trim()); });
    if (approveBtn) bindOnce(approveBtn, 'click', function (e) {
      e.preventDefault();
      toast('Dossier sent for reviewer approval');
      setTimeout(function () { go('nominee_claim_dashboard_desktop.html'); }, 500);
    });
    var downloadBtn = $all('button').find(function (el) { return /download preview/i.test(el.textContent.trim()); });
    if (downloadBtn) bindOnce(downloadBtn, 'click', function (e) { e.preventDefault(); toast('Preview download simulated — no backend attached yet'); });
  }

  /* ============================== 6.5 BACKEND API CLIENT ============================== */
  var API_BASE = 'http://localhost:3000/api/v1';

  async function apiCall(endpoint, method, data, token) {
    try {
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      var resp = await fetch(API_BASE + endpoint, {
        method: method || 'GET',
        headers: headers,
        body: data ? JSON.stringify(data) : undefined,
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Backend API connection note (operating with local state):', e);
    }
    return null;
  }

  function initSignUp() {
    var cta = findPrimaryCTA();
    if (!cta) return;
    bindOnce(cta, 'click', function (e) {
      e.preventDefault();
      var fullName = ($('#fullName') || {}).value || '';
      var email = ($('#email') || {}).value || '';
      var country = ($('#country') || {}).value || '';
      if (!fullName || !email) { toast('Please fill in your name and email', 'error'); return; }
      updateDB(function (db) { db.user = { fullName: fullName, email: email, country: country, createdAt: new Date().toISOString() }; });
      
      // Async sync to NestJS backend
      apiCall('/auth/register', 'POST', {
        fullName: fullName,
        email: email,
        password: 'LegacyLockPassword2026!#',
        country: country || 'IN'
      }).then(function (res) {
        if (res && res.accessToken) {
          updateDB(function (db) {
            db.authToken = res.accessToken;
            db.userId = res.user.id;
          });
        }
      });

      toast('Account created — let\u2019s verify your identity');
      setTimeout(function () { go('confirm_identity_desktop.html'); }, 400);
    });
  }

  function initSignIn() {
    var cta = findPrimaryCTA();
    if (!cta) return;
    bindOnce(cta, 'click', function (e) {
      e.preventDefault();
      var email = ($('#email') || {}).value || '';
      var password = ($('#password') || {}).value || 'LegacyLockPassword2026!#';
      var db = loadDB();
      if (email && !db.user) updateDB(function (d) { d.user = { fullName: 'Vault Owner', email: email, createdAt: new Date().toISOString() }; });
      
      // Async authenticate against NestJS backend
      if (email) {
        apiCall('/auth/login', 'POST', {
          email: email,
          password: password
        }).then(function (res) {
          if (res && res.accessToken) {
            updateDB(function (d) {
              d.authToken = res.accessToken;
              d.userId = res.user.id;
              d.user = res.user;
            });
          }
        });
      }

      toast('Signed in securely');
      setTimeout(function () { go('legacylock_dashboard_desktop.html'); }, 300);
    });
  }

  function initCreateVaultPassphrase() {
    var form = document.getElementById('passphraseForm');
    var cta = findPrimaryCTA();
    async function submit(e) {
      if (e) e.preventDefault();
      var passInput = document.getElementById('passphrase') || $('input[type="password"]');
      var passphrase = passInput ? passInput.value : '';
      if (window.LLCrypto && passphrase) {
        try {
          toast('Deriving zero-knowledge encryption keys (600,000 iterations)...');
          var result = await window.LLCrypto.setupVault(passphrase);
          updateDB(function (db) {
            db.passphraseSet = true;
            db.vaultKeyMaterial = result.serverPayload;
            db.recoveryKey = result.recoveryKeyForDisplay;
          });

          // Sync key material envelope to backend
          var db = loadDB();
          apiCall('/vault/setup', 'POST', {
            wrappedDek: result.serverPayload.wrappedDekPassphrase,
            dekIv: result.serverPayload.wrappedDekPassphraseIv,
            passphraseSalt: result.serverPayload.kdfSalt,
            kdfIterations: result.serverPayload.kdfIterations,
            recoveryWrappedDek: result.serverPayload.wrappedDekRecovery,
            recoveryDekIv: result.serverPayload.wrappedDekRecoveryIv,
            recoverySalt: result.serverPayload.recoveryKdfSalt
          }, db ? db.authToken : undefined);

          toast('Vault encrypted! Recovery Key: ' + result.recoveryKeyForDisplay);
          setTimeout(function () { go('recovery_setup_desktop.html'); }, 800);
          return;
        } catch (err) {
          console.warn('Crypto derivation fallback:', err);
        }
      }
      updateDB(function (db) { db.passphraseSet = true; });
      toast('Vault passphrase set');
      setTimeout(function () { go('recovery_setup_desktop.html'); }, 400);
    }
    if (form) form.addEventListener('submit', submit);
    if (cta) bindOnce(cta, 'click', submit);
  }

  function initLegacyLockCheckIn() {
    var btns = $all('main button, main a');
    var yes = btns.find(function (b) { return /yes,?\s*i.?m active/i.test(b.textContent.trim()); });
    var more = btns.find(function (b) { return /need more time/i.test(b.textContent.trim()); });
    var pause = btns.find(function (b) { return /pause reminders/i.test(b.textContent.trim()); });
    function logAndGo(status, dest) {
      updateDB(function (db) {
        db.checkInHistory.unshift({ date: new Date().toISOString(), status: status });
        db.checkInHistory = db.checkInHistory.slice(0, 50);
      });
      // Sync check-in to backend
      var db = loadDB();
      apiCall('/checkin/confirm', 'POST', {
        channel: 'web',
        deviceMetadata: { userAgent: navigator.userAgent, status: status }
      }, db ? db.authToken : undefined);
      go(dest);
    }
    if (yes) bindOnce(yes, 'click', function (e) { e.preventDefault(); logAndGo('confirmed', 'check_in_confirmed_desktop.html'); });
    if (more) bindOnce(more, 'click', function (e) { e.preventDefault(); logAndGo('extension_requested', 'check_in_confirmed_desktop.html'); });
    if (pause) bindOnce(pause, 'click', function (e) {
      e.preventDefault();
      updateDB(function (db) { db.remindersPaused = true; });
      var db = loadDB();
      apiCall('/checkin/pause', 'POST', {}, db ? db.authToken : undefined);
      logAndGo('reminders_paused', 'check_in_confirmed_desktop.html');
    });
  }

  function initPauseRelease() {
    var form = document.getElementById('pauseForm');
    var cta = findPrimaryCTA();
    function submit(e) {
      if (e) e.preventDefault();
      updateDB(function (db) {
        db.remindersPaused = true;
        db.checkInHistory.unshift({ date: new Date().toISOString(), status: 'release_paused' });
      });
      toast('Release process paused');
      setTimeout(function () { go('escalation_center_desktop.html'); }, 400);
    }
    if (form) form.addEventListener('submit', submit);
    if (cta) bindOnce(cta, 'click', submit);
  }

  function initInviteTrustedPerson() {
    var main = document.querySelector('main') || document.body;
    var cta = findPrimaryCTA();
    if (!cta) return;
    bindOnce(cta, 'click', function (e) {
      e.preventDefault();
      var data = collectContainerData(main);
      var vals = Object.keys(data).map(function (k) { return data[k]; }).filter(function (v) { return typeof v === 'string' && v; });
      var nominee = {
        id: genId('nom'), name: vals[0] || 'New nominee',
        email: vals.find(function (v) { return /@/.test(v); }) || '',
        relationship: vals[2] || '', status: 'pending', invitedAt: new Date().toISOString()
      };
      updateDB(function (db) { db.nominees.push(nominee); });

      // Sync nominee to backend
      var db = loadDB();
      apiCall('/nominees', 'POST', {
        name: nominee.name,
        email: nominee.email || 'nominee@example.com',
        relationship: nominee.relationship || 'Trusted Contact',
        role: 'NOMINEE'
      }, db ? db.authToken : undefined);

      toast('Invitation sent to ' + nominee.name);
      setTimeout(function () { go('trustees_nominees_desktop.html'); }, 400);
    });
  }

  function initTrusteesNominees() {
    var addBtn = $all('button, a').find(function (b) { return /add trusted person/i.test(b.textContent.trim()); });
    if (addBtn) bindOnce(addBtn, 'click', function (e) { e.preventDefault(); go('invite_trusted_person_desktop.html'); });
    $all('button, a').forEach(function (b) {
      if (b.dataset.llBound === '1') return;
      var t = b.textContent.trim();
      if (/^manage(\s+access)?$/i.test(t)) bindOnce(b, 'click', function (e) { e.preventDefault(); go('contact_detail_status_desktop.html'); });
      else if (/resend invite/i.test(t)) bindOnce(b, 'click', function (e) { e.preventDefault(); toast('Invite re-sent'); });
      else if (/view policy/i.test(t)) bindOnce(b, 'click', function (e) { e.preventDefault(); go('check_in_configuration_desktop.html'); });
    });
  }

  function initLegacyLockDashboard() {
    var checkIn = $all('button, a').find(function (b) { return /check in now/i.test(b.textContent.trim()); });
    if (checkIn) bindOnce(checkIn, 'click', function (e) { e.preventDefault(); go('legacylock_check_in_desktop.html'); });
  }

  // Persistent left sidebar (Vault / Beneficiaries / Recovery / Security /
  // Settings / Lock Vault) appears on several authenticated screens, not
  // just the dashboard. Its links wrap an icon span + a label with no
  // separator, so `textContent.trim()` never equals the label exactly
  // (e.g. it reads like "vape_free\nVault", not "Vault") — matching must
  // be a "contains" check, not an exact match, or every one of these
  // links silently does nothing. Scoped to the actual sidebar <nav> so it
  // can't misfire on unrelated text elsewhere (e.g. a footer "Security
  // Whitepaper" link, which also contains the word "Security").
  function wireSidebarShell() {
    var sidebar = $all('nav').find(function (n) { return /w-64/.test(n.className) && /fixed/.test(n.className); });
    if (sidebar) {
      var map = [
        ['Beneficiaries', 'trustees_nominees_desktop.html'],
        ['Recovery', 'recovery_setup_desktop.html'],
        ['Security', 'security_center_desktop.html'],
        ['Settings', 'settings_data_controls_desktop.html'],
        ['Vault', 'encrypted_vault_desktop.html']
      ];
      $all('a, button', sidebar).forEach(function (el) {
        if (el.dataset.llBound === '1') return;
        var t = el.textContent.trim();
        if (/lock vault/i.test(t)) return; // handled globally below
        for (var i = 0; i < map.length; i++) {
          if (t.indexOf(map[i][0]) > -1) {
            bindOnce(el, 'click', (function (dest) { return function (e) { e.preventDefault(); go(dest); }; })(map[i][1]));
            return;
          }
        }
      });
    }
    var lock = $all('a, button').find(function (b) { return /lock vault/i.test(b.textContent.trim()); });
    if (lock) bindOnce(lock, 'click', function (e) { e.preventDefault(); go('secure_sign_in_desktop.html'); });
  }

  function initNotificationCenter() {
    var tabNames = ['All', 'Security', 'Check-in', 'People', 'Documents'];
    var tabs = $all('main button, main a').filter(function (b) { return tabNames.indexOf(b.textContent.trim()) > -1; });
    tabs.forEach(function (tab) {
      bindOnce(tab, 'click', function (e) {
        e.preventDefault();
        tabs.forEach(function (t) {
          t.classList.remove('text-primary', 'border-secondary');
          t.classList.add('text-on-surface-variant', 'border-transparent');
        });
        tab.classList.remove('text-on-surface-variant', 'border-transparent');
        tab.classList.add('text-primary', 'border-secondary');
      });
    });
    var markAll = $all('button, a').find(function (b) { return /mark all as read/i.test(b.textContent.trim()); });
    if (markAll) bindOnce(markAll, 'click', function (e) { e.preventDefault(); toast('All notifications marked as read'); });
    var actionLinks = {
      'check-in now': 'legacylock_check_in_desktop.html', 'review device': 'security_center_desktop.html',
      'manage access': 'trustees_nominees_desktop.html', 'review document': 'secure_document_vault_desktop.html'
    };
    $all('main button, main a').forEach(function (el) {
      if (el.dataset.llBound === '1') return;
      var t = el.textContent.trim().toLowerCase();
      Object.keys(actionLinks).forEach(function (k) {
        if (t.indexOf(k) > -1) bindOnce(el, 'click', function (e) { e.preventDefault(); go(actionLinks[k]); });
      });
    });
  }

  function initSettingsDataControls() {
    var delBtn = $all('button, a').find(function (b) { return /delete account/i.test(b.textContent.trim()); });
    if (delBtn) bindOnce(delBtn, 'click', function (e) { e.preventDefault(); go('account_deletion_warning_desktop.html'); });
  }

  function initAccountDeletionWarning() {
    var confirmBtn = $all('button').find(function (b) {
      var t = b.textContent.trim();
      return /delete|confirm/i.test(t) && !/cancel/i.test(t);
    });
    if (confirmBtn) bindOnce(confirmBtn, 'click', function (e) {
      e.preventDefault();
      var input = $('input[placeholder="DELETE"]') || $('input[type="text"]');
      if (!input || input.value.trim() !== 'DELETE') {
        toast('Please type DELETE to confirm account deletion.', 'error');
        return;
      }
      try { localStorage.removeItem(DB_KEY); } catch (err) { /* ignore */ }
      toast('Account and vault data deleted permanently.');
      setTimeout(function () { go('legacylock_landing_page.html'); }, 400);
    });
  }

  function initRecoveryKitConfirmation() {
    var cta = findPrimaryCTA();
    if (cta) {
      bindOnce(cta, 'click', function (e) {
        e.preventDefault();
        var checkboxes = $all('input[type="checkbox"]');
        var allChecked = checkboxes.length > 0 && checkboxes.every(function (cb) { return cb.checked; });
        if (!allChecked) {
          toast('Please confirm all safeguards by checking all boxes before proceeding.', 'error');
          return;
        }
        toast('Recovery kit confirmed safely stored!');
        setTimeout(function () { go('what_would_you_like_to_secure_desktop.html'); }, 300);
      });
    }
  }

  var PAGES = {
    'check_in_configuration_desktop.html': initCheckInConfiguration,
    'add_bank_record_desktop.html': initAddBankRecord,
    'review_bank_record_desktop.html': initReviewBankRecord,
    'claim_dossier_preview_desktop.html': initClaimDossierPreview,
    'what_would_you_like_to_secure_desktop.html': initCategoryPicker,
    'encrypted_vault_desktop.html': initEncryptedVault,
    'asset_record_details_desktop.html': initAssetRecordDetails,
    'edit_asset_record_desktop.html': initEditAssetRecord,
    'create_secure_account_desktop.html': initSignUp,
    'secure_sign_in_desktop.html': initSignIn,
    'create_vault_passphrase_desktop.html': initCreateVaultPassphrase,
    'recovery_kit_confirmation_desktop.html': initRecoveryKitConfirmation,
    'legacylock_check_in_desktop.html': initLegacyLockCheckIn,
    'pause_release_process_desktop.html': initPauseRelease,
    'invite_trusted_person_desktop.html': initInviteTrustedPerson,
    'trustees_nominees_desktop.html': initTrusteesNominees,
    'legacylock_dashboard_desktop.html': initLegacyLockDashboard,
    'notification_center_desktop.html': initNotificationCenter,
    'settings_data_controls_desktop.html': initSettingsDataControls,
    'account_deletion_warning_desktop.html': initAccountDeletionWarning,
    'add_crypto_record_desktop.html': genericAddRecordHandler('crypto'),
    'add_insurance_record_desktop.html': genericAddRecordHandler('insurance'),
    'add_investment_record_desktop.html': genericAddRecordHandler('investment'),
    'add_digital_legacy_record_desktop.html': genericAddRecordHandler('digital_legacy')
  };

  /* ============================== 7. BOOTSTRAP ============================== */
  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page') || currentPage();
    try { wireHeaderIcons(); } catch (e) { console.warn('LegacyLock: header wiring', e); }
    try { wireSidebarShell(); } catch (e) { console.warn('LegacyLock: sidebar wiring', e); }
    try { if (PAGES[page]) PAGES[page](); } catch (e) { console.warn('LegacyLock: page module (' + page + ')', e); }
    try { wireToggleValuePersistence(page); } catch (e) { /* non-fatal */ }
    try { bindGenericNav(page); } catch (e) { console.warn('LegacyLock: generic nav', e); }
  });

  // Exposed for debugging from devtools: LL.dump() to inspect the mock vault.
  window.LL = { loadDB: loadDB, saveDB: saveDB, updateDB: updateDB, ROUTES: ROUTES, dump: function () { console.log(loadDB()); return loadDB(); } };
})();
