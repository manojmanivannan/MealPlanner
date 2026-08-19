/*
 * MealPlanner — accessible modal controller (T3)
 * ------------------------------------------------------------------
 * The reusable replacement for the legacy `insertAdjacentHTML` modals in
 * frontend/html/{weekly-plan,recipe-hub,ingredients}.js, which had no
 * focus trap, no ESC, no aria, and leaked body scroll. This module owns
 * the dialog lifecycle and a11y behavior; the visual shell is .mp-modal-*
 * in design/components.css.
 *
 * Contract — every open modal:
 *   • has role="dialog" aria-modal="true" aria-labelledby (and aria-describedby
 *     when a body id is supplied);
 *   • moves focus into the panel (first focusable, else the panel itself);
 *   • traps Tab / Shift+Tab within the panel (explicit handling, so the cycle
 *     is deterministic rather than relying on browser default tab order);
 *   • closes on Escape, on backdrop click (not on panel click), and via the
 *     returned close() handle;
 *   • restores focus to the element that was focused before opening;
 *   • locks body scroll while open and releases it on close.
 *
 * API:
 *   const ctrl = openModal({
 *     title,                 // string — becomes the <h2> heading (labelledby)
 *     body,                  // string (innerHTML) | Node (appended)
 *     footer,                // string | Node | Node[] — action buttons
 *     size,                  // 'sm' | 'md' | 'lg'  (default md)
 *     returnFocus,           // optional element; defaults to current activeElement
 *     onClose,               // optional () => void, called after close
 *   })
 *   ctrl.close()             // programmatic close
 *
 * The modal content is trusted, app-authored markup (never reflected user
 * input), so body/footer may be set via innerHTML — the security boundary is
 * the same as the rest of this vanilla app. The a11y win is the point.
 */

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
]

let openCount = 0
let savedOverflow = ''
let savedPaddingRight = ''

function focusableWithin(root) {
  return Array.prototype.filter.call(
    root.querySelectorAll(FOCUSABLE.join(',')),
    (el) => {
      if (el.getAttribute('aria-disabled') === 'true') return false
      const rect = el.getBoundingClientRect()
      return rect.width > 0 || rect.height > 0 || el === document.activeElement
    }
  )
}

function lockScroll() {
  if (openCount === 0) {
    savedOverflow = document.body.style.overflow
    savedPaddingRight = document.body.style.paddingRight
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarGap > 0) document.body.style.paddingRight = scrollbarGap + 'px'
  }
  openCount++
}

function unlockScroll() {
  openCount = Math.max(0, openCount - 1)
  if (openCount === 0) {
    document.body.style.overflow = savedOverflow
    document.body.style.paddingRight = savedPaddingRight
  }
}

let idSeq = 0
function nextId(prefix) { return `mp-modal-${prefix}-${++idSeq}` }

function appendContent(host, content) {
  if (content == null) return
  if (typeof content === 'string') host.innerHTML = content
  else if (Array.isArray(content)) content.forEach((n) => host.appendChild(n))
  else host.appendChild(content)
}

/**
 * Open an accessible modal. Returns a controller with a `close()` method.
 * @param {{title?:string, body?:string|Node|Node[], footer?:string|Node|Node[], size?:'sm'|'md'|'lg', returnFocus?:Element, onClose?:()=>void}} opts
 */
export function openModal(opts = {}) {
  const { title, body, footer, size = 'md', onClose } = opts
  const returnFocus = opts.returnFocus || document.activeElement

  const titleId = nextId('title')
  const bodyId = body != null ? nextId('body') : null

  const overlay = document.createElement('div')
  overlay.className = 'mp-modal-overlay'

  const panel = document.createElement('div')
  panel.className = `mp-modal mp-modal-${size}`
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', titleId)
  if (bodyId) panel.setAttribute('aria-describedby', bodyId)
  panel.tabIndex = -1

  const header = document.createElement('div')
  header.className = 'mp-modal-header'
  const heading = document.createElement('h2')
  heading.className = 'mp-modal-title'
  heading.id = titleId
  heading.textContent = title || ''
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'mp-btn mp-btn-ghost mp-btn-icon mp-btn-sm mp-modal-close'
  closeBtn.setAttribute('aria-label', 'Close dialog')
  closeBtn.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>'
  header.append(heading, closeBtn)

  const bodyEl = document.createElement('div')
  bodyEl.className = 'mp-modal-body'
  if (bodyId) bodyEl.id = bodyId
  appendContent(bodyEl, body)

  panel.append(header, bodyEl)
  if (footer != null) {
    const footerEl = document.createElement('div')
    footerEl.className = 'mp-modal-footer'
    appendContent(footerEl, footer)
    panel.appendChild(footerEl)
  }

  overlay.appendChild(panel)
  document.body.appendChild(overlay)
  lockScroll()

  let closed = false

  function close() {
    if (closed) return
    closed = true
    overlay.removeEventListener('keydown', onKeyDown)
    overlay.removeEventListener('click', onClick)
    closeBtn.removeEventListener('click', close)
    overlay.remove()
    unlockScroll()
    if (returnFocus && typeof returnFocus.focus === 'function') {
      // Restore focus on the next frame so the overlay is gone first.
      requestAnimationFrame(() => returnFocus.focus())
    }
    if (typeof onClose === 'function') onClose()
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key !== 'Tab') return
    const focusables = focusableWithin(panel)
    if (!focusables.length) { e.preventDefault(); panel.focus(); return }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (e.shiftKey) {
      if (active === first || !panel.contains(active)) { e.preventDefault(); last.focus() }
    } else {
      if (active === last || !panel.contains(active)) { e.preventDefault(); first.focus() }
    }
  }

  function onClick(e) {
    // Backdrop click (target is the overlay itself) closes; panel clicks don't.
    if (e.target === overlay) close()
  }

  overlay.addEventListener('keydown', onKeyDown)
  overlay.addEventListener('click', onClick)
  closeBtn.addEventListener('click', close)

  // Move focus in — the first focusable that isn't the dismiss X, so focus
  // lands on a real control (or the title's close button if that's all there
  // is), else the panel itself (announces the labelledby title).
  requestAnimationFrame(() => {
    const f = focusableWithin(panel).filter((el) => el !== closeBtn)
    if (f.length) f[0].focus()
    else if (closeBtn) closeBtn.focus()
    else panel.focus()
  })

  return { close, panel, overlay }
}