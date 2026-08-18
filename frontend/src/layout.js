/*
 * MealPlanner — shared layout (T2)
 * ------------------------------------------------------------------
 * The single source of the app nav header + auth bootstrap. Each page
 * provides a <div id="app-header"></div> placeholder and calls
 * mountLayout({ activeNav }); this injects the header and runs the auth
 * bootstrap. Replaces the copy-pasted <header> + auth IIFE <script>
 * block that was duplicated across index.html / recipe-hub.html /
 * ingredients.html.
 *
 * Token-driven: the classes below are Tailwind utilities generated from
 * the T1 tokens (see styles.css @theme inline), so the header follows the
 * light/dark theme defined in design/tokens.css.
 */

const NAV = [
  { key: 'planner',     label: 'Weekly Planner', href: 'index.html' },
  { key: 'recipes',     label: 'Recipe Hub',      href: 'recipe-hub.html' },
  { key: 'ingredients', label: 'Ingredients',     href: 'ingredients.html' },
]

function headerHTML(activeNav) {
  const links = NAV.map((n) => {
    const active = n.key === activeNav
    const color = active
      ? 'text-accent'
      : 'text-primary hover:text-accent-hover'
    return ` <a href="${n.href}" class="font-semibold ${color}"${active ? ' aria-current="page"' : ''}>${n.label}</a>`
  }).join('')

  return `
  <header class="bg-surface/80 backdrop-blur-lg sticky top-0 z-50 border-b border-line">
    <nav class="flex items-center justify-between max-w-5xl mx-auto px-4 py-4">
      <div class="flex justify-center space-x-6">${links}</div>
      <div id="user-menu" class="relative">
        <button id="user-menu-button" class="flex items-center space-x-2 px-3 py-1 rounded-lg hover:bg-subtle focus-ring" aria-haspopup="true" aria-expanded="false">
          <span id="user-email" class="text-sm font-medium text-secondary">…</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/></svg>
        </button>
        <div id="user-dropdown" class="absolute right-0 mt-2 w-40 bg-surface border border-line rounded-lg shadow-md py-1 hidden" role="menu">
          <button id="logout-btn" class="block w-full text-left px-4 py-2 text-sm text-[var(--color-danger)] hover:bg-subtle" role="menuitem">Logout</button>
        </div>
      </div>
    </nav>
  </header>`
}

function bootstrapAuth() {
  try {
    const token = localStorage.getItem('token')
    if (!token || token.length < 10) { window.location.replace('welcome.html'); return }

    fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } }).then((r) => {
      if (r.status === 401) { localStorage.removeItem('token'); window.location.replace('welcome.html'); return }
      return r.json()
    }).then((u) => { if (u && u.email) document.getElementById('user-email').textContent = u.email })

    const btn = document.getElementById('user-menu-button')
    const dd = document.getElementById('user-dropdown')
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const open = dd.classList.toggle('hidden')
      btn.setAttribute('aria-expanded', String(!open))
    })
    document.addEventListener('click', () => {
      dd.classList.add('hidden')
      btn.setAttribute('aria-expanded', 'false')
    })
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.removeItem('token')
      window.location.replace('welcome.html')
    })
  } catch (_) {
    window.location.replace('welcome.html')
  }
}

/**
 * Mount the shared nav header + auth bootstrap into #app-header.
 * @param {{ activeNav?: string }} [opts] - which nav link is current
 *   ('planner' | 'recipes' | 'ingredients').
 */
export function mountLayout({ activeNav } = {}) {
  const mount = document.getElementById('app-header')
  if (!mount) return
  mount.innerHTML = headerHTML(activeNav)
  bootstrapAuth()
}