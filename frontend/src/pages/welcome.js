/*
 * Welcome / Auth Page Entry — Material Flat Minimalist Architecture
 * ------------------------------------------------------------------
 * Handles user sign in & sign up with token caching and instant redirect.
 */
import '../bootstrap.js'

const API_BASE = '/api'

// Skip gate if already authenticated
try {
  const token = localStorage.getItem('token')
  if (token && token.length > 10) {
    window.location.replace('index.html')
  }
} catch (_) {}

const tabLogin = document.getElementById('tab-login')
const tabSignup = document.getElementById('tab-signup')
const loginForm = document.getElementById('login-form')
const signupForm = document.getElementById('signup-form')
const quickDemoBtn = document.getElementById('quick-demo-btn')

function showLogin() {
  tabLogin.classList.add('active')
  tabSignup.classList.remove('active')
  loginForm.classList.remove('hidden')
  signupForm.classList.add('hidden')
}

function showSignup() {
  tabSignup.classList.add('active')
  tabLogin.classList.remove('active')
  signupForm.classList.remove('hidden')
  loginForm.classList.add('hidden')
}

if (tabLogin && tabSignup) {
  tabLogin.addEventListener('click', showLogin)
  tabSignup.addEventListener('click', showSignup)
}

if (quickDemoBtn) {
  quickDemoBtn.addEventListener('click', () => {
    document.getElementById('login-email').value = 'demo@demo.com'
    document.getElementById('login-password').value = 'demo'
    loginForm.requestSubmit()
  })
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('login-email').value.trim()
    const password = document.getElementById('login-password').value
    const err = document.getElementById('login-error')
    const submitBtn = document.getElementById('login-submit-btn')

    err.textContent = ''
    submitBtn.dataset.loading = 'true'
    submitBtn.disabled = true

    try {
      const body = new URLSearchParams({ username: email, password })
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })

      if (!resp.ok) {
        throw new Error('Invalid email or password. Please try again.')
      }

      const data = await resp.json()
      if (!data || !data.access_token) {
        throw new Error('Missing authentication token in response.')
      }

      localStorage.setItem('token', data.access_token)
      setTimeout(() => {
        window.location.replace('index.html')
      }, 100)
    } catch (e) {
      err.textContent = e.message || 'Login failed.'
      submitBtn.dataset.loading = 'false'
      submitBtn.disabled = false
    }
  })
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('signup-email').value.trim()
    const password = document.getElementById('signup-password').value
    const err = document.getElementById('signup-error')
    const submitBtn = document.getElementById('signup-submit-btn')

    err.textContent = ''
    submitBtn.dataset.loading = 'true'
    submitBtn.disabled = true

    try {
      const resp = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}))
        throw new Error(d.detail || 'Signup failed. Please try a different email.')
      }

      // Automatically sign in upon successful registration
      const body = new URLSearchParams({ username: email, password })
      const login = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })

      const data = await login.json()
      if (!data || !data.access_token) {
        throw new Error('Missing authentication token.')
      }

      localStorage.setItem('token', data.access_token)
      setTimeout(() => {
        window.location.replace('index.html')
      }, 100)
    } catch (e) {
      err.textContent = e.message || 'Signup failed.'
      submitBtn.dataset.loading = 'false'
      submitBtn.disabled = false
    }
  })
}