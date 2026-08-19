/*
 * Welcome / auth page entry.
 *
 * This is the auth gate (login + signup). It pulls in the shared stylesheet
 * + self-hosted fonts but does NOT mount the nav header (you're not signed
 * in yet). Logic moved here from the old inline <script> in
 * frontend/html/welcome.html; redirect targets now resolve within the build.
 */
import '../bootstrap.js'

const API_BASE = '/api'

// If already signed in, skip the gate.
try {
  const token = localStorage.getItem('token')
  if (token && token.length > 10) window.location.replace('index.html')
} catch (_) {}

const ACTIVE = ['bg-accent', 'text-accent-fg']
const INACTIVE = ['bg-subtle', 'text-primary']

const tabLogin = document.getElementById('tab-login')
const tabSignup = document.getElementById('tab-signup')
const loginForm = document.getElementById('login-form')
const signupForm = document.getElementById('signup-form')

function showLogin() {
  tabLogin.classList.add(...ACTIVE)
  tabLogin.classList.remove(...INACTIVE)
  tabSignup.classList.add(...INACTIVE)
  tabSignup.classList.remove(...ACTIVE)
  loginForm.classList.remove('hidden')
  signupForm.classList.add('hidden')
}

function showSignup() {
  tabSignup.classList.add(...ACTIVE)
  tabSignup.classList.remove(...INACTIVE)
  tabLogin.classList.add(...INACTIVE)
  tabLogin.classList.remove(...ACTIVE)
  signupForm.classList.remove('hidden')
  loginForm.classList.add('hidden')
}

tabLogin.addEventListener('click', showLogin)
tabSignup.addEventListener('click', showSignup)

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  const err = document.getElementById('login-error')
  err.textContent = ''
  try {
    const body = new URLSearchParams({ username: email, password })
    const resp = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    if (!resp.ok) throw new Error('Invalid email or password')
    const data = await resp.json()
    if (!data || !data.access_token) throw new Error('Missing token')
    localStorage.setItem('token', data.access_token)
    setTimeout(() => { window.location.replace('index.html') }, 100)
  } catch (e) {
    err.textContent = e.message || 'Login failed'
  }
})

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('signup-email').value.trim()
  const password = document.getElementById('signup-password').value
  const err = document.getElementById('signup-error')
  err.textContent = ''
  try {
    const resp = await fetch(`${API_BASE}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    if (!resp.ok) {
      const d = await resp.json().catch(() => ({}))
      throw new Error(d.detail || 'Signup failed')
    }
    // Auto-login after signup.
    const body = new URLSearchParams({ username: email, password })
    const login = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    const data = await login.json()
    if (!data || !data.access_token) throw new Error('Missing token')
    localStorage.setItem('token', data.access_token)
    setTimeout(() => { window.location.replace('index.html') }, 100)
  } catch (e) {
    err.textContent = e.message || 'Signup failed'
  }
})