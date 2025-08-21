// components/calendar/HerdGoogleLikeCalendar.tsx
'use client'

import type React from 'react'
import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ComponentType,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  type View as RBCView,
  type ToolbarProps,
  type Components,
} from 'react-big-calendar'
import {
  addDays,
  addMinutes,
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfWeek,
  addMonths,
  isSameMonth,
  isToday,
  isSameDay,
  eachDayOfInterval,
  differenceInCalendarDays,
  isWithinInterval,
} from 'date-fns'
import enUS from 'date-fns/locale/en-US'
import type { Event as HerdEvent } from '@/lib/types'
import { to12h } from '@/lib/to12hrs'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  CheckCircle2,
  Bookmark,
  MapPin,
  Clock,
  RefreshCw,
  CalendarDays,
  Search,
  X,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import 'react-big-calendar/lib/css/react-big-calendar.css'

type Row = { event: HerdEvent; rsvpd: boolean; saved: boolean }

interface HerdGoogleLikeCalendarProps {
  rows: Row[]
  viewMode?: 'week' | 'agenda'
  className?: string
  loading?: boolean
}

/** RBC types (in some versions) omit "agenda". Allow it locally. */
type AnyView = RBCView | 'agenda'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
})

/* ---------- Helpers ---------- */
function parseLocalDate(ds: string): Date {
  const t1 = parse(ds, 'yyyy-MM-dd', new Date())
  if (!isNaN(+t1)) return t1
  const t2 = parse(ds, 'MMM d, yyyy', new Date())
  if (!isNaN(+t2)) return t2
  const t3 = new Date(ds)
  return isNaN(+t3) ? new Date() : t3
}
function buildDates(dateStr: string, time?: string | null) {
  const day = parseLocalDate(dateStr)
  if (!time) return { start: day, end: addDays(day, 1), allDay: true }
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  const hh = m ? Math.min(23, Math.max(0, +m[1])) : 0
  const mm = m ? Math.min(59, Math.max(0, +m[2])) : 0
  const start = new Date(day)
  start.setHours(hh, mm, 0, 0)
  const end = addMinutes(start, 60)
  return { start, end, allDay: false }
}

/* ---------- Palette (requested colors) ---------- */
const CATEGORY_COLORS = {
  Social: { bg: '#F3E8FF', border: '#A855F7', text: '#7E22CE' }, // violet
  Academic: { bg: '#DCFCE7', border: '#22C55E', text: '#166534' }, // green
  Sports: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }, // red
  Arts: { bg: '#FCE7F3', border: '#ec65a8', text: '#9D174D' }, // pink
  default: { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569' }, // slate
} as const

const catKeyToClass = (cat?: keyof typeof CATEGORY_COLORS) => {
  switch ((cat || 'default') as keyof typeof CATEGORY_COLORS) {
    case 'Social': return 'marker-social'
    case 'Academic': return 'marker-academic'
    case 'Sports': return 'marker-sports'
    case 'Arts': return 'marker-arts'
    default: return ''
  }
}

/* ---------- Persistence for last view/date ---------- */
const STORAGE_KEY = 'herd:calendar:last-state' as const
type StoredState = { view: AnyView; dateISO: string }

function deviceDefault(viewMode: 'week' | 'agenda', isMobileGuess: boolean) {
  if (viewMode === 'agenda') return { view: 'agenda' as AnyView, date: startOfMonth(new Date()) }
  return { view: (isMobileGuess ? Views.DAY : Views.WEEK) as AnyView, date: new Date() }
}

function loadInitial(viewMode: 'week' | 'agenda') {
  const isBrowser = typeof window !== 'undefined'
  const search = isBrowser ? new URLSearchParams(window.location.search) : null
  const shouldReset = search?.get('reset') === '1'
  const isMobileGuess = isBrowser ? window.matchMedia('(max-width: 767px)').matches : false

  if (!shouldReset && isBrowser) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved: StoredState = JSON.parse(raw)
        const date = saved?.dateISO ? new Date(saved.dateISO) : new Date()
        if (!isNaN(+date) && saved?.view) {
          return { view: saved.view as AnyView, date }
        }
      }
    } catch { }
  } else if (shouldReset && isBrowser) {
    try { localStorage.removeItem(STORAGE_KEY) } catch { }
  }

  return deviceDefault(viewMode, isMobileGuess)
}

/* ---------- Mini month grid used inside Day picker ---------- */
function MiniMonthGrid({
  date,
  onChange,
}: {
  date: Date
  onChange: (d: Date) => void
}) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="px-2 pb-3">
      <div className="grid grid-cols-7 text-[12px] font-medium text-gray-500 pb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, monthStart)
          const selected = isSameDay(d, date)
          const today = isToday(d)
          return (
            <button
              key={d.toISOString()}
              onClick={() => onChange(startOfDay(d))}
              className={[
                'mx-1 my-1 flex h-11 w-11 items-center justify-center rounded-full text-sm transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500',
                inMonth ? 'text-gray-900' : 'text-gray-400',
                selected
                  ? 'text-white university-primary-bg shadow-md'
                  : today
                    ? 'mini-today-outline font-semibold'
                    : 'hover:bg-gray-100 active:bg-gray-200',
              ].join(' ')}
              aria-label={`Select ${format(d, 'MMMM d, yyyy')}`}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Day Date Picker (bottom sheet) ---------- */
function DatePickerSheet({
  date,
  onChange,
}: {
  date: Date
  onChange: (d: Date) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="min-h-11 h-11 px-3 rounded-lg flex items-center gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          {format(date, 'MMM d, yyyy')}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="p-0">
        <SheetHeader className="px-4 pt-4">
          <SheetTitle className="text-left">Pick a date</SheetTitle>
        </SheetHeader>
        <div className="py-2">
          <div className="flex items-center justify-between px-4 py-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              onClick={() => onChange(addMonths(date, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold">{format(date, 'LLLL yyyy')}</div>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              onClick={() => onChange(addMonths(date, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <MiniMonthGrid
            date={date}
            onChange={(d) => {
              onChange(d)
              setOpen(false)
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ---------- Pull-to-refresh hook (mobile) ---------- */
function usePullToRefresh<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onRefresh: () => void
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startY = 0
    let pulling = false
    let thresholdReached = false

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        startY = e.touches[0].clientY
        pulling = true
        thresholdReached = false
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return
      const dy = e.touches[0].clientY - startY
      if (dy > 60) thresholdReached = true
    }
    const onTouchEnd = () => {
      if (pulling && thresholdReached) onRefresh()
      pulling = false
      thresholdReached = false
    }

    const opts: AddEventListenerOptions = { passive: true }
    el.addEventListener('touchstart', onTouchStart, opts)
    el.addEventListener('touchmove', onTouchMove, opts)
    el.addEventListener('touchend', onTouchEnd, opts)

    return () => {
      el.removeEventListener('touchstart', onTouchStart, opts)
      el.removeEventListener('touchmove', onTouchMove, opts)
      el.removeEventListener('touchend', onTouchEnd, opts)
    }
  }, [ref, onRefresh])
}

/* ---------- Main ---------- */
export default function HerdGoogleLikeCalendar({
  rows,
  viewMode = 'week',
  className = '',
  loading = false,
}: HerdGoogleLikeCalendarProps) {
  const router = useRouter()

  // Track viewport for responsive Day/Week switching
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 768)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  // Initialize from saved state (or device default if none / ?reset=1)
  const initRef = useRef(loadInitial(viewMode))
  const [currentView, setCurrentView] = useState<AnyView>(initRef.current.view)
  const [currentDate, setCurrentDate] = useState<Date>(initRef.current.date)

  // Persist last {view,date}
  useEffect(() => {
    try {
      const payload: StoredState = { view: currentView, dateISO: currentDate.toISOString() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch { }
  }, [currentView, currentDate])

  // ✅ Responsive switching ONLY between Day/Week on viewport change.
  // Never override List (agenda).
  useEffect(() => {
    setCurrentView(prev =>
      prev === 'agenda' ? prev : (isMobile ? Views.DAY : Views.WEEK)
    )
    // keep date as-is; do not jump to "today" on width change
  }, [isMobile])

  // Snap to first-of-month when entering List (agenda)
  useEffect(() => {
    if (currentView === 'agenda') setCurrentDate((d) => startOfMonth(d))
  }, [currentView])

  const dayView = currentView === Views.DAY
  const weekView = currentView === Views.WEEK

  // DB → RBC events
  const baseEvents = useMemo(() => {
    return rows
      .filter((r) => r && r.event)
      .map(({ event, rsvpd, saved }) => {
        const { start, end, allDay } = buildDates(event.date, event.time)
        return {
          id: event.id,
          title: event.title ?? '',
          start,
          end: end ?? start,
          allDay,
          resource: {
            rsvpd,
            saved,
            location: event.location,
            category: event.category as keyof typeof CATEGORY_COLORS | undefined,
            description: (event as any).description,
            originalEvent: event,
          },
        }
      })
  }, [rows])

  /* ---------- Agenda data: only events in current month ---------- */
  const monthStart = startOfMonth(currentDate)
  const monthEnd = startOfMonth(addMonths(monthStart, 1))
  const agendaEvents = useMemo(() => {
    return baseEvents
      .filter((e) => isWithinInterval(e.start, { start: monthStart, end: addDays(monthEnd, -1) }))
      .sort((a, b) => +a.start - +b.start)
  }, [baseEvents, monthStart, monthEnd])

  /* ---------- FILTER (List view) ---------- */
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<Set<keyof typeof CATEGORY_COLORS>>(new Set())
  const [onlyRSVP, setOnlyRSVP] = useState(false)
  const [onlySaved, setOnlySaved] = useState(false)

  const allCategories = useMemo(() => {
    const s = new Set<keyof typeof CATEGORY_COLORS>()
    for (const ev of agendaEvents) {
      const c = ev.resource?.category as keyof typeof CATEGORY_COLORS | undefined
      if (c && CATEGORY_COLORS[c]) s.add(c)
    }
    return Array.from(s).sort()
  }, [agendaEvents])

  const filteredAgenda = useMemo(() => {
    const q = query.trim().toLowerCase()
    return agendaEvents.filter((ev) => {
      if (catFilter.size > 0) {
        const c = (ev.resource?.category ?? 'default') as keyof typeof CATEGORY_COLORS
        if (!catFilter.has(c)) return false
      }
      if (onlyRSVP || onlySaved) {
        const r = !!ev.resource?.rsvpd
        const s = !!ev.resource?.saved
        if (!((onlyRSVP && r) || (onlySaved && s))) return false
      }
      if (q) {
        const hay = `${ev.title ?? ''} ${ev.resource?.location ?? ''} ${ev.resource?.description ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [agendaEvents, catFilter, onlyRSVP, onlySaved, query])

  const filteredCount = filteredAgenda.length

  /* ---------- Desktop toolbar (WEB: Week & List only) ---------- */
  const Toolbar = useCallback(
    ({ label, onNavigate, onView }: ToolbarProps) => {
      const isAgenda = currentView === 'agenda'
      const start = startOfMonth(currentDate)
      const nextStart = startOfMonth(addMonths(start, 1))
      const monthRange = `${format(start, 'MMM dd, yyyy')} – ${format(nextStart, 'MMM dd, yyyy')}`

      const goPrev = () => {
        if (currentView === 'agenda') {
          const prev = startOfMonth(addMonths(currentDate, -1))
          setCurrentDate(prev)
          onNavigate('DATE', prev)
        } else {
          onNavigate('PREV')
        }
      }
      const goNext = () => {
        if (currentView === 'agenda') {
          const next = startOfMonth(addMonths(currentDate, 1))
          setCurrentDate(next)
          onNavigate('DATE', next)
        } else {
          onNavigate('NEXT')
        }
      }
      const goToday = () => {
        if (currentView === 'agenda') {
          const snap = startOfMonth(new Date())
          setCurrentDate(snap)
          onNavigate('DATE', snap)
        } else {
          onNavigate('TODAY')
        }
      }

      return (
        <div className="hidden md:flex items-center justify-between py-4 border-b border-gray-200 px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                className="today-btn font-semibold px-3 py-1.5 hover:bg-gray-100 transition-colors min-h-11"
                onClick={goToday}
              >
                Today
              </Button>

              {currentView === Views.DAY && (
                <DatePickerSheet date={currentDate} onChange={(d) => setCurrentDate(d)} />
              )}

              {/* Title with chevrons to its right (moved here) */}
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 select-none">
                  {isAgenda ? monthRange : label}
                </h1>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11"
                    onClick={goPrev}
                    aria-label={`Previous ${currentView === 'agenda' ? 'month' : 'period'}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11"
                    onClick={goNext}
                    aria-label={`Next ${currentView === 'agenda' ? 'month' : 'period'}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* WEB: exactly two buttons — Week & List */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 shadow-sm">
            <Button
              size="sm"
              variant={currentView === Views.WEEK ? 'default' : 'ghost'}
              onClick={() => {
                setCurrentView(Views.WEEK)
                setCurrentDate(new Date())
                onView?.(Views.WEEK)
              }}
              className={`h-11 px-4 text-sm font-semibold rounded-md transition-all duration-150 ${currentView === Views.WEEK
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
                }`}
              aria-label="Switch to week view"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Week
            </Button>

            <Button
              size="sm"
              variant={currentView === 'agenda' ? 'default' : 'ghost'}
              onClick={() => {
                setCurrentView('agenda')
                setCurrentDate((d) => startOfMonth(d))
              }}
              className={`h-11 px-4 text-sm font-semibold rounded-md transition-all duration-150 ${currentView === 'agenda'
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
                }`}
              aria-label="Switch to list view"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
        </div>
      )
    },
    [currentView, currentDate, router]
  )

  /* ---------- Mobile controls (Day/List; date picker only when Day) ---------- */
  const MobileControls = (
    <div className="md:hidden border-b bg-white px-3 pb-3 sticky top-0 z-20">
      <div className="flex gap-2 bg-gray-50 rounded-lg p-1">
        <Button
          size="sm"
          variant={dayView ? 'default' : 'ghost'}
          className={`h-11 flex-1 font-semibold transition-all duration-150 ${dayView
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          onClick={() => setCurrentView(Views.DAY)}
        >
          <CalendarIcon className="h-4 w-4 mr-1.5" />
          Day
        </Button>
        <Button
          size="sm"
          variant={currentView === 'agenda' ? 'default' : 'ghost'}
          className={`h-11 flex-1 font-semibold transition-all duration-150 ${currentView === 'agenda'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          onClick={() => {
            setCurrentView('agenda')
            setCurrentDate((d) => startOfMonth(d))
          }}
        >
          <List className="h-4 w-4 mr-1.5" />
          List
        </Button>

        {/* date picker only on Day view */}
        {dayView && (
          <DatePickerSheet
            date={currentDate}
            onChange={(d) => {
              setCurrentDate(d)
              setCurrentView(Views.DAY)
            }}
          />
        )}
      </div>
    </div>
  )

  /* ---------- RBC EVENT STYLING (Week/Day grid) ---------- */
  const eventPropGetter = (ev: any) => {
    const rsvpd = ev?.resource?.rsvpd
    const saved = ev?.resource?.saved
    const catKey = (ev?.resource?.category as keyof typeof CATEGORY_COLORS) || 'default'
    const colors = CATEGORY_COLORS[catKey] ?? CATEGORY_COLORS.default
    const statusColor = rsvpd ? '#22C55E' : saved ? '#A855F7' : '#CBD5E1'

    if (dayView) {
      return {
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          marginLeft: 4,
          marginRight: 6,
          borderRadius: 8,
        },
      } as any
    }

    return {
      style: {
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: statusColor,
        fontSize: 13,
        fontWeight: 700,
        padding: '6px 10px',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(60, 64, 67, 0.12)',
        transition: 'all .15s ease',
        display: 'inline-block',
        width: 'auto',
        maxWidth: '95%',
      },
    }
  }

  function EventCell({ event }: { event: any }) {
    const loc = event?.resource?.location as string | undefined
    const titleOnly = String(event?.title ?? '')
    if (dayView) {
      const catKey = (event?.resource?.category as keyof typeof CATEGORY_COLORS) || 'default'
      const markerClass = catKeyToClass(catKey)
      return (
        <div className="pointer-events-none">
          <span className="rbc-chip inline-flex items-center gap-2 pointer-events-none">
            <span className={`marker ${markerClass}`} aria-hidden>
              <span className="marker-inner" />
            </span>
            <span className="font-semibold">{titleOnly}</span>
          </span>
        </div>
      )
    }

    // WEB (week view): show only the event title; omit location
    return (
      <div className="flex min-w-0 flex-col">
        <div className="truncate text-[13px] leading-tight font-bold">{titleOnly}</div>
        {isMobile && loc && (
          <div className="truncate text-[12px] text-gray-600 mt-0.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {loc}
          </div>
        )}
      </div>
    )
  }

  const AgendaTime: React.FC<{ event: any }> = ({ event }) => {
    const start: Date = event?.start ? new Date(event.start) : new Date()
    const label = format(start, 'p').toUpperCase()
    const tzFromEvent = event?.resource?.originalEvent?.time_zone?.toString()?.toUpperCase() || ''
    const tzFallback =
      Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).format(start).split(' ').pop()?.toUpperCase() ||
      ''
    const tz = (tzFromEvent || tzFallback).replace('.', '')
    return <span className="text-gray-800 font-semibold text-sm">{label} {tz}</span>
  }

  const components: Components<any> = {
    toolbar: Toolbar as ComponentType<any>,
    event: EventCell as ComponentType<any>,
    agenda: { time: AgendaTime as ComponentType<any> },
  }

  /* ---------- Group filtered events by date (List view) ---------- */
  type Group = { dateKey: string; date: Date; items: any[] }
  const grouped: Group[] = useMemo(() => {
    const map = new Map<string, Group>()
    for (const ev of filteredAgenda) {
      const d = startOfDay(ev.start)
      const key = format(d, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, { dateKey: key, date: d, items: [] })
      map.get(key)!.items.push(ev)
    }
    return Array.from(map.values()).sort((a, b) => +a.date - +b.date)
  }, [filteredAgenda])

  // Virtual scrolling controls
  const [renderCount, setRenderCount] = useState(10)
  const filterKey = `${Array.from(catFilter).sort().join(',')}|${onlyRSVP ? 'R' : ''}${onlySaved ? 'S' : ''}|${query}`
  useEffect(() => setRenderCount(10), [currentDate, filterKey])

  const listRef = useRef<HTMLDivElement>(null)
  const onListScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200
    if (nearBottom) setRenderCount((c) => Math.min(grouped.length, c + 10))
  }, [grouped.length])

  // Pull-to-refresh on mobile list
  usePullToRefresh<HTMLDivElement>(listRef, () => router.refresh())

  const listLoading = loading && grouped.length === 0

  const ListSkeleton = (
    <div className="p-3 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-6 w-40 mb-2 sticky top-0" />
          <div className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )

  /* ---------- Filter Bar (List view only) ---------- */
  const FilterBar = (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-3 py-2">
      <div className="flex flex-col gap-2">
        {/* Month stepper + Search + desktop “Week” + Clear */}
        <div className="flex items-center gap-2">
          {/* Month stepper */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              aria-label="Previous month"
              onClick={() => setCurrentDate((d) => startOfMonth(addMonths(d, -1)))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 text-[15px] font-bold min-w-[9ch] text-center">
              {format(currentDate, 'LLLL yyyy')}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              aria-label="Next month"
              onClick={() => setCurrentDate((d) => startOfMonth(addMonths(d, 1)))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full h-11 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-9 pr-10 text-[14px]"
              aria-label="Search events"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* WEB ONLY: jump back to Week while in List */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                setCurrentView(Views.WEEK)
                setCurrentDate(new Date())
              }}
              aria-label="Switch to week view"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Week
            </Button>
          </div>
        </div>

        {/* Category chips + toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {Array.from(new Set(allCategories)).map((cat) => {
            const active = catFilter.has(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  const next = new Set(catFilter)
                  active ? next.delete(cat) : next.add(cat)
                  setCatFilter(next)
                }}
                className={`h-9 px-3 rounded-full border text-sm font-medium transition ${active
                  ? 'bg-white ring-2 ring-blue-500 border-blue-500'
                  : 'bg-gray-50 hover:bg-white'
                  }`}
                aria-pressed={active}
              >
                <span className="inline-flex items-center gap-2">
                  <span className={`marker ${catKeyToClass(cat)}`} aria-hidden>
                    <span className="marker-inner" />
                  </span>
                  {cat}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  const ListView = (
    <div
      ref={listRef}
      onScroll={onListScroll}
      className="overflow-auto bg-[rgb(248,249,250)]"
      style={{ height: 640 }}
    >
      {FilterBar}

      {listLoading ? (
        ListSkeleton
      ) : grouped.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No events match your filters this month.
          <div className="mt-3">
            <Button
              variant="ghost"
              className="min-h-11 h-11"
              onClick={() => router.refresh()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3">
          {grouped.slice(0, renderCount).map((g) => (
            <div key={g.dateKey} className="mb-6">
              {/* Sticky date header */}
              <div className="sticky top-0 z-10">
                <div className="backdrop-blur bg-white/85 border rounded-xl px-3 py-2 inline-flex items-center gap-2 shadow-sm">
                  <span className="text-sm font-extrabold text-gray-900">
                    {format(g.date, 'EEEE, MMM d')}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {g.items.map((ev) => {
                  const cat = (ev.resource?.category ?? 'default') as keyof typeof CATEGORY_COLORS
                  const markerClass = catKeyToClass(cat)
                  const rsvpd = !!ev.resource?.rsvpd
                  const saved = !!ev.resource?.saved
                  const timeLabel = ev.allDay
                    ? 'All day'
                    : `${to12h(format(ev.start, 'HH:mm'))}${ev.resource?.originalEvent?.time_zone
                      ? ` ${String(ev.resource.originalEvent.time_zone).toUpperCase()}`
                      : ''
                    }`
                  const loc = ev.resource?.location as string | undefined
                  const desc = (ev.resource?.description as string | undefined) || ''
                  const poster =
                    (ev.resource?.originalEvent as any)?.poster_url ||
                    (ev.resource?.originalEvent as any)?.image_url ||
                    (ev.resource?.originalEvent as any)?.poster ||
                    (ev.resource?.originalEvent as any)?.image ||
                    (ev.resource as any)?.poster_url ||
                    (ev.resource as any)?.image_url ||
                    (ev.resource as any)?.poster ||
                    (ev.resource as any)?.image

                  return (
                    <button
                      key={ev.id}
                      onClick={() => router.push(`/events/${ev.id}`)}
                      className="w-full text-left bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 md:py-3 md:px-4"
                    >
                      <div className="flex items-start md:items-start justify-between gap-3">
                        {/* Left: title/meta/desc */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <span className={`marker ${markerClass} mt-1.5`} aria-hidden>
                              <span className="marker-inner" />
                            </span>

                            <div className="min-w-0 flex-1">
                              {/* Title + pills on one row */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base md:text-lg font-extrabold text-gray-900 truncate">
                                  {ev.title}
                                </h3>
                                {rsvpd && (
                                  <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold px-2 py-1 rounded-full bg-green-100">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> RSVP’d
                                  </span>
                                )}
                                {saved && (
                                  <span className="inline-flex items-center gap-1 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full bg-purple-100">
                                    <Bookmark className="h-3.5 w-3.5" /> Saved
                                  </span>
                                )}
                              </div>

                              {/* Meta */}
                              <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1.5 text-[13px] text-gray-600">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {timeLabel}
                                </span>
                                {loc && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {loc}
                                  </span>
                                )}
                              </div>

                              {/* Description preview */}
                              {desc && (
                                <p className="mt-2 text-sm text-gray-700 line-clamp-3">
                                  {desc}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: poster image (mobile + web) */}
                        {poster && (
                          <>
                            {/* mobile image */}
                            <div className="flex md:hidden flex-shrink-0 self-start">
                              <img
                                src={poster}
                                alt={`${ev.title} poster`}
                                className="h-24 w-32 object-cover rounded-lg ml-2 border border-gray-200"
                                loading="lazy"
                              />
                            </div>
                            {/* web image — align to top-left */}
                            <div className="hidden md:flex md:flex-shrink-0 self-start my-1 mr-2">
                              <img
                                src={poster}
                                alt={`${ev.title} poster`}
                                className="block h-[150px] lg:h-[170px] w-auto rounded-xl object-cover border border-gray-200 shadow-sm"
                                loading="lazy"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {renderCount < grouped.length && (
            <div className="flex justify-center py-3">
              <Button
                variant="ghost"
                className="min-h-11 h-11"
                onClick={() => setRenderCount((c) => Math.min(grouped.length, c + 10))}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  /* ---------- RBC Agenda length (not used when we render custom List) ---------- */
  const agendaLength = useMemo(() => {
    if (currentView !== 'agenda') return undefined
    return differenceInCalendarDays(monthEnd, monthStart)
  }, [currentView, monthStart, monthEnd])

  return (
    <div
      className={`google-calendar-container ${dayView ? 'is-day' : ''} ${weekView ? 'is-week' : ''} ${className}`}
    >
      {/* Mobile controls */}
      {MobileControls}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        {currentView === 'agenda' ? (
          ListView
        ) : (
          <Calendar
            localizer={localizer}
            events={baseEvents}
            titleAccessor={(e: any) => e?.title ?? e?.resource?.originalEvent?.title ?? ''}
            view={dayView ? Views.DAY : Views.WEEK}
            onView={(v) => {
              setCurrentView(v)
              if (v === Views.WEEK || v === Views.DAY) setCurrentDate(new Date())
            }}
            onNavigate={(newDate) => setCurrentDate(newDate as Date)}
            date={currentDate}
            views={[Views.WEEK, Views.DAY]}
            components={components}
            eventPropGetter={eventPropGetter}
            dayLayoutAlgorithm="overlap"
            step={30}
            timeslots={2}
            min={new Date(1970, 0, 1, 0, 0)}
            max={new Date(1970, 0, 1, 23, 59)}
            scrollToTime={new Date(1970, 0, 1, 8, 0)}
            selectable={false}
            popup={false}
            showMultiDayTimes
            formats={
              dayView
                ? {
                  eventTimeRangeFormat: () => '',
                  eventTimeRangeStartFormat: () => '',
                  eventTimeRangeEndFormat: () => '',
                }
                : undefined
            }
            onSelectEvent={(ev: any) => {
              const id = ev?.id
              if (id) router.push(`/events/${id}`)
            }}
            style={{
              height: 640,
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          />
        )}
      </div>

      <style jsx global>{`
        .google-calendar-container .rbc-calendar { color: #3c4043; }
        .google-calendar-container .rbc-toolbar { display: none; }

        .google-calendar-container .today-btn { color: var(--primary-color); }
        .google-calendar-container .today-btn:hover { background-color: rgba(0,0,0,.04); }

        .mini-today-outline { 
          box-shadow: 0 0 0 2px var(--primary-color) inset;
          color: var(--primary-color);
        }
        .university-primary-bg { background-color: var(--primary-color) !important; }
        .university-primary-text { color: var(--primary-color) !important; }

        .google-calendar-container .rbc-event { transition: all 0.15s ease; }
        .google-calendar-container .rbc-event:hover {
          box-shadow: 0 3px 12px rgba(60,64,67,.2);
          transform: translateY(-1px);
        }
        .google-calendar-container .rbc-event:active {
          transform: translateY(0);
          box-shadow: 0 1px 3px rgba(60,64,67,.15);
        }

        .google-calendar-container .rbc-header {
          background: #fff;
          border: none;
          border-bottom: 1px solid #dadce0;
          padding: 16px 10px;
          font-weight: 800;
          font-size: 13px;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: .5px;
        }
        .google-calendar-container .rbc-today { 
          background-color: rgba(66, 133, 244, 0.08);
          border-radius: 0;
        }
        .google-calendar-container .rbc-time-view { border: none; }
        .google-calendar-container .rbc-time-header { border-bottom: 2px solid #e8eaed; background: #fff; }
        .google-calendar-container .rbc-time-content { border: none; }
        .google-calendar-container .rbc-time-slot { border-top: 1px solid #f1f3f4; }
        .google-calendar-container .rbc-timeslot-group { border-bottom: 1px solid #dadce0; }
        .google-calendar-container .rbc-day-slot .rbc-time-slot { border-top: 1px solid #f8f9fa; }
        .google-calendar-container .rbc-time-header-gutter,
        .google-calendar-container .rbc-time-gutter { 
          background: #fafbfc; 
          border-right: 2px solid #e8eaed;
          font-weight: 600;
        }
        .google-calendar-container .rbc-time-header-cell { border-left: 1px solid #dadce0; }
        .google-calendar-container .rbc-label { 
          font-size: 12px; 
          color: #5f6368; 
          padding: 8px;
          font-weight: 600; 
        }

        .google-calendar-container.is-day .rbc-event-label,
        .google-calendar-container.is-week .rbc-event-label { display: none; }

        .google-calendar-container.is-day .rbc-chip {
          border-radius: 16px;
          padding: 6px 12px;
          font-weight: 700;
          font-size: 13px;
          line-height: 1.2;
          white-space: nowrap;
          max-width: 100%;
          box-shadow: 0 1px 2px rgba(60, 64, 67, 0.1);
        }
        .google-calendar-container.is-day .rbc-event { background: transparent; box-shadow: none; }
        .google-calendar-container.is-day .rbc-day-slot .rbc-event {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          background: transparent;
          box-shadow: none;
          padding: 0 4px;
          border: none;
          margin-bottom: 2px;
        }
        .google-calendar-container.is-day .rbc-day-slot .rbc-event .rbc-chip {
          margin-right: 6px;
          width: max-content;
        }

        /* Marker (outer + inner). Colors via classes below */
        .marker { 
          display:inline-flex; align-items:center; justify-content:center;
          width:10px; height:10px; border-radius:9999px; background:#E5E7EB;
        }
        .marker .marker-inner { width:8px; height:8px; border-radius:9999px; background:#9CA3AF; }

        .marker-social .marker-inner   { background-color: #A855F7; }
        .marker-academic .marker-inner { background-color: #22C55E; }
        .marker-sports .marker-inner   { background-color: #EF4444; }
        .marker-arts .marker-inner     { background-color: #ec65a8; }

        .google-calendar-container button,
        .google-calendar-container .rbc-btn { min-height: 44px; }

        .google-calendar-container .rbc-time-content { will-change: transform; }
      `}</style>
    </div>
  )
}
