import { useCallback, useEffect, useRef, useState } from 'react'
import { getJSON } from './espn'

export const LIVE_MS = 20_000
export const IDLE_MS = 5 * 60_000

export interface PollState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  updatedAt: Date | undefined
  refresh: () => void
}

interface Result<T> {
  /** The URL this result was fetched from. */
  url: string
  data?: T
  error?: Error
  updatedAt?: Date
}

/**
 * Fetch `url` and re-fetch every `interval` ms (null = fetch once). `interval`
 * can be a function of the latest data, e.g. fast while a game is live.
 * Polling pauses while the tab is hidden and catches up when it's shown.
 *
 * Results are tagged with the URL they came from and only returned for that
 * URL, so when a view switches (e.g. Jets → Blazers) it never renders the
 * previous view's data, not even for the one render before the refetch starts.
 */
export function usePoll<T>(
  url: string | null,
  interval: number | null | ((data: T | undefined) => number | null) = null,
): PollState<T> {
  const [result, setResult] = useState<Result<T> | null>(null)
  const current = result && result.url === url ? result : null
  const data = current?.data
  const intervalMs = typeof interval === 'function' ? interval(data) : interval
  const ctrl = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!url) return
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    try {
      const json = await getJSON<T>(url, c.signal)
      if (!c.signal.aborted) setResult({ url, data: json, updatedAt: new Date() })
    } catch (e) {
      // Keep showing the last good data for this URL if a refresh fails.
      if (!c.signal.aborted) setResult((r) => ({ ...(r?.url === url ? r : {}), url, error: e as Error }))
    }
  }, [url])

  useEffect(() => {
    load()
    return () => ctrl.current?.abort()
  }, [load])

  useEffect(() => {
    if (!url || !intervalMs) return
    let id: number | undefined
    const stop = () => id !== undefined && window.clearInterval(id)
    const start = () => {
      stop()
      id = window.setInterval(load, intervalMs)
    }
    const onVis = () => {
      if (document.hidden) stop()
      else {
        load()
        start()
      }
    }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [url, intervalMs, load])

  return {
    data,
    error: current?.error,
    loading: !!url && !current,
    updatedAt: current?.updatedAt,
    refresh: load,
  }
}
