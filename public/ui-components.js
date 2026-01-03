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

const fillColor = (active) => active ? '#22c55e' : '#f87171'
const lineColor = (active) => active ? '#047857' : '#b91c1c'

export const ToggleNode = ({ id, label, position, active }) => {
    const trackW = 80, trackH = 40, trackR = trackH / 2, knobR = trackR - 5
    const knobX = (active ? trackW - trackR : trackR)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} font-family=${FONT_FAMILY} font-size="16" font-weight="600" stroke-width="3">
            <text y="-8" text-anchor="left">${label}</text>
            <rect width=${trackW} height=${trackH} rx=${trackR} ry=${trackR} fill=${fillColor(active)} stroke=${lineColor(active)} />
            <circle cx=${knobX} cy=${trackR} r=${knobR} fill="#f8fafc" stroke=${lineColor(active)} />
            <text x=${knobX} y=${trackR + 2} font-size="12" text-anchor="middle" dominant-baseline="middle">${active ? '✓' : 'X'}</text>
        </g>
    `
}

export const NotGateNode = ({ id, label = 'NOT', position, active = false }) => {
    const stroke = lineColor(active)
    const fill = fillColor(active)
    const inputY = 20, startX = 0, tipX = 30, bubbleRadius = 5
    const bubbleCenterX = tipX + bubbleRadius
    const outputX = bubbleCenterX + bubbleRadius + 10

    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} font-family=${FONT_FAMILY} font-size="16" font-weight="600" stroke-width="3">
            <text y="-8" text-anchor="left">${label}</text>
            <g fill=${fill} stroke=${stroke}>
                <line x1="-10" y1=${inputY} x2=${startX} y2=${inputY} />
                <path d=${`M${startX} 0 L${startX} 40 L${tipX} ${inputY} Z`} />
                <circle cx=${bubbleCenterX} cy=${inputY} r=${bubbleRadius} />
                <line x1=${bubbleCenterX + bubbleRadius} y1=${inputY} x2=${outputX} y2=${inputY} />
            </g>
        </g>
    `
}

export const AndGateNode = ({ id, label = 'AND', position }) => {
    const accent = '#0f172a'
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id}>
            ${cardBackdrop({ fill: '#e0f2fe', stroke: accent })}
            <path
                d="M24 16 H70 Q100 32 70 48 H24 Z"
                fill="#0f172a"
                opacity="0.15"
                stroke="#0f172a"
                stroke-width="3"
            />
            ${labelText(label, NODE_WIDTH, accent)}
        </g>
    `
}

export const OrGateNode = ({ id, label = 'OR', position }) => {
    const accent = '#b45309'
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id}>
            ${cardBackdrop({ fill: '#e0f2fe', stroke: accent })}
            <path
                d="M24 16 C44 16 60 24 78 32 C60 40 44 48 24 48 C34 48 70 48 94 32 C70 16 34 16 24 16 Z"
                fill="#f97316"
                opacity="0.18"
                stroke="#b45309"
                stroke-width="3"
            />
            ${labelText(label, NODE_WIDTH, accent)}
        </g>
    `
}

export const NandGateNode = ({ id, label = 'NAND', position }) => {
    const accent = '#2563eb'
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id}>
            ${cardBackdrop({ fill: '#e0f2fe', stroke: accent })}
            <path
                d="M24 16 H70 Q100 32 70 48 H24 Z"
                fill="#2563eb"
                opacity="0.12"
                stroke="#2563eb"
                stroke-width="3"
            />
            <circle cx="98" cy="32" r="6" fill="#e0f2fe" stroke="#2563eb" stroke-width="3" />
            ${labelText(label, NODE_WIDTH, accent)}
        </g>
    `
}

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
