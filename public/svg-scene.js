import { html } from 'https://unpkg.com/htm/preact/standalone.module.js'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

const pathFromSegments = (segments) => {
    if (!segments?.length) return ''
    const moves = [`M ${segments[0].from.x} ${segments[0].from.y}`]
    segments.forEach((segment) => {
        moves.push(`L ${segment.to.x} ${segment.to.y}`)
    })
    return moves.join(' ')
}

const totalLength = (segments) => segments.reduce((sum, segment) => sum + distance(segment.from, segment.to), 0)

const pointAlongSegments = (segments, phase) => {
    const total = totalLength(segments)
    if (total === 0) return null
    const target = total * clamp(phase, 0, 1)
    let traveled = 0
    for (const segment of segments) {
        const length = distance(segment.from, segment.to)
        if (traveled + length >= target) {
            const ratio = (target - traveled) / length
            return {
                x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
                y: segment.from.y + (segment.to.y - segment.from.y) * ratio
            }
        }
        traveled += length
    }
    return segments.at(-1)?.to ?? null
}

const renderBitGlowFilter = () => html`
    <defs>
        <filter id="bitGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>
`

const renderWire = (wire) => {
    const segments = wire.segments || []
    if (!segments.length) return null
    const path = pathFromSegments(segments)
    const length = totalLength(segments) || 1
    const phase = clamp(wire.signal?.phase ?? 0, 0, 1)
    const highlightLength = length * phase
    const style = {
        width: wire.style?.width ?? 8,
        idle: wire.style?.idle ?? '#1b2530',
        active: wire.style?.active ?? '#5ee1a0',
        bitRadius: wire.style?.bitRadius ?? 9
    }
    const isHigh = (wire.signal?.value ?? 0) >= 1
    const bitPoint = isHigh ? pointAlongSegments(segments, phase) : null
    const dashArray = isHigh ? `${highlightLength} ${Math.max(length - highlightLength, 0.0001)}` : null

    return html`
        <g key=${wire.id} class="wire">
            <path
                d=${path}
                fill="none"
                stroke=${style.idle}
                stroke-width=${style.width}
                stroke-linecap="round"
            />
            ${isHigh && html`
                <path
                    d=${path}
                    fill="none"
                    stroke=${style.active}
                    stroke-width=${style.width}
                    stroke-linecap="round"
                    stroke-dasharray=${dashArray}
                />
            `}
            ${bitPoint && html`
                <circle
                    cx=${bitPoint.x}
                    cy=${bitPoint.y}
                    r=${style.bitRadius}
                    fill=${style.active}
                    filter="url(#bitGlow)"
                />
            `}
        </g>
    `
}

const renderPins = (node, color) => {
    if (!node.pins?.length) return null
    return node.pins.map((pin) => html`
        <circle
            key=${pin.id}
            cx=${pin.position.x}
            cy=${pin.position.y}
            r="4"
            fill="#0f141c"
            stroke=${color}
            stroke-width="1.5"
        />
    `)
}

const renderNode = (node, { onToggleNode }) => {
    if (node.type === 'not-gate') {
        return renderNotGate(node)
    }
    const color = colorForType(node.type)
    const isToggle = node.type === 'digital-toggle'
    const hasValue = typeof node.value === 'number'
    const coreFill = hasValue && node.value ? color : '#1b2530'
    const coreRadius = hasValue ? 6 : 4

    return html`
        <g
            key=${node.id}
            class="node"
            cursor=${isToggle ? 'pointer' : 'default'}
            onClick=${isToggle ? () => onToggleNode?.(node) : undefined}
        >
            <circle
                cx=${node.position.x}
                cy=${node.position.y}
                r="11"
                fill="#050607"
                stroke=${color}
                stroke-width="2"
            />
            <circle cx=${node.position.x} cy=${node.position.y} r=${coreRadius} fill=${coreFill} />
            ${renderPins(node, color)}
            ${node.label && html`
                <text
                    x=${node.position.x + 14}
                    y=${node.position.y - 18}
                    fill="#e6e7ef"
                    font-size="13"
                    font-family="'Space Grotesk', system-ui"
                >
                    ${node.label}${hasValue ? ` (${node.value})` : ''}
                </text>
            `}
        </g>
    `
}

const renderNotGate = (node) => {
    const color = colorForType(node.type)
    const outputHigh = node.value === 1
    const size = 34
    const half = size / 2
    const { x, y } = node.position
    const left = x - half
    const right = x + half
    const top = y - half
    const bottom = y + half

    return html`
        <g key=${node.id} class="node gate">
            <path
                d=${`M ${left} ${top} L ${left} ${bottom} L ${right} ${y} Z`}
                fill=${outputHigh ? '#142b1a' : '#050607'}
                stroke=${color}
                stroke-width="2"
            />
            <circle
                cx=${right + 8}
                cy=${y}
                r="5"
                fill=${outputHigh ? color : '#050607'}
                stroke=${color}
                stroke-width="2"
            />
            ${renderPins(node, color)}
            ${node.label && html`
                <text
                    x=${x - 10}
                    y=${y - half - 10}
                    fill="#e6e7ef"
                    font-size="12"
                    font-family="'Space Grotesk', system-ui"
                    text-anchor="middle"
                >
                    ${node.label}
                </text>
            `}
        </g>
    `
}

const colorForType = (type) => {
    switch (type) {
        case 'digital-toggle':
            return '#6decb9'
        case 'binary-display':
            return '#7fc8ff'
        case 'not-gate':
            return '#f6d365'
        case 'junction':
            return '#f6d365'
        default:
            return '#c7c9d3'
    }
}

const renderPlaceholder = (width, height, progress) => {
    const margin = 40
    const startX = margin
    const endX = width - margin
    const y = height / 2
    const eased = 0.5 * (1 - Math.cos(Math.PI * clamp(progress, 0, 1)))
    const traveledX = startX + (endX - startX) * eased

    return html`
        <g class="placeholder">
            <line
                x1=${startX}
                y1=${y}
                x2=${endX}
                y2=${y}
                stroke="#1b2530"
                stroke-width="8"
                stroke-linecap="round"
            />
            <line
                x1=${startX}
                y1=${y}
                x2=${traveledX}
                y2=${y}
                stroke="#5ee1a0"
                stroke-width="8"
                stroke-linecap="round"
            />
            <circle cx=${traveledX} cy=${y} r="10" fill="#5ee1a0" filter="url(#bitGlow)" />
        </g>
    `
}

export const SceneSvg = ({ scene, width = 900, height = 420, progress = 0, onToggleNode }) => {
    const hasWires = Boolean(scene?.wires?.length)
    return html`
        <svg
            viewBox=${`0 0 ${width} ${height}`}
            width=${width}
            height=${height}
            style=${{
                width: '100%',
                height: 'auto',
                maxWidth: `${width}px`,
                display: 'block',
                background: '#050607',
                borderRadius: '20px',
                border: '1px solid #101828'
            }}
        >
            ${renderBitGlowFilter()}
            ${hasWires
                ? scene.wires.map((wire) => renderWire(wire))
                : renderPlaceholder(width, height, progress)}
            ${scene?.nodes?.map((node) => renderNode(node, { onToggleNode }))}
        </svg>
    `
}
