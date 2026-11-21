import { Icon } from './Icon.jsx'
import { url } from '../lib/base.js'

/** One poem in a list. `poet` and `meta` are optional second-line text. */
export function PoemRow({ id, title, poet, excerpt, onRemove }) {
  return (
    <li>
      <div class="list-item-actions">
        <a class="list-link list-main" href={url('/poem/' + id)}>
          <div class="list-main">
            <div class="list-title">{title}</div>
            {(poet || excerpt) && (
              <div class="list-sub">
                {poet}
                {poet && excerpt ? '، ' : ''}
                {excerpt}
              </div>
            )}
          </div>
        </a>
        {onRemove && (
          <button type="button" class="btn icon ghost" onClick={onRemove} aria-label={`حذف ${title}`}>
            <Icon name="close" size={20} />
          </button>
        )}
      </div>
    </li>
  )
}
