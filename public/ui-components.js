import { html } from 'preact-standalone'

const FONT_FAMILY = 'Space Grotesk, sans-serif'
const NODE_WIDTH = 120
const NODE_HEIGHT = 64
const NODE_RADIUS = 12

const labelText = (text, width, color = '#0f172a') => html`
    <text
        x=${width / 2}
        y=${NODE_HEIGHT / 2 + 18}
        fill=${color}
        font-family=${FONT_FAMILY}
        font-size="14"
        text-anchor="middle"
    >${text}</text>
`

const cardBackdrop = ({ width = NODE_WIDTH, height = NODE_HEIGHT, fill, stroke = '#0f172a' }) => html`
    <rect
        width=${width}
        height=${height}
        rx=${NODE_RADIUS}
        ry=${NODE_RADIUS}
        fill=${fill}
        stroke=${stroke}
        stroke-width="2"
    />
`

export const ToggleNode = ({ id, label = 'Toggle', position, activated = false }) => {
    const bodyFill = activated ? '#34d399' : '#fca5a5'
    const indicatorFill = activated ? '#065f46' : '#7f1d1d'

    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id}>
            ${cardBackdrop({ fill: bodyFill })}
            <circle
                cx=${NODE_WIDTH - 18}
                cy=${NODE_HEIGHT / 2}
                r="8"
                fill=${indicatorFill}
                stroke="#0f172a"
                stroke-width="2"
            />
            <text
                x=${NODE_WIDTH / 2}
                y=${NODE_HEIGHT / 2}
                fill="#0f172a"
                font-family=${FONT_FAMILY}
                font-size="18"
                font-weight="600"
                text-anchor="middle"
                dominant-baseline="middle"
            >${label}</text>
        </g>
    `
}

const gateShell = ({ id, position, children, label, accent = '#0f172a' }) => html`
    <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id}>
        ${cardBackdrop({ fill: '#e0f2fe', stroke: accent })}
        ${children}
        ${labelText(label, NODE_WIDTH, accent)}
    </g>
`

export const NotGateNode = ({ id, label = 'NOT', position }) => gateShell({
    id,
    position,
    label,
    accent: '#1d4ed8',
    children: html`
        <path
            d="M24 48 L24 16 L84 32 Z"
            fill="#3b82f6"
            opacity="0.2"
            stroke="#1d4ed8"
            stroke-width="3"
        />
        <circle cx="95" cy="32" r="6" fill="#e0f2fe" stroke="#1d4ed8" stroke-width="3" />
    `
})

export const AndGateNode = ({ id, label = 'AND', position }) => gateShell({
    id,
    position,
    label,
    accent: '#0f172a',
    children: html`
        <path
            d="M24 16 H70 Q100 32 70 48 H24 Z"
            fill="#0f172a"
            opacity="0.15"
            stroke="#0f172a"
            stroke-width="3"
        />
    `
})

export const OrGateNode = ({ id, label = 'OR', position }) => gateShell({
    id,
    position,
    label,
    accent: '#b45309',
    children: html`
        <path
            d="M24 16 C44 16 60 24 78 32 C60 40 44 48 24 48 C34 48 70 48 94 32 C70 16 34 16 24 16 Z"
            fill="#f97316"
            opacity="0.18"
            stroke="#b45309"
            stroke-width="3"
        />
    `
})

export const NandGateNode = ({ id, label = 'NAND', position }) => gateShell({
    id,
    position,
    label,
    accent: '#2563eb',
    children: html`
        <path
            d="M24 16 H70 Q100 32 70 48 H24 Z"
            fill="#2563eb"
            opacity="0.12"
            stroke="#2563eb"
            stroke-width="3"
        />
        <circle cx="98" cy="32" r="6" fill="#e0f2fe" stroke="#2563eb" stroke-width="3" />
    `
})

export const DisplayProbeNode = ({ id, label = 'Probe', position, value = 0 }) => {
    const bodyFill = value ? '#fde68a' : '#e5e7eb'
    const textColor = value ? '#92400e' : '#374151'

    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id}>
            ${cardBackdrop({ fill: bodyFill })}
            <text
                x=${NODE_WIDTH / 2}
                y=${NODE_HEIGHT / 2}
                fill=${textColor}
                font-family=${FONT_FAMILY}
                font-size="28"
                font-weight="700"
                text-anchor="middle"
                dominant-baseline="middle"
            >${value}</text>
            ${labelText(label, NODE_WIDTH, textColor)}
        </g>
    `
}

const segmentsToPolyline = (segments = []) => {
    if (!segments.length) return ''
    const points = [segments[0].from]
    segments.forEach((segment) => {
        points.push(segment.to)
    })
    return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export const WirePath = ({ id, segments, active = false }) => {
    const strokeColor = active ? '#f97316' : '#94a3b8'
    return html`
        <polyline
            points=${segmentsToPolyline(segments)}
            fill="none"
            stroke=${strokeColor}
            stroke-width=${active ? 4 : 3}
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity=${active ? 0.95 : 0.7}
            data-wire-id=${id}
        />
    `
}
