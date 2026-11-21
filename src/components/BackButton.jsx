import { useLocation } from 'preact-iso'
import { Icon } from './Icon.jsx'

/** Back inside the app when there is an earlier page of ours (Navigation API), otherwise up to `fallback`. */
export function BackButton({ fallback, label = 'بازگشت', class: cls = 'icon-btn' }) {
  const { route } = useLocation()
  return (
    <button type="button" class={cls} aria-label={label} onClick={() => (globalThis.navigation?.canGoBack ? history.back() : route(fallback))}>
      <Icon name="chevron" size={22} />
    </button>
  )
}
