import store from 'store2'
import type { AboutBlankData, TabData } from './types'

export function handleAboutBlank() {
  const aboutblankData = store.local.get('aboutblank') as AboutBlankData

  if (aboutblankData?.enabled && window.self === window.top) {
    openAbWindow(window.location.origin)
  }
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
