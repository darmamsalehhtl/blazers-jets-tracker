import { urls } from '../../lib/espn'
import { timeAgo } from '../../lib/format'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { Empty, ErrorBox, Spinner } from '../ui'

interface NewsResponse {
  articles: {
    headline: string
    description?: string
    published?: string
    byline?: string
    type?: string
    images?: { url: string }[]
    links?: { web?: { href?: string } }
  }[]
}

export function TeamNews({ team }: { team: TeamConfig }) {
  const { data, error } = usePoll<NewsResponse>(urls.news(team), IDLE_MS)
  if (error && !data) return <ErrorBox error={error} />
  if (!data) return <Spinner />
  if (!data.articles.length) return <Empty>No news right now.</Empty>
  return (
    <ul className="space-y-2">
      {data.articles.map((a, i) => (
        <li key={i}>
          <a
            href={a.links?.web?.href}
            target="_blank"
            rel="noreferrer"
            className="flex gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-surface-2"
          >
            {a.images?.[0]?.url && <img src={a.images[0].url} alt="" loading="lazy" className="h-20 w-28 shrink-0 rounded-lg object-cover" />}
            <div className="min-w-0">
              <div className="line-clamp-2 text-sm font-semibold">{a.headline}</div>
              {a.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.description}</p>}
              <div className="mt-1 text-[11px] text-muted">
                {a.type === 'Media' ? 'Video · ' : ''}
                {a.byline ? `${a.byline} · ` : ''}
                {a.published ? timeAgo(new Date(a.published)) : ''}
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}
