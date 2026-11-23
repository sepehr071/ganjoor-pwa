import { useEffect, useRef } from 'preact/hooks'

/**
 * Bottom sheet on a native modal <dialog>: the platform gives the focus trap, Escape, the backdrop, inert page and
 * focus return. Closes on a backdrop tap, on the handle, and when a link inside it is followed.
 */
export function Sheet({ open, onClose, onNavigate, label, class: cls = '', children }) {
  const ref = useRef(null)
  const swipe = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      class={'sheet ' + cls}
      aria-label={label}
      onClose={(e) => e.target === ref.current && open && onClose()}
      onClick={(e) => {
        if (e.target.closest('dialog') !== ref.current) return
        const link = e.target.closest('a[href]')
        if (link && onNavigate && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
          e.preventDefault()
          e.stopPropagation()
          onNavigate(link.pathname + link.search + link.hash)
        } else if (e.target === ref.current || link) onClose()
      }}
      onTouchStart={(e) => {
        swipe.current = e.touches.length === 1 && ref.current.scrollTop <= 0 &&
          e.target.closest('dialog') === ref.current && !e.target.closest('input,textarea,select')
          ? e.touches[0] : null
      }}
      onTouchCancel={() => { swipe.current = null }}
      onTouchEnd={(e) => {
        const start = swipe.current
        swipe.current = null
        if (!start || e.changedTouches[0].identifier !== start.identifier) return
        const dy = e.changedTouches[0].clientY - start.clientY
        if (dy > 64 && dy > Math.abs(e.changedTouches[0].clientX - start.clientX) * 1.5 && ref.current.scrollTop <= 0) onClose()
      }}
    >
      <div class="sheet-body">
        <button type="button" class="sheet-handle" onClick={onClose}>بستن</button>
        {open && children}
      </div>
    </dialog>
  )
}
