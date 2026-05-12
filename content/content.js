let isEnabled = false
let isConverting = false
let statsTimer

async function loadSettings() {
  const { globalEnabled, siteSettings } = await chrome.storage.sync.get([
    'globalEnabled', 'siteSettings'
  ])
  isEnabled = globalEnabled !== false
  const domain = window.location.hostname
  if (siteSettings && siteSettings[domain] === false) {
    isEnabled = false
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'setEnabled') {
    isEnabled = msg.value
    if (isEnabled) convertAll()
    sendResponse({ ok: true })
  }
  if (msg.action === 'getStatus') {
    sendResponse({ enabled: isEnabled })
  }
  if (msg.action === 'convertAll') {
    convertAll()
    sendResponse({ ok: true })
  }
  return true
})

function toTitleCase(str) {
  return str.replace(/\S+/g, word => {
    if (word.length === 0) return word
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  })
}

function shouldConvert(el) {
  if (!el || !el.tagName) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'textarea') return true
  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase()
    return !['password', 'hidden', 'file', 'checkbox', 'radio',
             'submit', 'button', 'reset', 'image', 'color',
             'date', 'datetime-local', 'month', 'week', 'time',
             'range'].includes(type)
  }
  return el.isContentEditable === true
}

function convertAll() {
  document.querySelectorAll('textarea, input, [contenteditable="true"]').forEach(el => {
    if (shouldConvert(el)) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const converted = toTitleCase(el.value)
        if (converted !== el.value) {
          el.value = converted
          trackConversion(el.value)
        }
      } else if (el.isContentEditable) {
        convertContentEditable(el)
      }
    }
  })
}

function convertContentEditable(root) {
  if (isConverting) return
  isConverting = true
  try {
    const sel = window.getSelection()
    const hasFocus = sel && sel.rangeCount > 0 && root.contains(sel.anchorNode)
    let savedRange = null
    if (hasFocus) {
      savedRange = sel.getRangeAt(0)
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        let p = node.parentElement
        while (p) {
          const t = p.tagName.toLowerCase()
          if (['script', 'style', 'svg'].includes(t)) return NodeFilter.FILTER_REJECT
          if (t === 'code' || t === 'pre') return NodeFilter.FILTER_SKIP
          p = p.parentElement
        }
        return NodeFilter.FILTER_ACCEPT
      }
    }, false)

    let changed = false
    let node
    while (node = walker.nextNode()) {
      if (!node.textContent.trim()) continue
      const converted = toTitleCase(node.textContent)
      if (converted !== node.textContent) {
        node.textContent = converted
        changed = true
      }
    }

    if (changed) trackConversion()

    if (savedRange) {
      sel.removeAllRanges()
      sel.addRange(savedRange)
    }
  } finally {
    isConverting = false
  }
}

let pendingChars = 0
let pendingConversions = 0

async function flushStats() {
  if (pendingConversions === 0) return
  try {
    const { stats } = await chrome.storage.sync.get('stats')
    if (stats) {
      stats.chars = (stats.chars || 0) + pendingChars
      stats.conversions = (stats.conversions || 0) + pendingConversions
      await chrome.storage.sync.set({ stats })
    }
  } catch {}
  pendingChars = 0
  pendingConversions = 0
}

function trackConversion(text) {
  pendingConversions++
  if (typeof text === 'string') {
    pendingChars += text.length
  }
  clearTimeout(statsTimer)
  statsTimer = setTimeout(flushStats, 500)
}

let inputTimer
document.addEventListener('input', (e) => {
  if (!isEnabled) return
  const el = e.target
  if (!shouldConvert(el)) return

  clearTimeout(inputTimer)
  inputTimer = setTimeout(() => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const start = el.selectionStart
      const end = el.selectionEnd
      const converted = toTitleCase(el.value)
      if (converted !== el.value) {
        el.value = converted
        if (start !== null && end !== null) {
          el.setSelectionRange(start, end)
        }
        trackConversion(converted)
      }
    } else if (el.isContentEditable) {
      convertContentEditable(el)
    }
  }, 10)
}, true)

const observer = new MutationObserver((mutations) => {
  if (!isEnabled) return
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue
      if (shouldConvert(node)) {
        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
          node.value = toTitleCase(node.value)
        } else if (node.isContentEditable) {
          convertContentEditable(node)
        }
      }
      if (node.querySelectorAll) {
        node.querySelectorAll('textarea, input, [contenteditable="true"]').forEach(el => {
          if (shouldConvert(el)) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              el.value = toTitleCase(el.value)
            }
          }
        })
      }
    }
  }
})

loadSettings().then(() => {
  if (isEnabled) {
    convertAll()
  }
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
})
