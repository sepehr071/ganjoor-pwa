import { useEffect, useRef } from 'preact/hooks'

/**
 * Bottom sheet on a native modal <dialog>: the platform gives the focus trap, Escape, the backdrop, inert page and
 * focus return. Closes on a backdrop tap, on the handle, and when a link inside it is followed.
 */
export function Sheet({ open, onClose, label, class: cls = '', children }) {
  const ref = useRef(null)
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
      onClose={onClose}
      onClick={(e) => (e.target === e.currentTarget || e.target.closest?.('a[href]')) && onClose()}
    >
      <div class="sheet-body">
        <button type="button" class="sheet-handle" aria-label="بستن" onClick={onClose} />
        {open && children}
      </div>
    </dialog>
  )
}
