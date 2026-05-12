const $ = (sel) => document.querySelector(sel)

const globalToggle = $('#globalToggle')
const siteToggle = $('#siteToggle')
const siteName = $('#siteName')
const siteDesc = $('#siteDesc')
const statusDot = $('#statusDot')
const statusText = $('#statusText')
const statusCard = $('#statusCard')
const charCount = $('#charCount')
const conversionCount = $('#conversionCount')

let currentDomain = ''
let stats = { chars: 0, conversions: 0 }

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

async function getSettings() {
  return chrome.storage.sync.get(['globalEnabled', 'siteSettings', 'stats'])
}

async function sendToContent(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg)
  } catch {
    return null
  }
}

function updateStatus(enabled) {
  if (enabled) {
    statusDot.className = 'status-dot active'
    statusText.textContent = 'Active — Converting to Title Case'
    statusCard.className = 'status-card active'
  } else {
    statusDot.className = 'status-dot inactive'
    statusText.textContent = 'Inactive — Paused'
    statusCard.className = 'status-card inactive'
  }
}

function updateStats(s) {
  stats = s || stats
  charCount.textContent = (stats.chars || 0).toLocaleString()
  conversionCount.textContent = (stats.conversions || 0).toLocaleString()
}

async function init() {
  const tab = await getCurrentTab()
  const url = tab?.url ? new URL(tab.url) : null
  currentDomain = url?.hostname || ''

  const { globalEnabled, siteSettings } = await getSettings()

  const isGlobalOn = globalEnabled !== false
  const isSiteExplicitlyDisabled = siteSettings && siteSettings[currentDomain] === false
  const isSiteOn = isGlobalOn && !isSiteExplicitlyDisabled

  globalToggle.checked = isGlobalOn
  siteToggle.checked = isSiteOn

  if (currentDomain) {
    siteName.textContent = currentDomain
    siteDesc.textContent = `Enable on ${currentDomain}`
  } else {
    siteName.textContent = 'No site detected'
    siteDesc.textContent = 'Open a webpage to control per-site'
    siteToggle.disabled = true
  }

  updateStatus(isSiteOn)

  const msg = await sendToContent(tab.id, { action: 'getStatus' })
  if (msg && msg.enabled !== undefined) {
    updateStatus(msg.enabled)
  }

  const s = await chrome.storage.sync.get('stats')
  updateStats(s.stats)
}

init()

globalToggle.addEventListener('change', async () => {
  const enabled = globalToggle.checked
  await chrome.storage.sync.set({ globalEnabled: enabled })

  const tab = await getCurrentTab()

  if (!currentDomain) {
    await sendToContent(tab.id, { action: 'setEnabled', value: enabled })
    updateStatus(enabled)
    return
  }

  if (!enabled) {
    siteToggle.checked = false
    await sendToContent(tab.id, { action: 'setEnabled', value: false })
    updateStatus(false)
    return
  }

  const { siteSettings } = await chrome.storage.sync.get('siteSettings')
  const perSite = siteSettings || {}
  const siteEnabled = perSite[currentDomain] !== false
  siteToggle.checked = siteEnabled
  await sendToContent(tab.id, { action: 'setEnabled', value: siteEnabled })
  updateStatus(siteEnabled)
})

siteToggle.addEventListener('change', async () => {
  const enabled = siteToggle.checked
  const tab = await getCurrentTab()

  if (!currentDomain) return

  const { siteSettings } = await chrome.storage.sync.get('siteSettings')
  const merged = { ...(siteSettings || {}) }
  merged[currentDomain] = enabled
  await chrome.storage.sync.set({ siteSettings: merged })

  const { globalEnabled } = await chrome.storage.sync.get('globalEnabled')
  const effective = globalEnabled !== false && enabled
  await sendToContent(tab.id, { action: 'setEnabled', value: effective })
  updateStatus(effective)
})

$('#settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.stats) {
    updateStats(changes.stats.newValue)
  }
})
