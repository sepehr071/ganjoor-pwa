import { Icon } from './Icon.jsx'
import { url } from '../lib/base.js'

/** One poem in a list. The collection layout gives excerpts their own line. */
export function PoemRow({ id, title, poet, excerpt, collection = false, onRemove, removeLabel = `حذف ${title}` }) {
  return (
    <li>
      <div class="list-item-actions">
        <a class="list-link list-main" href={url('/poem/' + id)}>
          <div class="list-main">
            <div class="list-title">{title}</div>
            {collection ? (
              <>
                {poet && <div class="list-sub">{poet}</div>}
                {excerpt && <p class="saved-excerpt">{excerpt}</p>}
              </>
            ) : (poet || excerpt) && (
              <div class="list-sub">
                {poet}
                {poet && excerpt ? '، ' : ''}
                {excerpt}
              </div>
            )}
          </div>
        </a>
        {onRemove && (
          <button type="button" class="btn icon ghost" onClick={onRemove} aria-label={removeLabel}>
            <Icon name="close" size={20} />
          </button>
        )}
      </div>
    </li>
  )
}
