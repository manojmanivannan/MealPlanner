/*
 * MealPlanner — component catalog page logic (T3)
 * ------------------------------------------------------------------
 * Drives the catalog react-to surface: theme toggle, the accessible tabs
 * demo (arrow-key + Home/End roving), toast triggers, modal triggers
 * (focus trap / ESC / click-outside via components/modal.js), and the
 * restyled auth form showcase (tabbed login/signup + simulated submit).
 *
 * This is a reference page: the patterns here (and in components.css +
 * modal.js / toast.js) are what the page-redesign tickets T4–T7 adopt.
 */
import '../bootstrap.js'
import { openModal } from '../components/modal.js'
import { toast } from '../components/toast.js'

/* ----------------------------- Theme toggle ----------------------------- */
(function initTheme() {
  const root = document.documentElement
  const buttons = document.querySelectorAll('#theme-toggle button')
  function apply(choice) {
    if (choice === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', choice)
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.set === choice)))
    try { localStorage.setItem('mp-theme', choice) } catch (_) {}
  }
  let saved = 'light'
  try { saved = localStorage.getItem('mp-theme') || 'light' } catch (_) {}
  apply(saved)
  buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.set)))
})()

/* ----------------------------- Tabs ----------------------------- */
// Shared roving-tabindex tablist wiring: owns aria-selected + tabindex roving
// + Arrow/Home/End keyboard moves + click selection, then hands the content
// switch to onSelect. Both the demo tabs (panels) and the auth tabs (forms)
// use this, so there is one tab pattern for T4–T7 to copy.
function wireTablist(tablist, onSelect) {
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'))
  function select(tab) {
    tabs.forEach((t) => {
      const active = t === tab
      t.setAttribute('aria-selected', String(active))
      t.tabIndex = active ? 0 : -1
    })
    onSelect(tab, tabs)
    tab.focus()
  }
  const index = () => tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')
  // Initialize roving tabindex from the markup's aria-selected so only the
  // active tab is Tab-reachable before the first interaction.
  tabs.forEach((t) => { t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1 })
  tablist.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) select(t) })
  tablist.addEventListener('keydown', (e) => {
    const i = index()
    if (e.key === 'ArrowRight') { e.preventDefault(); select(tabs[(i + 1) % tabs.length]) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length]) }
    else if (e.key === 'Home') { e.preventDefault(); select(tabs[0]) }
    else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1]) }
  })
}

// Demo tabs: toggle the matching panel visibility.
wireTablist(document.getElementById('demo-tabs'), (_tab, tabs) => {
  tabs.forEach((t) => {
    const panel = document.getElementById(t.getAttribute('aria-controls'))
    if (panel) panel.classList.toggle('hidden', t.getAttribute('aria-selected') !== 'true')
  })
})

/* ----------------------------- Toast triggers ----------------------------- */
document.getElementById('toast-triggers').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-toast]')
  if (!btn) return
  const k = btn.dataset.toast
  if (k === 'success') toast.success('Recipe assigned to Monday dinner.')
  else if (k === 'error') toast.error('Could not save the weekly plan. Try again.', { title: 'Save failed' })
  else if (k === 'warning') toast.warning('Macro target not set for this day.')
  else if (k === 'info') toast.info('Shopping list generated for this week.')
  else if (k === 'titled') toast.show('Synced 12 ingredients from your pantry.', { variant: 'info', title: 'Sync complete' })
})

/* ----------------------------- Modal triggers ----------------------------- */
// openModal() returns a sync controller {close, panel, overlay}. In-modal
// action buttons are wired through ctrl.close() so focus is restored and body
// scroll is unlocked — never remove the overlay by hand. wireClose binds every
// [data-close] in the panel (the dismiss X already closes via modal.js).
function wireClose(ctrl) {
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

document.getElementById('modal-triggers').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-modal]')
  if (!btn) return
  const k = btn.dataset.modal

  if (k === 'confirm') {
    const ctrl = openModal({
      title: 'Delete recipe?',
      body: '<p>This removes “Oats with berries” from your library. Meals that reference it will be emptied. This cannot be undone.</p>',
      footer: '<button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button><button type="button" class="mp-btn mp-btn-danger focus-ring" data-confirm>Delete</button>',
      size: 'sm',
    })
    ctrl.panel.querySelector('[data-confirm]').addEventListener('click', () => {
      ctrl.close()
      toast.success('Recipe deleted.')
    })
    wireClose(ctrl)
  }

  if (k === 'form') {
    const ctrl = openModal({
      title: 'Assign recipe to slot',
      body: `
        <div class="flex flex-col gap-4">
          <div class="mp-field"><label class="mp-label" for="m-day">Day</label>
            <select id="m-day" class="mp-select focus-ring"><option>Monday</option><option>Tuesday</option><option>Wednesday</option></select></div>
          <div class="mp-field"><label class="mp-label" for="m-meal">Meal</label>
            <select id="m-meal" class="mp-select focus-ring"><option>Breakfast</option><option>Lunch</option><option>Dinner</option></select></div>
        </div>`,
      footer: '<button type="button" class="mp-btn mp-btn-secondary focus-ring" data-close>Cancel</button><button type="button" class="mp-btn mp-btn-primary focus-ring" data-assign>Assign</button>',
    })
    ctrl.panel.querySelector('[data-assign]').addEventListener('click', () => {
      const day = ctrl.panel.querySelector('#m-day').value
      const meal = ctrl.panel.querySelector('#m-meal').value
      ctrl.close()
      toast.success(`Assigned to ${day} ${meal}.`)
    })
    wireClose(ctrl)
  }

  if (k === 'long') {
    let para = ''
    for (let i = 1; i <= 12; i++) para += `<p class="mb-3">Paragraph ${i}. The modal body scrolls independently of the page; the header and footer stay fixed. Focus is trapped inside while open, and Escape or a backdrop click closes it.</p>`
    const ctrl = openModal({
      title: 'Recipe method',
      body: para,
      footer: '<button type="button" class="mp-btn mp-btn-primary focus-ring" data-close>Got it</button>',
      size: 'lg',
    })
    wireClose(ctrl)
  }
})

/* ----------------------------- Auth showcase ----------------------------- */
const authTabs = document.getElementById('auth-tabs')
const loginTab = document.getElementById('auth-login-tab')
const signupTab = document.getElementById('auth-signup-tab')
const loginForm = document.getElementById('auth-login-form')
const signupForm = document.getElementById('auth-signup-form')

// Auth tabs: the same wireTablist roving pattern; the content switch toggles
// the form + the selected button variant (aria-selected/tabindex are owned by
// wireTablist, so showAuth only does the visual + form swap).
function showAuth(which) {
  const login = which === 'login'
  loginTab.classList.toggle('mp-btn-secondary', login)
  loginTab.classList.toggle('mp-btn-ghost', !login)
  signupTab.classList.toggle('mp-btn-secondary', !login)
  signupTab.classList.toggle('mp-btn-ghost', login)
  loginForm.classList.toggle('hidden', !login)
  signupForm.classList.toggle('hidden', login)
}
wireTablist(authTabs, (tab) => showAuth(tab === loginTab ? 'login' : 'signup'))

function setError(id, msg) {
  const el = document.getElementById(id)
  if (el) el.textContent = msg || ''
}

// Simulated submit: validate → loading → success/error.
function handleSubmit(form, { emailId, passId, emailErr, passErr, successMsg }) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById(emailId).value.trim()
    const password = document.getElementById(passId).value
    setError(emailErr, '')
    setError(passErr, '')
    let bad = false
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError(emailErr, 'Enter a valid email address.'); bad = true }
    if (password.length < 8) { setError(passErr, 'Password must be at least 8 characters.'); bad = true }
    if (bad) return

    const btn = form.querySelector('button[type="submit"]')
    btn.dataset.loading = 'true'
    btn.setAttribute('aria-busy', 'true')
    btn.disabled = true
    try {
      await new Promise((r) => setTimeout(r, 900)) // simulate network
      toast.success(successMsg)
      form.reset()
    } catch (_) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      btn.dataset.loading = 'false'
      btn.removeAttribute('aria-busy')
      btn.disabled = false
    }
  })
}

handleSubmit(loginForm, {
  emailId: 'login-email', passId: 'login-password',
  emailErr: 'login-email-err', passErr: 'login-password-err',
  successMsg: 'Signed in. (Demo — no redirect.)',
})
handleSubmit(signupForm, {
  emailId: 'signup-email', passId: 'signup-password',
  emailErr: 'signup-email-err', passErr: 'signup-password-err',
  successMsg: 'Account created. (Demo — no redirect.)',
})