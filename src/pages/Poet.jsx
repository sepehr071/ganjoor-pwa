import { useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { getPoet, poetImage } from '../api.js'
import { useAsync, useTitle, share } from '../lib/hooks.js'
import { compactYears } from '../lib/poets.js'
import { Arch } from '../components/Arch.jsx'
import { Icon } from '../components/Icon.jsx'
import { BackButton } from '../components/BackButton.jsx'
import { Shamseh } from '../components/Ornament.jsx'
import { Loading, ErrorState, Empty } from '../components/Status.jsx'

const HAFEZ = 2

export default function Poet({ id }) {
  const [more, setMore] = useState(false)
  const { data, error, loading, retry } = useAsync((signal) => getPoet(id, { signal }), [id])
  const poet = data?.poet
  const name = poet?.nickname || poet?.name
  useTitle(name)

  const hero = (
    <div class="poet-hero lapis">
      <div class="hero-btns wrap">
        <BackButton fallback="/poets" class="round-btn glass" />
        {poet && (
          <button type="button" class="round-btn glass" aria-label={`هم\u200cرسانی صفحهٔ ${name}`}
            onClick={() => share({ title: name, text: `${poet.name} در بیت`, url: location.origin + url('/poet/' + poet.id) })}>
            <Icon name="share" size={20} />
          </button>
        )}
      </div>
    </div>
  )
  if (loading || error || !poet) {
    return (
      <div class="poet-page">
        {hero}
        <div class="poet-body wrap">{loading ? <Loading /> : error ? <ErrorState error={error} onRetry={retry} /> : <Empty>این شاعر پیدا نشد.</Empty>}</div>
      </div>
    )
  }

  const books = data.cat?.children || []
  const bio = data.cat?.description || poet.description || ''
  const years = compactYears(poet, ' تا ')

  return (
    <div class="poet-page">
      {hero}
      <div class="poet-body wrap stack-lg">
        <header class="poet-head">
          <Arch src={poetImage(poet)} name={name} class="xl" eager />
          <h1 class="display">{name}</h1>
          {poet.nickname && poet.name !== poet.nickname && <p class="muted">{poet.name}</p>}
          {(years || poet.birthPlace) && (
            <p class="chips">
              {years && <span class="chip static">{years}</span>}
              {poet.birthPlace && <span class="chip static">{poet.birthPlace}</span>}
            </p>
          )}
        </header>

        <div class="poet-actions">
          <a class="btn poet-search" href={url(`/search?poet=${poet.id}`)}><Icon name="search" size={18} />جستجو در آثار</a>
          <a class="btn primary" href={url(`/random?poet=${poet.id}`)}><Icon name="repeat" size={18} />یک شعر از {name}</a>
          {poet.id === HAFEZ ? (
            <a class="btn gold" href={url('/faal')}><Shamseh class="btn-art" />فال حافظ</a>
          ) : (
            data.cat && <a class="btn gold" href={url('/words/' + data.cat.id)}>واژه{'\u200c'}های پرتکرار</a>
          )}
        </div>

        {bio && (
          <section class="card bio" aria-labelledby="bio-h">
            <h2 id="bio-h" class="sr-only">دربارهٔ شاعر</h2>
            <p class={more ? '' : 'clamp'}>{bio}</p>
            {bio.length > 160 && (
              <button type="button" class="btn link" aria-expanded={more} onClick={() => setMore(!more)}>
                {more ? 'کمتر' : 'ادامهٔ زندگی\u200cنامه'}
              </button>
            )}
          </section>
        )}

        <section aria-labelledby="books-h">
          <h2 id="books-h" class="section-title">کتاب{'\u200c'}ها و بخش{'\u200c'}ها</h2>
          {books.length ? (
            <>
              <a class="book-feature lapis" href={url('/cat/' + books[0].id)}>
                <span>{books[0].title}</span>
                <Icon name="chevron" size={18} class="flip" />
              </a>
              {books.length > 1 && (
                <ul class="book-grid">
                  {books.slice(1).map((b) => (
                    <li key={b.id}>
                      <a class="list-link book" href={url('/cat/' + b.id)}>
                        <span class="rosette" aria-hidden="true" />
                        <span class="list-main list-title">{b.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <Empty>برای این شاعر بخشی ثبت نشده است.</Empty>
          )}
        </section>
      </div>
    </div>
  )
}
