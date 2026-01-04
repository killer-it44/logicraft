import { html, useRef, useState, useEffect } from 'preact-standalone'
import { ToggleNode, NotGateNode, AndGateNode, OrGateNode, NandGateNode, NorGateNode, XorGateNode, XnorGateNode, DisplayProbeNode } from './ui-components.js'

const GRID_SPACING = 20
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

export function Canvas({ onPointerMove }) {
    const svg = useRef()
    const selectedElement = useRef()
    const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)
    const [blueprint, setBlueprint] = useState(emptyBlueprint)

    useEffect(() => {
        fetch('/demo-blueprint.json').then(res => res.json()).then(data => setBlueprint(data))
    }, [])

    // REVISE use keys for updating of the state to avoid unnecessary re-renders

    const toSvgPoint = (x, y) => new DOMPoint(x, y).matrixTransform(svg.current.getScreenCTM().inverse())

    const move = (event) => {
        const point = toSvgPoint(event.clientX, event.clientY)
        onPointerMove(point)
       
        if (selectedElement.current) {
            // drag
            const startPoint = selectedElement.current.startPoint
            const distance = Math.hypot(startPoint.x - point.x, startPoint.y - point.y)
            if (distance <= 10) return
    
            selectedElement.current.isDragging = true
            const snapped = snapToGrid(point)
            const comp = blueprint.visualization.components.find(c => c.id === selectedElement.current.componentId)
            comp.position.x = snapped.x - selectedElement.current.offset.x
            comp.position.y = snapped.y - selectedElement.current.offset.y
            setBlueprint({ ...blueprint })
        } else if (event.buttons & 2) {
            // pan
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
        if (event.button === 0 && comp) {
            const startPoint = toSvgPoint(event.clientX, event.clientY)
            const component = blueprint.visualization.components.find(c => c.id === comp.id)
            const offset = snapToGrid({ x: startPoint.x - component.position.x, y: startPoint.y - component.position.y })
            selectedElement.current = { startPoint, offset, componentId: component.id }
        }
    }

    const pointerUp = () => {
        if (selectedElement.current && !selectedElement.current.isDragging) {
            // click
            const comp = blueprint.circuit.components.find(c => c.id === selectedElement.current.componentId)
            if (comp.type === 'source/toggle') {
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
        const position = blueprint.visualization.components.find(c => c.id === comp.id).position
        return html`
            <g key=${comp.id} onPointerDown=${(event) => pointerDown(event, comp)}>
                <${Component} id=${comp.id} label=${comp.label} position=${position} active=${comp.active} />
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
        </svg>
    `
}
