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

    // REVISE move to model layer and add tests
    const findPinInRangeForWire = (point, wire, pinType) => {
        let [pin, position, closestDistance] = [null, null, Infinity]        
        for (const [componentId, pins] of pinRegistry.current.entries()) {
            const matchingPins = pins.map(p => ({...p, pin: circuit.getPin(componentId, p.id)}))
                .filter(entry => entry.pin.type === pinType)
                .filter(entry => (pinType === 'output' || !circuit.wires.find(w => w.targetPin === entry.pin && w !== wire)))
            
            for (const p of matchingPins) {
                const distance = Math.hypot(p.x - point.x, p.y - point.y)
                if (distance < closestDistance) {
                    [pin, position, closestDistance] = [circuit.getPin(componentId, p.id), { x: p.x, y: p.y }, distance]
                }
            }
        }
        return closestDistance <= SNAP_DISTANCE ? { pin, position } : { pin: undefined, position: point }
    }

    const snapWireEndpoint = (point, wire, endpointKey) => {
        const pinInRange = findPinInRangeForWire(point, wire, endpointKey === 'source' ? 'output' : 'input')
        wire[endpointKey === 'source' ? 'sourcePin' : 'targetPin'] = pinInRange.pin
        return snapToGrid(pinInRange.position)
    }

    const toSvgPoint = (x, y) => new DOMPoint(x, y).matrixTransform(svg.current.getScreenCTM().inverse())

    const pointerDown = (event, element) => {
        event.preventDefault()
        if (event.button === 0 && element) {
            if (element.type) {
                // node
                const startPoint = toSvgPoint(event.clientX, event.clientY)
                const offset = { x: startPoint.x - element.position.x, y: startPoint.y - element.position.y }
                const connectedWireHeads = circuit.findConnectedWireHeads(element)
                selection.current = { startPoint, offset, element, connectedWireHeads }
            }
            else {
                // wire
                const startPoint = toSvgPoint(event.clientX, event.clientY)
                const offsetFrom = { x: startPoint.x - element.from.x, y: startPoint.y - element.from.y }
                const offsetTo = { x: startPoint.x - element.to.x, y: startPoint.y - element.to.y }
                const isDraggingFrom = Math.hypot(startPoint.x - element.from.x, startPoint.y - element.from.y) < 10
                const isDraggingTo = Math.hypot(startPoint.x - element.to.x, startPoint.y - element.to.y) < 10
                selection.current = { startPoint, element, offsetFrom, offsetTo, isDraggingFrom, isDraggingTo }
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

            selection.current.isDragging = true

            if (selection.current.element.type) {
                // component
                const comp = selection.current.element
                comp.position = snapToGrid({ x: point.x - selection.current.offset.x, y: point.y - selection.current.offset.y })
                selection.current.connectedWireHeads.forEach(({ wireHead, pinId }) => {
                    const pinPosition = pinRegistry.current.get(comp.id).find(pin => pin.id === pinId)
                    wireHead.x = pinPosition.x
                    wireHead.y = pinPosition.y
                })
            } else {
                // wire
                const wire = selection.current.element
                if (selection.current.isDraggingFrom || !selection.current.isDraggingTo) {
                    wire.from = snapWireEndpoint({ x: point.x - selection.current.offsetFrom.x, y: point.y - selection.current.offsetFrom.y }, wire, 'source')
                }
                if (selection.current.isDraggingTo || !selection.current.isDraggingFrom) {
                    wire.to = snapWireEndpoint({ x: point.x - selection.current.offsetTo.x, y: point.y - selection.current.offsetTo.y }, wire, 'target')
                }
            }
            setCircuit(new Circuit({ components: circuit.components, wires: circuit.wires }))
        } else if (event.buttons & 2) {
            // pan
            const client = svg.current.getBoundingClientRect()
            const scale = Math.max(viewBox.width / client.width, viewBox.height / client.height)
            setViewBox((prev) => {
                return { ...prev, x: prev.x - event.movementX * scale, y: prev.y - event.movementY * scale }
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
                <${WirePath} from=${wire.from} sourcePin=${wire.sourcePin} to=${wire.to} targetPin=${wire.targetPin} />
            </g>
            `)}
        </svg>
    `
}
