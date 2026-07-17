/**
 * Chrome tabs access with a dev-mode fallback.
 *
 * Inside the extension (chrome-extension:// page) we talk to
 * chrome.tabs directly. During `npm run dev` there is no chrome.tabs,
 * so a small in-memory stub with demo tabs keeps the board usable in
 * a plain browser for development and screenshots.
 */

export interface OpenTab {
  id: number
  url: string
  title: string
  windowId: number
  active: boolean
  /** Chrome tab-group id, or TAB_GROUP_NONE when the tab isn't grouped. */
  groupId: number
}

/** A Chrome native tab group (the coloured, named strips in the tab strip). */
export interface TabGroup {
  id: number
  title: string
  color: string
}

/** chrome.tabGroups.TAB_GROUP_ID_NONE — the "no group" sentinel. */
export const TAB_GROUP_NONE = -1

export const isExtension =
  typeof chrome !== 'undefined' && !!chrome.tabs && !!chrome.runtime?.id

/** Skip browser internals, extension pages, and blank tabs. */
function isRealWebTab(url: string | undefined): url is string {
  return (
    !!url &&
    !url.startsWith('chrome://') &&
    !url.startsWith('chrome-extension://') &&
    !url.startsWith('about:') &&
    !url.startsWith('edge://') &&
    !url.startsWith('brave://')
  )
}

/* ---------------------------------------------------------------
   Dev stub — demo tabs so the board renders outside Chrome
   --------------------------------------------------------------- */

const NG = TAB_GROUP_NONE
let devTabs: OpenTab[] = [
  // Two tabs live in Chrome native groups (101 "Reading", 102 "Design")
  { id: 1, url: 'https://github.com/zarazhangrui/tab-out', title: 'zarazhangrui/tab-out: Keep tabs on your tabs', windowId: 1, active: true, groupId: NG },
  { id: 2, url: 'https://github.com/shadcn-ui/ui/issues/1234', title: 'Bug: ScrollArea horizontal · Issue #1234', windowId: 1, active: false, groupId: NG },
  { id: 3, url: 'https://gist.github.com/someone/abc123', title: 'useDebounce.ts', windowId: 2, active: false, groupId: NG },
  { id: 4, url: 'https://mail.google.com/mail/u/0/#inbox', title: 'Inbox (12) - Gmail', windowId: 1, active: false, groupId: NG },
  { id: 5, url: 'https://docs.google.com/document/d/xyz/edit', title: 'Q3 Planning Doc - Google Docs', windowId: 1, active: false, groupId: NG },
  { id: 6, url: 'https://www.google.com/search?q=kanban', title: 'kanban - Google Search', windowId: 2, active: false, groupId: NG },
  { id: 7, url: 'https://news.ycombinator.com/', title: 'Hacker News', windowId: 1, active: false, groupId: NG },
  { id: 8, url: 'https://news.ycombinator.com/', title: 'Hacker News', windowId: 2, active: false, groupId: NG },
  { id: 9, url: 'https://news.ycombinator.com/item?id=40000000', title: 'Show HN: Kanban for your tabs', windowId: 1, active: false, groupId: NG },
  { id: 10, url: 'http://localhost:3000/', title: 'My Next App', windowId: 1, active: false, groupId: NG },
  { id: 11, url: 'http://localhost:5173/', title: 'Vite + React', windowId: 1, active: false, groupId: NG },
  { id: 12, url: 'https://developer.chrome.com/docs/extensions/reference/api/tabs', title: 'chrome.tabs | Chrome for Developers', windowId: 2, active: false, groupId: 101 },
  { id: 13, url: 'https://www.figma.com/design/abc/Board-Mockup', title: 'Board Mockup – Figma', windowId: 2, active: false, groupId: 102 },
  { id: 14, url: 'https://en.wikipedia.org/wiki/Kanban', title: 'Kanban - Wikipedia', windowId: 1, active: false, groupId: 101 },
  { id: 15, url: 'https://ui.shadcn.com/docs/components/card', title: 'Card - shadcn/ui', windowId: 1, active: false, groupId: 102 },
  { id: 16, url: 'https://ui.shadcn.com/docs/components/scroll-area', title: 'Scroll-area - shadcn/ui', windowId: 1, active: false, groupId: 102 },
  // Single-tab sites — these collapse together into the "Other" column
  { id: 17, url: 'https://stackoverflow.com/questions/26/how-do-i-center-a-div', title: 'How do I center a div? - Stack Overflow', windowId: 1, active: false, groupId: NG },
  { id: 18, url: 'https://www.notion.so/My-workspace-abc123', title: 'My workspace – Notion', windowId: 2, active: false, groupId: NG },
  { id: 19, url: 'https://linear.app/team/board', title: 'Board – Linear', windowId: 1, active: false, groupId: NG },
]

let devGroups: TabGroup[] = [
  { id: 101, title: 'Reading', color: 'green' },
  { id: 102, title: 'Design', color: 'purple' },
]

/* ---------------------------------------------------------------
   Public API — same shape in both modes
   --------------------------------------------------------------- */

export async function fetchOpenTabs(): Promise<OpenTab[]> {
  if (!isExtension) return devTabs.map(t => ({ ...t }))
  const tabs = await chrome.tabs.query({})
  return tabs
    .filter(t => isRealWebTab(t.url))
    .map(t => ({
      id: t.id ?? -1,
      url: t.url ?? '',
      title: t.title || t.url || '',
      windowId: t.windowId,
      active: t.active,
      groupId: t.groupId ?? TAB_GROUP_NONE,
    }))
}

/**
 * Chrome native tab groups, keyed by id. Empty when the tabGroups API
 * is unavailable (older Chrome or missing permission). Dev mode returns
 * the demo groups.
 */
export async function fetchTabGroups(): Promise<Map<number, TabGroup>> {
  const groups = isExtension
    ? chrome.tabGroups
      ? (await chrome.tabGroups.query({})).map(g => ({
          id: g.id,
          title: g.title ?? '',
          color: g.color,
        }))
      : []
    : devGroups.map(g => ({ ...g }))
  return new Map(groups.map(g => [g.id, g]))
}

/** Close a specific set of tab ids. */
export async function closeTabs(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  if (!isExtension) {
    devTabs = devTabs.filter(t => !ids.includes(t.id))
    return
  }
  await chrome.tabs.remove(ids)
}

/** Jump to a tab, bringing its window to the front. */
export async function focusTab(tab: OpenTab): Promise<void> {
  if (!isExtension) return
  await chrome.tabs.update(tab.id, { active: true })
  await chrome.windows.update(tab.windowId, { focused: true })
}

/**
 * Favicon for a page URL. In the extension we use Chrome's local
 * _favicon cache (needs the "favicon" permission) — no external
 * requests. The dev stub falls back to Google's favicon service.
 */
export function faviconUrl(pageUrl: string, size = 32): string {
  if (isExtension) {
    const url = new URL(chrome.runtime.getURL('/_favicon/'))
    url.searchParams.set('pageUrl', pageUrl)
    url.searchParams.set('size', String(size))
    return url.toString()
  }
  try {
    const domain = new URL(pageUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
  } catch {
    return ''
  }
}

/**
 * Subscribe to tab open/close/navigate events so an open board never
 * shows stale cards. Returns an unsubscribe function. No-op in dev.
 */
export function onTabsChanged(callback: () => void): () => void {
  if (!isExtension) return () => {}

  const onUpdated = (
    _id: number,
    changeInfo: chrome.tabs.OnUpdatedInfo,
  ) => {
    // Only URL/title changes matter to the board
    if (changeInfo.url || changeInfo.title) callback()
  }

  chrome.tabs.onCreated.addListener(callback)
  chrome.tabs.onRemoved.addListener(callback)
  chrome.tabs.onUpdated.addListener(onUpdated)

  // React to group create/rename/recolor/move/remove so columns stay live
  const tabGroups = chrome.tabGroups
  tabGroups?.onCreated.addListener(callback)
  tabGroups?.onUpdated.addListener(callback)
  tabGroups?.onMoved.addListener(callback)
  tabGroups?.onRemoved.addListener(callback)

  return () => {
    chrome.tabs.onCreated.removeListener(callback)
    chrome.tabs.onRemoved.removeListener(callback)
    chrome.tabs.onUpdated.removeListener(onUpdated)
    tabGroups?.onCreated.removeListener(callback)
    tabGroups?.onUpdated.removeListener(callback)
    tabGroups?.onMoved.removeListener(callback)
    tabGroups?.onRemoved.removeListener(callback)
  }
}
