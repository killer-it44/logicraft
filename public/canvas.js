import { html, useRef, useState, useEffect } from 'preact-standalone'
import { ToggleNode, NotGateNode, AndGateNode, OrGateNode, NandGateNode, NorGateNode, XorGateNode, XnorGateNode, DisplayProbeNode, WirePath } from './ui-components.js'

const GRID_SPACING = 10
const INITIAL_VIEWBOX = { x: 0, y: 0, width: 800, height: 480 }
const ZOOM_SPEED = 1.07
const MIN_WIDTH = INITIAL_VIEWBOX.width / 10
const MAX_WIDTH = INITIAL_VIEWBOX.width * 10

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const snapToGrid = ({ x, y }) => ({
    x: Math.round(x / GRID_SPACING) * GRID_SPACING,
    y: Math.round(y / GRID_SPACING) * GRID_SPACING
})

// REVISE very likely it will be better if we don't separate wires and components in the blueprint into different object categories
const emptyBlueprint = { circuit: { components: [], wires: [] }, visualization: { components: [], wires: [] } }

// REVISE use keys for updating of the state to avoid unnecessary re-renders
export function Canvas({ onPointerMove }) {
    const svg = useRef()
    const selectedElement = useRef()
    const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)
    const [blueprint, setBlueprint] = useState(emptyBlueprint)

    useEffect(() => {
        fetch('/demo-blueprint.json').then(res => res.json()).then(data => setBlueprint(data))
    }, [])

    const toSvgPoint = (x, y) => new DOMPoint(x, y).matrixTransform(svg.current.getScreenCTM().inverse())

    const move = (event) => {
        const point = toSvgPoint(event.clientX, event.clientY)
        onPointerMove(point)

        if (selectedElement.current) {
            // drag
            const startPoint = selectedElement.current.startPoint
            const distance = Math.hypot(startPoint.x - point.x, startPoint.y - point.y)
            if (distance <= 10) return

            // FIXME when dragging out of the window, we should scroll the viewbox accordingly
            selectedElement.current.isDragging = true
            const delta = { x: point.x - startPoint.x, y: point.y - startPoint.y }

            const comp = blueprint.visualization.components.find(c => c.id === selectedElement.current.componentId)
            if (comp) {
                // node
                comp.position = snapToGrid({ x: comp.position.x + delta.x, y: comp.position.y + delta.y })
            } else {
                // wire
                const wire = blueprint.visualization.wires.find(c => c.id === selectedElement.current.componentId)
                if (selectedElement.current.isDraggingFrom || !selectedElement.current.isDraggingTo) {
                    wire.from = snapToGrid({ x: wire.from.x + delta.x, y: wire.from.y + delta.y })
                }
                if (selectedElement.current.isDraggingTo || !selectedElement.current.isDraggingFrom) {
                    wire.to = snapToGrid({ x: wire.to.x + delta.x, y: wire.to.y + delta.y })
                }
            }
            selectedElement.current.startPoint = snapToGrid(point)
            setBlueprint({ ...blueprint })
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

    const pointerDown = (event, comp) => {
        event.preventDefault()
        // REVISE not good how we hassle around with wires vs. components, naming is also quite confusing: for ui-components we say "nodes" and "wires", but for model we say "components" and "wires" 
        if (event.button === 0 && comp) {
            if (comp.type) {
                // node
                const startPoint = toSvgPoint(event.clientX, event.clientY)
                const component = blueprint.visualization.components.find(c => c.id === comp.id)
                const offset = snapToGrid({ x: startPoint.x - component.position.x, y: startPoint.y - component.position.y })
                selectedElement.current = { startPoint, offset, componentId: component.id }
            }
            else {
                // wire
                const startPoint = toSvgPoint(event.clientX, event.clientY)
                const wire = blueprint.visualization.wires.find(c => c.id === comp.id)
                const isDraggingFrom = Math.hypot(startPoint.x - wire.from.x, startPoint.y - wire.from.y) < 10
                const isDraggingTo = Math.hypot(startPoint.x - wire.to.x, startPoint.y - wire.to.y) < 10
                selectedElement.current = { startPoint, componentId: wire.id, isDraggingFrom, isDraggingTo }
            }
        }
    }

    const pointerUp = () => {
        if (selectedElement.current && !selectedElement.current.isDragging) {
            // click (only for components of type toggle source)
            const comp = blueprint.circuit.components.find(c => c.id === selectedElement.current.componentId)
            if (comp && comp.type === 'source/toggle') {
                comp.active = !comp.active
                setBlueprint({ ...blueprint })
            }
        }
        selectedElement.current = undefined
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

    const components = blueprint.circuit.components.map(comp => {
        const Component = {
            'source/toggle': ToggleNode,
            'gate/not': NotGateNode,
            'gate/and': AndGateNode,
            'gate/or': OrGateNode,
            'gate/nand': NandGateNode,
            'gate/nor': NorGateNode,
            'gate/xor': XorGateNode,
            'gate/xnor': XnorGateNode,
            'probe/display': DisplayProbeNode
        }[comp.type]
        const compVis = blueprint.visualization.components.find(c => c.id === comp.id)
        return html`
            <g key=${comp.id} onPointerDown=${(event) => pointerDown(event, comp)}>
                <${Component} id=${comp.id} label=${compVis.label} position=${compVis.position} active=${comp.active} />
            </g>
        `
    })

    const wires = blueprint.circuit.wires.map(wire => {
        const wireVis = blueprint.visualization.wires.find(w => w.id === wire.id)
        return html`
            <g key=${wire.id} onPointerDown=${(event) => pointerDown(event, wire)}>
                <${WirePath} from=${wireVis.from} to=${wireVis.to} />
            </g>
        `
    })

    return html`
        <svg
            ref=${svg}
            width="100%"
            height="100%"
            viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}"
            onPointerDown=${pointerDown}
            onPointerMove=${move}
            onPointerUp=${pointerUp}
            onPointerCancel=${pointerUp}
            onWheel=${wheel}
            onContextMenu=${(e) => e.preventDefault()}
        >
            <defs>
                <pattern id="grid-pattern" width=${GRID_SPACING} height=${GRID_SPACING} patternUnits="userSpaceOnUse">
                    <path d=${`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`} fill="none" stroke="#cbd5f5" stroke-width="1" />
                </pattern>
            </defs>
            <rect x=${-MAX_WIDTH} y=${-MAX_WIDTH} width=${MAX_WIDTH * 2} height=${MAX_WIDTH * 2} fill="url(#grid-pattern)" />

            ${components}
            ${wires}
        </svg>
    `
}
