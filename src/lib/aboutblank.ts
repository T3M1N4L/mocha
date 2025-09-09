import store from 'store2'
import type { AboutBlankData, TabData, CloakData } from './types'

export function handleAboutBlank() {
  const aboutblankData = store.local.get('aboutblank') as AboutBlankData

  if (aboutblankData?.enabled && window.self === window.top) {
    openAbWindow(window.location.origin)
  }
}

export function handleCloaking() {
  if (window.self !== window.top) return

  const cloak = store.local.get('cloak') as CloakData
  const mode = cloak?.mode

  if (mode === 'aboutblank') {
    openAbWindow(window.location.origin)
  } else if (mode === 'blob') {
    openBlobWindow(window.location.origin)
  } else {
    const aboutblankData = store.local.get('aboutblank') as AboutBlankData
    if (aboutblankData?.enabled) {
      openAbWindow(window.location.origin)
    }
  }
}

export function openBlobWindow(src: string, redirect = true) {
  const tabData = store.local.get('tab') as TabData
  const title = tabData?.name?.trim() || 'Google'
  const icon = tabData?.icon?.trim() || '/img/google.png'

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <link rel="icon" href="${icon}" />
        <style>
          html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; }
          iframe {
            border: none; outline: none;
            width: 100vw; height: 100vh;
            position: fixed; left: 0; top: 0;
          }
        </style>
      </head>
      <body>
        <iframe src="${src}" allow="fullscreen" sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
      </body>
    </html>
  `

  const blob = new Blob([html], { type: 'text/html' })
  const blobUrl = URL.createObjectURL(blob)

  const tab = window.open(blobUrl, '_blank')
  if (!tab) return

  if (redirect) window.location.replace('https://classroom.google.com/h')
}

export function openCloakWindow(src: string, redirect = true) {
  const cloak = store.local.get('cloak') as CloakData
  const mode = cloak?.mode
  if (mode === 'aboutblank') return openAbWindow(src, redirect)
  if (mode === 'blob') return openBlobWindow(src, redirect)
  // Default to about:blank (legacy behavior) when unset/none
  return openAbWindow(src, redirect)
}
export function openAbWindow(src: string, redirect = true) {
  const tab = window.open('about:blank', '_blank')
  if (!tab) return
  const tabData = store.local.get('tab') as TabData
  const title = tabData?.name?.trim() || 'Google'
  const icon = tabData?.icon?.trim() || '/img/google.png'

  const link = tab.document.createElement('link')
  link.rel = 'icon'
  link.href = icon
  tab.document.head.appendChild(link)

  tab.document.title = title

  const iframe = tab.document.createElement('iframe')
  const stl = iframe.style
  stl.border = stl.outline = 'none'
  stl.width = '100vw'
  stl.height = '100vh'
  stl.position = 'fixed'
  stl.left = stl.right = stl.top = stl.bottom = '0'
  iframe.src = src
  tab.document.body.appendChild(iframe)

  if (redirect) window.location.replace('https://classroom.google.com/h')
}
