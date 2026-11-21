/** Poet portrait in a mihrab arch with a gold rule; the first letter shows until (or instead of) the image. */
export function Arch({ src, name = '', class: cls = '', eager }) {
  return (
    <span class={'arch ' + cls} aria-hidden="true">
      <span class="arch-in">
        {name.trim().charAt(0)}
        {src && <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} onError={(e) => (e.currentTarget.hidden = true)} />}
      </span>
    </span>
  )
}
