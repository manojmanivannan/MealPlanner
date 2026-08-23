/*
 * MealPlanner — Shared Layout & Navigation Header
 * ------------------------------------------------------------------
 * Material Flat Minimalist Top App Bar + Theme Toggle + Auth Bootstrap
 */

const NAV = [
  {
    key: 'planner',
    label: 'Weekly Planner',
    href: 'index.html',
    icon: `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M14 2v4M6 2v4M3 8h14"/></svg>`,
  },
  {
    key: 'recipes',
    label: 'Recipe Hub',
    href: 'recipe-hub.html',
    icon: `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H16"/><path d="M6.5 2H16v18H6.5A2.5 2.5 0 0 1 4 17.5V4.5A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 6h5M8 10h5"/></svg>`,
  },
  {
    key: 'ingredients',
    label: 'Ingredients',
    href: 'ingredients.html',
    icon: `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2a6 6 0 0 0-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 0 0-6-6z"/><circle cx="10" cy="8" r="2.5"/></svg>`,
  },
  {
    key: 'shopping',
    label: 'Shopping List',
    href: 'shopping-list.html',
    icon: `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/><path d="M2 3h2.5l2 10h10l2-7H5.5"/></svg>`,
  },
]

function headerHTML(activeNav) {
  const desktopLinks = NAV.map((n) => {
    const active = n.key === activeNav
    const activeClass = active
      ? 'bg-accent/10 text-accent font-semibold shadow-xs'
      : 'text-secondary hover:text-primary hover:bg-subtle font-medium'
    return `<a href="${n.href}" class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${activeClass}"${active ? ' aria-current="page"' : ''}>${n.icon}<span>${n.label}</span></a>`
  }).join('')

  const mobileLinks = NAV.map((n) => {
    const active = n.key === activeNav
    const activeClass = active
      ? 'bg-accent text-accent-fg font-semibold'
      : 'text-primary hover:bg-subtle font-medium'
    return `<a href="${n.href}" class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${activeClass}"${active ? ' aria-current="page"' : ''}>${n.icon}<span>${n.label}</span></a>`
  }).join('')

  return `
  <header class="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-line transition-colors">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      <!-- Brand Logo -->
      <a href="index.html" class="flex items-center gap-2.5 flex-none focus-ring rounded-lg p-1 group">
        <div class="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-accent-fg shadow-xs group-hover:scale-105 transition-transform">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="font-bold text-base tracking-tight text-primary leading-tight">MealPlanner</span>
          <span class="text-[10px] uppercase font-semibold tracking-wider text-muted">NutriTrack</span>
        </div>
      </a>

      <!-- Desktop Nav Links -->
      <div class="hidden md:flex items-center gap-1 bg-subtle/60 p-1 rounded-xl border border-line-subtle">
        ${desktopLinks}
      </div>

      <!-- Right Utility Bar: Theme Toggle + User Menu -->
      <div class="flex items-center gap-2">
        <!-- Theme Toggle Button -->
        <div class="relative">
          <button id="theme-toggle-btn" type="button" class="mp-btn mp-btn-ghost mp-btn-icon focus-ring" title="Toggle color theme" aria-label="Toggle theme">
            <svg id="theme-icon-light" class="hidden w-4 h-4 text-secondary" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41"/></svg>
            <svg id="theme-icon-dark" class="hidden w-4 h-4 text-secondary" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
          </button>
        </div>

        <!-- User Dropdown Menu -->
        <div id="user-menu" class="relative">
          <button id="user-menu-button" type="button" class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-subtle border border-transparent hover:border-line transition-all focus-ring" aria-haspopup="true" aria-expanded="false">
            <div id="user-avatar" class="w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-xs flex items-center justify-center">U</div>
            <span id="user-email" class="hidden sm:inline text-xs font-medium text-secondary max-w-[120px] truncate">...</span>
            <svg class="h-3.5 w-3.5 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/></svg>
          </button>
          <div id="user-dropdown" class="absolute right-0 mt-2 w-48 bg-surface-raised border border-line rounded-xl shadow-lg py-1.5 hidden animate-in fade-in zoom-in-95 duration-100" role="menu">
            <div class="px-3 py-2 border-b border-line-subtle mb-1">
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">Signed in as</p>
              <p id="dropdown-user-email" class="text-xs font-semibold text-primary truncate">...</p>
            </div>
            <a href="catalog.html" class="flex items-center gap-2 px-3 py-2 text-xs text-secondary hover:text-primary hover:bg-subtle" role="menuitem">
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></svg>
              Component Catalog
            </a>
            <button id="logout-btn" type="button" class="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-danger)] hover:bg-red-500/10 transition-colors" role="menuitem">
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M8 14l5-4-5-4M13 10H3"/></svg>
              Logout
            </button>
          </div>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button id="mobile-menu-btn" type="button" class="md:hidden mp-btn mp-btn-ghost mp-btn-icon focus-ring" aria-label="Open navigation menu" aria-expanded="false">
          <svg id="hamburger-icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/></svg>
          <svg id="close-icon" class="hidden" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>
        </button>
      </div>
    </nav>

    <!-- Mobile Drawer -->
    <div id="mobile-nav-drawer" class="hidden md:hidden border-t border-line bg-surface px-4 py-3 space-y-1">
      ${mobileLinks}
    </div>
  </header>`
}

/* ----------------- Theme Switcher Management ----------------- */

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn')
  const iconLight = document.getElementById('theme-icon-light')
  const iconDark = document.getElementById('theme-icon-dark')
  if (!btn || !iconLight || !iconDark) return

  function getEffectiveTheme() {
    const saved = localStorage.getItem('mp-theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
      iconLight.classList.remove('hidden')
      iconDark.classList.add('hidden')
      btn.title = 'Switch to Light Theme'
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
      iconDark.classList.remove('hidden')
      iconLight.classList.add('hidden')
      btn.title = 'Switch to Dark Theme'
    }
  }

  // Initial apply
  applyTheme(getEffectiveTheme())

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || getEffectiveTheme()
    const next = current === 'dark' ? 'light' : 'dark'
    localStorage.setItem('mp-theme', next)
    applyTheme(next)
  })
}

/* ----------------- Auth & User Menu Bootstrap ---------------- */

function bootstrapAuth() {
  try {
    const token = localStorage.getItem('token')
    if (!token || token.length < 10) {
      window.location.replace('welcome.html')
      return
    }

    fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem('token')
          window.location.replace('welcome.html')
          return
        }
        return r.json()
      })
      .then((u) => {
        if (u && u.email) {
          const emailEl = document.getElementById('user-email')
          const ddEmailEl = document.getElementById('dropdown-user-email')
          const avatarEl = document.getElementById('user-avatar')
          if (emailEl) emailEl.textContent = u.email
          if (ddEmailEl) ddEmailEl.textContent = u.email
          if (avatarEl && u.email) {
            avatarEl.textContent = u.email.charAt(0).toUpperCase()
          }
        }
      })

    // User dropdown handlers
    const btn = document.getElementById('user-menu-button')
    const dd = document.getElementById('user-dropdown')
    if (btn && dd) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const open = dd.classList.toggle('hidden')
        btn.setAttribute('aria-expanded', String(!open))
      })
      document.addEventListener('click', () => {
        dd.classList.add('hidden')
        btn.setAttribute('aria-expanded', 'false')
      })
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token')
        window.location.replace('welcome.html')
      })
    }

    // Mobile nav drawer
    const mobileBtn = document.getElementById('mobile-menu-btn')
    const mobileDrawer = document.getElementById('mobile-nav-drawer')
    const hamburgerIcon = document.getElementById('hamburger-icon')
    const closeIcon = document.getElementById('close-icon')
    if (mobileBtn && mobileDrawer) {
      mobileBtn.addEventListener('click', () => {
        const isHidden = mobileDrawer.classList.toggle('hidden')
        mobileBtn.setAttribute('aria-expanded', String(!isHidden))
        if (hamburgerIcon && closeIcon) {
          hamburgerIcon.classList.toggle('hidden', !isHidden)
          closeIcon.classList.toggle('hidden', isHidden)
        }
      })
    }
  } catch (_) {
    window.location.replace('welcome.html')
  }
}

/**
 * Mount the shared nav header + auth bootstrap into #app-header.
 * @param {{ activeNav?: string }} [opts] - which nav link is current
 */
export function mountLayout({ activeNav } = {}) {
  const mount = document.getElementById('app-header')
  if (!mount) return
  mount.innerHTML = headerHTML(activeNav)
  initThemeToggle()
  bootstrapAuth()
}