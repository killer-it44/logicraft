import { html, useRef, useState, useEffect } from 'preact-standalone'
import Circuit from './circuit.js'
import { ToggleNode, NotGateNode, AndGateNode, OrGateNode, NandGateNode, NorGateNode, XorGateNode, XnorGateNode, DisplayProbeNode, WirePath } from './ui-components.js'

const GRID_SPACING = 10
const INITIAL_VIEWBOX = { x: 0, y: 0, width: 800, height: 480 }
const ZOOM_SPEED = 1.07
const MIN_WIDTH = INITIAL_VIEWBOX.width / 10
const MAX_WIDTH = INITIAL_VIEWBOX.width * 10
const SNAP_DISTANCE = 10

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const snapToGrid = ({ x, y }) => ({
    x: Math.round(x / GRID_SPACING) * GRID_SPACING,
    y: Math.round(y / GRID_SPACING) * GRID_SPACING
})

const Components = {
    'source/toggle': ToggleNode,
    'gate/not': NotGateNode,
    'gate/and': AndGateNode,
    'gate/or': OrGateNode,
    'gate/nand': NandGateNode,
    'gate/nor': NorGateNode,
    'gate/xor': XorGateNode,
    'gate/xnor': XnorGateNode,
    'probe/display': DisplayProbeNode
}

// FIXME dragging snapped wires and components should unsnap

export function Canvas({ onPointerMove }) {
    const svg = useRef()
    const selection = useRef()
    const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)
    const [circuit, setCircuit] = useState(new Circuit({ components: [], wires: [] }))
    const pinRegistry = useRef(new Map())

    useEffect(() => {
        svg.current.addEventListener('wheel', wheel, { passive: true })
        fetch('/demo-circuit.json').then(res => res.json()).then(data => setCircuit(Circuit.fromJSON(data)))
        return () => svg.current.removeEventListener('wheel', wheel)
    }, [])

    // TODO right now our wires have a direction from source to target, but for snapping it would be better if we can drag either endpoint to either input or output pins, but of course respecting the directionality, i.e. cannot connect both endpoints to outputs or both endpoints to inputs
    const findPinInRange = (point, pinType) => {
        let [id, position, closestDistance] = [null, null, Infinity]
        for (const [componentId, pins] of pinRegistry.current.entries()) {
            for (const pin of pins.filter(p => circuit.getPin(componentId, p.id).type === pinType)) {
                const distance = Math.hypot(pin.x - point.x, pin.y - point.y)
                if (distance < closestDistance) {
                    [id, position, closestDistance] = [`${componentId}/${pin.id}`, { x: pin.x, y: pin.y }, distance]
                }
            }
        }
        return id && closestDistance <= SNAP_DISTANCE ? { id, position } : { id: undefined, position: point }
    }

    const snapWireEndpoint = (point, wire, endpointKey) => {
        const pinInRange = findPinInRange(point, endpointKey === 'source' ? 'output' : 'input')
        wire[endpointKey] = pinInRange.id
        return snapToGrid(pinInRange.position)
    }

    const toSvgPoint = (x, y) => new DOMPoint(x, y).matrixTransform(svg.current.getScreenCTM().inverse())

    const pointerDown = (event, element) => {
        event.preventDefault()
        if (event.button === 0 && element) {
            if (element.type) {
                // node
                const startPoint = toSvgPoint(event.clientX, event.clientY)
                selection.current = { startPoint, element }
            }
            else {
                // wire
                const startPoint = toSvgPoint(event.clientX, event.clientY)
                const isDraggingFrom = Math.hypot(startPoint.x - element.from.x, startPoint.y - element.from.y) < 10
                const isDraggingTo = Math.hypot(startPoint.x - element.to.x, startPoint.y - element.to.y) < 10
                selection.current = { startPoint, element, isDraggingFrom, isDraggingTo }
            }
        }
    }

    const move = (event) => {
        const point = toSvgPoint(event.clientX, event.clientY)
        onPointerMove(point)

        if (selection.current) {
            // drag
            const startPoint = selection.current.startPoint
            if (!selection.current.isDragging && Math.hypot(startPoint.x - point.x, startPoint.y - point.y) <= 10) return

            // FIXME when the component got snapped, it gets harder and harder to unsnapp while staying in dragging mode, the pointer moves further and further away
            selection.current.isDragging = true
            const delta = { x: point.x - startPoint.x, y: point.y - startPoint.y }

            if (selection.current.element.type) {
                // component
                const comp = selection.current.element
                comp.position = snapToGrid({ x: comp.position.x + delta.x, y: comp.position.y + delta.y })
            } else {
                // wire
                const wire = selection.current.element
                if (selection.current.isDraggingFrom || !selection.current.isDraggingTo) {
                    wire.from = snapWireEndpoint({ x: wire.from.x + delta.x, y: wire.from.y + delta.y }, wire, 'source')
                }
                if (selection.current.isDraggingTo || !selection.current.isDraggingFrom) {
                    wire.to = snapWireEndpoint({ x: wire.to.x + delta.x, y: wire.to.y + delta.y }, wire, 'target')
                }
            }
            selection.current.startPoint = snapToGrid(point)
            setCircuit(new Circuit({ components: circuit.components, wires: circuit.wires }))
        } else if (event.buttons & 2) {
            // pan
            // FIXME positioning on move is bit off when our window has a different aspect ratio than the viewbox, the cursor alwyas moves faster than the element in the direction of the larger dimension
            const rect = svg.current.getBoundingClientRect()
            setViewBox((prev) => {
                const scaleX = prev.width / rect.width
                const scaleY = prev.height / rect.height
                return { ...prev, x: prev.x - event.movementX * scaleX, y: prev.y - event.movementY * scaleY }
            })
        }
    }

    const pointerUp = () => {
        if (selection.current && !selection.current.isDragging) {
            // click (only for components of type toggle source)
            if (selection.current.element.type === 'source/toggle') {
                selection.current.element.active = !selection.current.element.active
                setCircuit(new Circuit({ components: circuit.components, wires: circuit.wires }))
            }
        }
        selection.current = undefined
    }

    const wheel = (event) => {
        setViewBox((prev) => {
            if (event.ctrlKey || event.metaKey) {
                // zoom
                const svgPoint = toSvgPoint(event.clientX, event.clientY)
                const scale = event.deltaY > 0 ? ZOOM_SPEED : 1 / ZOOM_SPEED
                const actualScale = clamp(prev.width * scale, MIN_WIDTH, MAX_WIDTH) / prev.width
                const x = svgPoint.x - (svgPoint.x - prev.x) * actualScale
                const y = svgPoint.y - (svgPoint.y - prev.y) * actualScale
                return { x, y, width: prev.width * actualScale, height: prev.height * actualScale }
            } else {
                // pan
                const scale = prev.width / INITIAL_VIEWBOX.width
                return { ...prev, x: prev.x + event.deltaX * scale, y: prev.y + event.deltaY * scale }
            }
        })
    }

    return html`
        <svg ref=${svg} width="100%" height="100%" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}"
            onPointerDown=${pointerDown} onPointerMove=${move} onPointerUp=${pointerUp} onPointerCancel=${pointerUp} onContextMenu=${(e) => e.preventDefault()}
        >
            <defs>
                <pattern id="grid-pattern" width=${GRID_SPACING} height=${GRID_SPACING} patternUnits="userSpaceOnUse">
                    <path d=${`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`} fill="none" stroke="#cbd5f5" stroke-width="1" />
                </pattern>
            </defs>
            <rect x=${-MAX_WIDTH} y=${-MAX_WIDTH} width=${MAX_WIDTH * 2} height=${MAX_WIDTH * 2} fill="url(#grid-pattern)" />

            ${circuit.components.map(comp => html`
            <g key=${comp.id} onPointerDown=${(event) => pointerDown(event, comp)}>
                <${Components[comp.type]} id=${comp.id} label=${comp.label} position=${comp.position} active=${comp.active} pinRegistry=${pinRegistry.current} />
            </g>
            `)}

            ${circuit.wires.map(wire => html`
            <g key=${wire.id} onPointerDown=${(event) => pointerDown(event, wire)}>
                <${WirePath} from=${wire.from} to=${wire.to} />
            </g>
            `)}
        </svg>
    `
}
