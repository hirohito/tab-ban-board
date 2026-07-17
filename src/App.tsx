import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CopyX, LayoutDashboard, X } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { localhostPort, pathLabel, rootDomain } from '@/lib/domain'
import { playCloseSound, shootConfetti } from '@/lib/effects'
import {
  closeTabs,
  faviconUrl,
  fetchOpenTabs,
  focusTab,
  onTabsChanged,
  type OpenTab,
} from '@/lib/tabs'

/** One board column: every open tab sharing a root domain. */
interface DomainColumn {
  domain: string
  tabs: OpenTab[]
}

type ClosePoint = { x: number; y: number }

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getDateDisplay(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function App() {
  const [tabs, setTabs] = useState<OpenTab[]>([])

  const refresh = useCallback(async () => {
    setTabs(await fetchOpenTabs())
  }, [])

  // Initial load + live updates when tabs change elsewhere in the
  // browser (debounced — tab events arrive in bursts)
  useEffect(() => {
    refresh()
    let timer: ReturnType<typeof setTimeout>
    const scheduleRefresh = () => {
      clearTimeout(timer)
      timer = setTimeout(refresh, 300)
    }
    const unsubscribe = onTabsChanged(scheduleRefresh)
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [refresh])

  // Group tabs into columns by root domain, busiest columns first
  const columns = useMemo<DomainColumn[]>(() => {
    const byDomain = new Map<string, OpenTab[]>()
    for (const tab of tabs) {
      const domain = rootDomain(tab.url)
      const group = byDomain.get(domain)
      if (group) group.push(tab)
      else byDomain.set(domain, [tab])
    }
    return [...byDomain.entries()]
      .map(([domain, domainTabs]) => ({ domain, tabs: domainTabs }))
      .sort(
        (a, b) =>
          b.tabs.length - a.tabs.length || a.domain.localeCompare(b.domain),
      )
  }, [tabs])

  // How many times each URL is open, for the ×N badges and the banner
  const dupeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const tab of tabs) counts.set(tab.url, (counts.get(tab.url) ?? 0) + 1)
    return counts
  }, [tabs])

  const dupePages = [...dupeCounts.values()].filter(n => n > 1).length

  const closeWithFx = useCallback(
    async (ids: number[], point: ClosePoint, message: string) => {
      playCloseSound()
      shootConfetti(point.x, point.y)
      await closeTabs(ids)
      toast(message)
      await refresh()
    },
    [refresh],
  )

  /** Keep one copy (preferring the active tab) of every duplicated URL. */
  const closeDuplicates = useCallback(
    async (point: ClosePoint) => {
      const toClose: number[] = []
      for (const [url, count] of dupeCounts) {
        if (count < 2) continue
        const matching = tabs.filter(t => t.url === url)
        const keep = matching.find(t => t.active) ?? matching[0]
        toClose.push(...matching.filter(t => t.id !== keep.id).map(t => t.id))
      }
      if (toClose.length === 0) return
      await closeWithFx(
        toClose,
        point,
        `Closed ${toClose.length} duplicate tab${toClose.length === 1 ? '' : 's'}`,
      )
    },
    [dupeCounts, tabs, closeWithFx],
  )

  return (
    <div className="bg-background text-foreground flex h-screen flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-end justify-between border-b px-6 py-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-muted-foreground text-sm">{getDateDisplay()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="tabular-nums">
            {tabs.length} tab{tabs.length === 1 ? '' : 's'}
          </Badge>
          <Badge variant="outline" className="tabular-nums">
            {columns.length} domain{columns.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </header>

      {/* ── Duplicate cleanup banner ───────────────────────────── */}
      {dupePages > 0 && (
        <div className="shrink-0 px-6 pt-4">
          <Alert>
            <CopyX />
            <AlertTitle>
              {dupePages} page{dupePages === 1 ? ' is' : 's are'} open more than
              once
            </AlertTitle>
            <AlertDescription>
              Keep one copy of each and close the rest.
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                onClick={e => closeDuplicates({ x: e.clientX, y: e.clientY })}
              >
                Keep one of each
              </Button>
            </AlertAction>
          </Alert>
        </div>
      )}

      {/* ── The board — one column per root domain, scrolls sideways ── */}
      <main className="min-h-0 flex-1">
        {columns.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayoutDashboard />
              </EmptyMedia>
              <EmptyTitle>No open tabs</EmptyTitle>
              <EmptyDescription>
                Open some tabs and they&apos;ll show up here, grouped by root
                domain.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="h-full **:data-[slot=scroll-area-viewport]:*:h-full">
            <div className="flex h-full items-stretch gap-4 p-6">
              {columns.map(column => (
                <DomainColumnCard
                  key={column.domain}
                  column={column}
                  dupeCounts={dupeCounts}
                  onCloseTabs={closeWithFx}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="text-muted-foreground shrink-0 border-t px-6 py-3 text-center text-xs">
        Tab-Ban Board — a Kanban remix of{' '}
        <a
          className="hover:text-foreground underline underline-offset-2"
          href="https://github.com/zarazhangrui/tab-out"
          target="_top"
        >
          Tab Out
        </a>{' '}
        by{' '}
        <a
          className="hover:text-foreground underline underline-offset-2"
          href="https://x.com/zarazhangrui"
          target="_top"
        >
          Zara
        </a>
      </footer>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   One Kanban column: a root domain and its open tabs
   ──────────────────────────────────────────────────────────────── */

function DomainColumnCard({
  column,
  dupeCounts,
  onCloseTabs,
}: {
  column: DomainColumn
  dupeCounts: Map<string, number>
  onCloseTabs: (
    ids: number[],
    point: ClosePoint,
    message: string,
  ) => Promise<void>
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  // Column favicon: sample the first tab (all share the root domain)
  const icon = faviconUrl(column.tabs[0].url)

  // One card per URL — duplicates collapse into a ×N badge
  const uniqueTabs = useMemo(() => {
    const seen = new Set<string>()
    return column.tabs.filter(tab => {
      if (seen.has(tab.url)) return false
      seen.add(tab.url)
      return true
    })
  }, [column.tabs])

  const closeColumn = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect()
    const point = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + 80 }
      : { x: e.clientX, y: e.clientY }
    onCloseTabs(
      column.tabs.map(t => t.id),
      point,
      `Closed ${column.tabs.length} ${column.domain} tab${column.tabs.length === 1 ? '' : 's'}`,
    )
  }

  return (
    <Card
      ref={cardRef}
      className="flex max-h-full w-80 shrink-0 flex-col self-start"
    >
      <CardHeader className="shrink-0">
        <CardTitle className="flex min-w-0 items-center gap-2">
          {icon && (
            <img src={icon} alt="" className="size-4 shrink-0 rounded-sm" />
          )}
          <span className="truncate">{column.domain}</span>
        </CardTitle>
        <CardDescription>
          {column.tabs.length} tab{column.tabs.length === 1 ? '' : 's'}
        </CardDescription>
        <CardAction>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Close all ${column.domain} tabs`}
                onClick={closeColumn}
              >
                <X />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close all {column.domain} tabs</TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {uniqueTabs.map(tab => (
            <TabCard
              key={tab.url}
              tab={tab}
              columnTabs={column.tabs}
              dupeCount={dupeCounts.get(tab.url) ?? 1}
              onCloseTabs={onCloseTabs}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ────────────────────────────────────────────────────────────────
   One card: an open tab (click to jump to it)
   ──────────────────────────────────────────────────────────────── */

function TabCard({
  tab,
  columnTabs,
  dupeCount,
  onCloseTabs,
}: {
  tab: OpenTab
  columnTabs: OpenTab[]
  dupeCount: number
  onCloseTabs: (
    ids: number[],
    point: ClosePoint,
    message: string,
  ) => Promise<void>
}) {
  const port = localhostPort(tab.url)

  const closeTab = (e: React.MouseEvent) => {
    e.stopPropagation()
    // The card represents every copy of this URL — close them all
    const ids = columnTabs.filter(t => t.url === tab.url).map(t => t.id)
    onCloseTabs(
      ids,
      { x: e.clientX, y: e.clientY },
      ids.length > 1 ? `Closed ${ids.length} tabs` : 'Tab closed',
    )
  }

  return (
    <Item
      variant="outline"
      size="sm"
      role="button"
      tabIndex={0}
      className="cursor-pointer flex-nowrap"
      onClick={() => focusTab(tab)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') focusTab(tab)
      }}
    >
      <ItemMedia>
        <img src={faviconUrl(tab.url)} alt="" className="size-4 rounded-sm" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="line-clamp-1">{tab.title}</ItemTitle>
        <ItemDescription className="line-clamp-1 text-xs">
          {pathLabel(tab.url)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {port && (
          <Badge variant="secondary" className="tabular-nums">
            :{port}
          </Badge>
        )}
        {dupeCount > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="tabular-nums">
                ×{dupeCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Open {dupeCount} times</TooltipContent>
          </Tooltip>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Close ${tab.title}`}
          onClick={closeTab}
        >
          <X />
        </Button>
      </ItemActions>
    </Item>
  )
}
