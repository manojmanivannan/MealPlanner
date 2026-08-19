/*
 * MealPlanner — toast controller (T3)
 * ------------------------------------------------------------------
 * The reusable replacement for the silent `console.error` / blocking
 * `alert()` feedback scattered through the app (e.g. the PDF-export error
 * path in index.html, the recipe-hub / ingredients success+error alerts).
 * Renders into a single aria-live region with role tuned per variant:
 * success/info → role="status", error/warning → role="alert".
 *
 * Visuals: .mp-toast-* in design/components.css. Enter/exit animations
 * honor prefers-reduced-motion automatically (the tokens.css global rule
 * collapses transition/animation durations for reduced-motion users).
 *
 * API:
 *   import { toast } from '../components/toast.js'
 *   toast.show('Recipe assigned.', { variant: 'success' })
 *   toast.show('Could not save.', { variant: 'error', title: 'Save failed' })
 *   toast.show('Copied to clipboard', { variant: 'info', duration: 6000 })
 *   toast.error('Network error')           // variant: 'error' shortcut
 *   toast.success('Saved')                 // variant: 'success' shortcut
 */

const ICONS = {
  success: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10l4 4 8-8"/></svg>',
  error: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14v.01"/></svg>',
  warning: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2L2 17h16L10 2z"/><path d="M10 8v4M10 15v.01"/></svg>',
  info: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 9v5M10 6v.01"/></svg>',
}

const DEFAULT_DURATION = 5000

function region() {
  let el = document.querySelector('.mp-toast-region')
  if (!el) {
    el = document.createElement('div')
    el.className = 'mp-toast-region'
    // No region-level aria-live: each toast carries its own role (alert for
    // error/warning, status for success/info), which is self-announcing. A
    // region-level aria-live="polite" would contradict the assertive alerts.
    document.body.appendChild(el)
  }
  return el
}

function reducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function dismiss(toastEl, timer) {
  if (toastEl.classList.contains('is-leaving')) return
  if (timer) clearTimeout(timer)
  if (reducedMotion()) { toastEl.remove(); return }
  toastEl.classList.add('is-leaving')
  toastEl.addEventListener('animationend', () => toastEl.remove(), { once: true })
}

/**
 * Show a toast.
 * @param {string} message
 * @param {{variant?:'success'|'error'|'warning'|'info', title?:string, duration?:number}} [opts]
 */
function show(message, opts = {}) {
  const variant = opts.variant || 'info'
  const duration = opts.duration != null ? opts.duration : DEFAULT_DURATION
  const role = (variant === 'error' || variant === 'warning') ? 'alert' : 'status'

  const el = document.createElement('div')
  el.className = `mp-toast mp-toast-${variant}`
  el.setAttribute('role', role)

  const icon = document.createElement('span')
  icon.className = 'mp-toast-icon'
  icon.innerHTML = ICONS[variant] || ICONS.info

  const body = document.createElement('div')
  body.className = 'mp-toast-body'
  if (opts.title) {
    const t = document.createElement('div')
    t.className = 'mp-toast-title'
    t.textContent = opts.title
    body.appendChild(t)
  }
  const msg = document.createElement('div')
  msg.className = 'mp-toast-msg'
  msg.textContent = message
  body.appendChild(msg)

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'mp-toast-close'
  close.setAttribute('aria-label', 'Dismiss notification')
  close.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>'

  el.append(icon, body, close)
  region().appendChild(el)

  // Pause auto-dismiss while hovered; resume a short timer on leave.
  let timer = duration > 0 ? setTimeout(() => dismiss(el), duration) : null
  function arm() { timer = setTimeout(() => dismiss(el), 2000) }
  close.addEventListener('click', () => { if (timer) clearTimeout(timer); dismiss(el) })
  el.addEventListener('mouseenter', () => { if (timer) { clearTimeout(timer); timer = null } })
  el.addEventListener('mouseleave', () => { if (duration > 0 && !el.classList.contains('is-leaving') && timer == null) arm() })
  return { dismiss: () => { if (timer) clearTimeout(timer); dismiss(el) } }
}

export const toast = {
  show,
  success: (msg, opts) => show(msg, { ...opts, variant: 'success' }),
  error: (msg, opts) => show(msg, { ...opts, variant: 'error' }),
  warning: (msg, opts) => show(msg, { ...opts, variant: 'warning' }),
  info: (msg, opts) => show(msg, { ...opts, variant: 'info' }),
}