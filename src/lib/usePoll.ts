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

/**
 * Fetch `url` and re-fetch every `interval` ms (null = fetch once). `interval`
 * can be a function of the latest data, e.g. fast while a game is live.
 * Polling pauses while the tab is hidden and catches up when it's shown.
 */
export function usePoll<T>(
  url: string | null,
  interval: number | null | ((data: T | undefined) => number | null) = null,
): PollState<T> {
  const [data, setData] = useState<T>()
  const intervalMs = typeof interval === 'function' ? interval(data) : interval
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(!!url)
  const [updatedAt, setUpdatedAt] = useState<Date>()
  const ctrl = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!url) return
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    try {
      const json = await getJSON<T>(url, c.signal)
      if (c.signal.aborted) return
      setData(json)
      setError(undefined)
      setUpdatedAt(new Date())
    } catch (e) {
      if (c.signal.aborted) return
      setError(e as Error)
    } finally {
      if (!c.signal.aborted) setLoading(false)
    }
  }, [url])

  // Reset when the URL changes so old data never shows under a new view.
  useEffect(() => {
    setData(undefined)
    setError(undefined)
    setLoading(!!url)
    load()
    return () => ctrl.current?.abort()
  }, [url, load])

  useEffect(() => {
    if (!url || !intervalMs) return
    let id: number | undefined
    const start = () => {
      stop()
      id = window.setInterval(load, intervalMs)
    }
    const stop = () => id !== undefined && window.clearInterval(id)
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

  return { data, error, loading, updatedAt, refresh: load }
}
