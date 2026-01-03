import { html, useRef, useState } from 'preact-standalone'

const GRID_SPACING = 20
const INITIAL_VIEWBOX = { x: 0, y: 0, width: 800, height: 480 }
const ZOOM_SPEED = 1.07
const MIN_WIDTH = INITIAL_VIEWBOX.width / 10
const MAX_WIDTH = INITIAL_VIEWBOX.width * 10

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export function Canvas({ children, onPointerMove }) {
    const svg = useRef(null)
    const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)

    const toSvgPoint = (x, y) => {
        const pt = svg.current.createSVGPoint()
        pt.x = x
        pt.y = y
        const ctm = svg.current.getScreenCTM()
        if (!ctm) return null
        return pt.matrixTransform(ctm.inverse())
    }

    const move = (event) => {
        onPointerMove(toSvgPoint(event.clientX, event.clientY))
    }

    const wheel = (event) => {
        event.preventDefault()
        
        const svgPoint = toSvgPoint(event.clientX, event.clientY)
        
        setViewBox((prev) => {
            if (event.ctrlKey || event.metaKey) {
                // zoom
                const scale = event.deltaY > 0 ? ZOOM_SPEED : 1 / ZOOM_SPEED
                const actualScale = clamp(prev.width * scale, MIN_WIDTH, MAX_WIDTH) / prev.width
                return {
                    x: svgPoint.x - (svgPoint.x - prev.x) * actualScale,
                    y: svgPoint.y - (svgPoint.y - prev.y) * actualScale,
                    width: prev.width * actualScale,
                    height: prev.height * actualScale
                }
            } else {
                // pan
                const scale = prev.width / INITIAL_VIEWBOX.width
                return {
                    ...prev,
                    x: prev.x + event.deltaX * scale,
                    y: prev.y + event.deltaY * scale
                }
            }
        })
    }

    const vb = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`

    return html`
        <svg ref=${svg} width="100%" height="100%" viewBox=${vb} onPointerMove=${move} onWheel=${wheel}>
            <defs>
                <pattern id="grid-pattern" width=${GRID_SPACING} height=${GRID_SPACING} patternUnits="userSpaceOnUse">
                    <path d=${`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`} fill="none" stroke="#cbd5f5" stroke-width="1" />
                </pattern>
            </defs>
            <rect x=${-MAX_WIDTH} y=${-MAX_WIDTH} width=${MAX_WIDTH * 2} height=${MAX_WIDTH * 2} fill="url(#grid-pattern)" />
            ${children}
        </svg>
    `
}