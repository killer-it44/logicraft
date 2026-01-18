// Selection module: rubberband selection using Pointer Events
// API: init({ container, getSelectable, onSelectionChange, longPressMs }) -> { enable, disable, destroy, enabled }
export function initSelection({ container, getSelectable, onSelectionChange, longPressMs = 0 } = {}) {
    let enabled = false
    let start = null
    let overlay = null
    let raf = null
    let longPressTimeout = null
    let implicitEnabled = false // allow implicit mouse-initiated selection when not explicitly enabled

    // NOTE: do not attach pointerdown here because `onPointerDown` is declared later.
    // We'll attach the listener after the handler is defined.

    const makeOverlay = () => {
        const d = document.createElement('div')
        Object.assign(d.style, {
            position: 'fixed',
            border: '1px solid rgba(59,130,246,0.9)',
            background: 'rgba(59,130,246,0.12)',
            zIndex: 9999,
            pointerEvents: 'none'
        })
        return d
    }

    const rectFromPoints = (p0, p1) => {
        const x = Math.min(p0.x, p1.x)
        const y = Math.min(p0.y, p1.y)
        const w = Math.abs(p1.x - p0.x)
        const h = Math.abs(p1.y - p0.y)
        return { x, y, w, h }
    }

    const intersects = (rA, rB) => !(rA.left > rB.x + rB.w || rA.right < rB.x || rA.top > rB.y + rB.h || rA.bottom < rB.y)

    const onPointerDown = (e) => {
        // allow implicit selection start on desktop (mouse) even when not explicitly enabled
        const isPrimary = !e.button || e.button === 0
        if (!isPrimary) return

        const clickedOnSelectable = e.target.closest && e.target.closest('.selectable')
        const insideContainer = (e.target === container) || container.contains(e.target)

        if (!enabled) {
            // implicit allowed only for mouse and when clicking empty canvas inside container
            if (e.pointerType !== 'mouse' || clickedOnSelectable || !insideContainer) return
            implicitEnabled = true
        }

        // don't start when clicking on selectable elements (app handles their drag)
        if (clickedOnSelectable) return
        // if the pointerdown target is not the container itself, bail
        if (!insideContainer) return

        // start selection
        start = { x: e.clientX, y: e.clientY }
        overlay = makeOverlay()
        document.body.appendChild(overlay)
        e.target.setPointerCapture?.(e.pointerId)

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp, { once: true })
        e.preventDefault()
    }

    const updateOverlay = (p) => {
        if (!start || !overlay) return
        const r = rectFromPoints(start, p)
        overlay.style.left = r.x + 'px'
        overlay.style.top = r.y + 'px'
        overlay.style.width = r.w + 'px'
        overlay.style.height = r.h + 'px'
    }

    const onPointerMove = (e) => {
        if (!start) return
        if (raf) cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => updateOverlay({ x: e.clientX, y: e.clientY }))
    }

    const onPointerUp = (e) => {
        if (!start) return
        if (raf) cancelAnimationFrame(raf)
        const rect = rectFromPoints(start, { x: e.clientX, y: e.clientY })
        const elements = Array.from(getSelectable())
        const selected = []
        elements.forEach(el => {
            const r = el.getBoundingClientRect()
            if (intersects(r, rect)) {
                selected.push(el)
            } else {
                el.classList.remove('selected')
            }
        })
        selected.forEach(el => el.classList.add('selected'))
        // map to minimal info (id + item) so caller can resolve to model objects
        const infos = selected.map(el => ({ id: el.getAttribute('data-id'), item: el.getAttribute('data-item') }))
        onSelectionChange?.(infos, e)

        overlay.remove()
        overlay = null
        start = null
        window.removeEventListener('pointermove', onPointerMove)
    }

    const enable = () => {
        if (enabled) return
        enabled = true
    }

    const disable = () => {
        if (!enabled) return
        enabled = false
        if (overlay) { overlay.remove(); overlay = null }
        start = null
        implicitEnabled = false
    }

    const destroy = () => {
        disable()
        try { container.removeEventListener('pointerdown', onPointerDown) } catch (e) {}
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
    }

    // always listen for pointerdown so we can start implicit selection on desktop
    try { if (container && container.addEventListener) container.addEventListener('pointerdown', onPointerDown) } catch (e) {}

    // optionally provide long-press to enable selection mode (handled by app by toggling enable()/disable())
    return { enable, disable, destroy, get enabled() { return enabled } }
}

export default { initSelection }
