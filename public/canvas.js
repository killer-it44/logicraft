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

// REVISE return the object directly
const componentRenderers = {
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

const emptyBlueprint = { circuit: { components: [], wires: [] }, visualization: { components: [], wires: [] } }

export function Canvas({ onPointerMove }) {
    const svg = useRef(null)
    const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)
    const [dragInfo, setDragInfo] = useState(null)
    const [blueprint, setBlueprint] = useState(emptyBlueprint)

    useEffect(() => {
        fetch('/demo-blueprint.json').then(res => res.json()).then(data => setBlueprint(data))
    }, [])

    const toSvgPoint = (x, y) => {
        const pt = svg.current.createSVGPoint()
        pt.x = x
        pt.y = y
        const ctm = svg.current.getScreenCTM()
        if (!ctm) return null
        return pt.matrixTransform(ctm.inverse())
    }

    const move = (event) => {
        const svgPoint = toSvgPoint(event.clientX, event.clientY)
        onPointerMove(svgPoint)
        if (!dragInfo) return

        const snapped = snapToGrid(svgPoint)
        dragInfo.component.position.x = snapped.x - dragInfo.offsetX
        dragInfo.component.position.y = snapped.y - dragInfo.offsetY
        // REVISE maybe this can be made prettier, it's not obvious how the dragInfo relates to the blueprint
        //          it is needed as otherwise Preact won't re-render (we're currently just "lucky" to get a re-render from the onPointerMove)
        setBlueprint({ ...blueprint })
    }

    // REVISE check if the pointerId / pointerCapture is really needed, and why
    const startDrag = (event, comp) => {
        if (event.button !== 0) return
        event.preventDefault()
        const svgPoint = snapToGrid(toSvgPoint(event.clientX, event.clientY))
        const component = blueprint.visualization.components.find(c => c.id === comp.id)
        setDragInfo({
            pointerId: event.pointerId,
            // REVISE very likely it will be better if we don't separate wires and components in the blueprint into different object categories
            offsetX: svgPoint.x - component.position.x,
            offsetY: svgPoint.y - component.position.y,
            component
        })
        svg.current.setPointerCapture(event.pointerId)
    }

    const endDrag = (event) => {
        if (!dragInfo || dragInfo.pointerId !== event.pointerId) return
        svg.current.releasePointerCapture(event.pointerId)
        setDragInfo(null)
    }

    const wheel = (event) => {
        event.preventDefault()
        const svgPoint = toSvgPoint(event.clientX, event.clientY)

        setViewBox((prev) => {
            if (event.ctrlKey || event.metaKey) {
                // zoom
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

    const vb = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`

    const components = blueprint.circuit.components.map(comp => {
        const Renderer = componentRenderers[comp.type]
        const position = blueprint.visualization.components.find(c => c.id === comp.id).position
        return html`
            <g onPointerDown=${(event) => startDrag(event, comp)}>
                <${Renderer} id=${comp.id} label=${comp.label} position=${position} active=${comp.active} />
            </g>
        `
    })

    return html`
        <svg
            ref=${svg}
            width="100%"
            height="100%"
            viewBox=${vb}
            onPointerMove=${move}
            onPointerUp=${endDrag}
            onPointerCancel=${endDrag}
            onWheel=${wheel}
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
