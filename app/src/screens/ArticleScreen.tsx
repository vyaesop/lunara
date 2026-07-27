import { useLiveQuery } from 'dexie-react-hooks'
import { articleBySlug } from '../content/articles'
import { db } from '../db/schema'
import { localToday } from '../lib/dates'

export function ArticleScreen({ slug, onClose }: { slug: string; onClose: () => void }) {
  const article = articleBySlug(slug)
  const saved = useLiveQuery(() => db.contentBookmarks.get(slug), [slug])

  if (!article) return null

  async function toggleSave() {
    if (saved) await db.contentBookmarks.delete(slug)
    else await db.contentBookmarks.put({ slug, savedAt: localToday() })
  }

  return (
    <div className="overlay">
      <div className="overlay-head">
        <button className="back-btn" onClick={onClose} aria-label="Back">
          ‹
        </button>
        <h2>{article.category}</h2>
        <button className="back-btn" onClick={toggleSave} aria-label="Save">
          {saved ? '★' : '☆'}
        </button>
      </div>
      <div className="overlay-body">
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>{article.title}</h1>
        <p className="muted" style={{ margin: '8px 0 20px' }}>
          {article.minutes} min read
        </p>
        {article.body.map((p, i) => (
          <p key={i} style={{ lineHeight: 1.6, marginBottom: 16, fontSize: 16 }}>
            {p}
          </p>
        ))}
        <p className="muted" style={{ marginTop: 12 }}>
          Educational content only — not medical advice. Talk to a clinician about your health.
        </p>
      </div>
    </div>
  )
}
