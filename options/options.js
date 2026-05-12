const globalToggle = document.getElementById('globalToggle')
const siteList = document.getElementById('siteList')
const emptyState = document.getElementById('emptyState')
const charCount = document.getElementById('charCount')
const conversionCount = document.getElementById('conversionCount')
const resetBtn = document.getElementById('resetBtn')

async function loadSettings() {
  const { globalEnabled, siteSettings, stats } = await chrome.storage.sync.get([
    'globalEnabled', 'siteSettings', 'stats'
  ])

  globalToggle.checked = globalEnabled !== false

  if (stats) {
    charCount.textContent = (stats.chars || 0).toLocaleString()
    conversionCount.textContent = (stats.conversions || 0).toLocaleString()
  }

  renderSiteList(siteSettings || {})
}

function renderSiteList(settings) {
  const entries = Object.entries(settings)
  const existingRows = siteList.querySelectorAll('.site-row')
  existingRows.forEach(r => r.remove())

  if (emptyState) {
    emptyState.style.display = entries.length === 0 ? 'flex' : 'none'
  }

  entries.forEach(([domain, enabled]) => {
    const row = document.createElement('div')
    row.className = 'site-row'

    const info = document.createElement('div')
    const domainSpan = document.createElement('div')
    domainSpan.className = 'site-domain'
    domainSpan.textContent = domain
    const statusSpan = document.createElement('div')
    statusSpan.className = 'site-status'
    statusSpan.textContent = enabled ? 'Enabled' : 'Disabled'

    info.appendChild(domainSpan)
    info.appendChild(statusSpan)

    const actions = document.createElement('div')
    actions.className = 'site-actions'

    const toggleBtn = document.createElement('button')
    toggleBtn.className = `site-toggle-btn ${enabled ? 'active' : 'inactive'}`
    toggleBtn.textContent = enabled ? 'On' : 'Off'

    const removeBtn = document.createElement('button')
    removeBtn.className = 'site-remove-btn'
    removeBtn.textContent = '✕'
    removeBtn.title = 'Remove site'

    toggleBtn.addEventListener('click', async () => {
      const newVal = !enabled
      const { siteSettings } = await chrome.storage.sync.get('siteSettings')
      siteSettings[domain] = newVal
      await chrome.storage.sync.set({ siteSettings })
      renderSiteList(siteSettings)

      const tabs = await chrome.tabs.query({ url: `*://${domain}/*` })
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'setEnabled', value: newVal })
        } catch {}
      }
    })

    removeBtn.addEventListener('click', async () => {
      const { siteSettings } = await chrome.storage.sync.get('siteSettings')
      delete siteSettings[domain]
      await chrome.storage.sync.set({ siteSettings })
      renderSiteList(siteSettings)

      const tabs = await chrome.tabs.query({ url: `*://${domain}/*` })
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'setEnabled',
            value: globalToggle.checked
          })
        } catch {}
      }
    })

    actions.appendChild(toggleBtn)
    actions.appendChild(removeBtn)
    row.appendChild(info)
    row.appendChild(actions)
    siteList.appendChild(row)
  })
}

globalToggle.addEventListener('change', async () => {
  await chrome.storage.sync.set({ globalEnabled: globalToggle.checked })
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    try {
      const { siteSettings } = await chrome.storage.sync.get('siteSettings')
      const domain = tab.url ? new URL(tab.url).hostname : ''
      const isSiteEnabled = siteSettings && siteSettings[domain] !== false
      const enabled = globalToggle.checked && isSiteEnabled
      await chrome.tabs.sendMessage(tab.id, { action: 'setEnabled', value: enabled })
    } catch {}
  }
})

resetBtn.addEventListener('click', () => {
  const overlay = document.createElement('div')
  overlay.className = 'confirm-overlay'
  overlay.innerHTML = `
    <div class="confirm-card">
      <h3>Reset All Settings?</h3>
      <p>This will clear all settings, site preferences, and conversion statistics. This action cannot be undone.</p>
      <div class="confirm-actions">
        <button class="btn-confirm-cancel" id="confirmCancel">Cancel</button>
        <button class="btn-confirm-danger" id="confirmReset">Reset Everything</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  document.getElementById('confirmCancel').addEventListener('click', () => {
    overlay.remove()
  })

  document.getElementById('confirmReset').addEventListener('click', async () => {
    await chrome.storage.sync.set({
      globalEnabled: true,
      siteSettings: {},
      stats: { chars: 0, conversions: 0 }
    })
    loadSettings()
    overlay.remove()
  })

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.stats) {
    const s = changes.stats.newValue
    charCount.textContent = (s.chars || 0).toLocaleString()
    conversionCount.textContent = (s.conversions || 0).toLocaleString()
  }
  if (changes.siteSettings) {
    renderSiteList(changes.siteSettings.newValue || {})
  }
})

loadSettings()
