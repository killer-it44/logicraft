import { html } from 'preact-standalone'

const FONT_FAMILY = 'Space Grotesk, sans-serif'
const NODE_WIDTH = 120
const NODE_HEIGHT = 64
const NODE_RADIUS = 12

// TODO normalize units to grid
// TODO check if id handling through data-component-id is even needed / beneficial
// TODO kickout cardBackdrop and labelText
// TODO simplify wirepath, no need to use segments, just use points and translate to svg path

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
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} stroke-width="3">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="16" font-weight="600">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <rect width=${trackW} height=${trackH} rx=${trackR} ry=${trackR} />
                <circle cx=${knobX} cy=${trackR} r=${knobR} fill="#f8fafc" />
                <text x=${knobX} y=${trackR + 2} text-anchor="middle" dominant-baseline="middle" font-family=${FONT_FAMILY}>
                    ${active ? '✔' : 'X'}
                </text>
            </g>
        </g>
    `
}

export const NotGateNode = ({ id, label, position, active }) => {
    const inputY = 20, startX = 0, tipX = 30, bubbleRadius = 5
    const bubbleCenterX = tipX + bubbleRadius
    const outputX = bubbleCenterX + bubbleRadius + 10

    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} stroke-width="3">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="16" font-weight="600">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <path d=${`M${startX} 0 L${startX} 40 L${tipX} ${inputY} Z`} />
                <line x1="-10" y1=${inputY} x2=${startX} y2=${inputY} />
                <circle cx=${bubbleCenterX} cy=${inputY} r=${bubbleRadius} />
                <line x1=${bubbleCenterX + bubbleRadius} y1=${inputY} x2=${outputX} y2=${inputY} />
            </g>
        </g>
    `
}

export const AndGateNode = ({ id, label, position, active = false }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} stroke-width="3">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="16" font-weight="600">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <path d="M 0 0 L 20 0 A 10 10 0 0 1 20 40 L 0 40 L 0 0 Z" />
                <line x1="-10" y1="10" x2="0" y2="10" />
                <line x1="-10" y1="30" x2="0" y2="30" />
                <line x1="40" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const OrGateNode = ({ id, label, position, active = false }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} stroke-width="3">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="16" font-weight="600">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <path d="M 0 0 L 20 0 A 10 10 0 0 1 20 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <line x1="-10" y1="10" x2="10" y2="10" />
                <line x1="-10" y1="30" x2="10" y2="30" />
                <line x1="40" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const NandGateNode = ({ id, label, position, active = false }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} stroke-width="3">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="16" font-weight="600">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <path d="M 0 0 L 15 0 A 15 15 0 0 1 15 40 L 0 40 L 0 0 Z" />
                <line x1="-10" y1="10" x2="0" y2="10" />
                <line x1="-10" y1="30" x2="0" y2="30" />
                <circle cx="40" cy="20" r="5" />
                <line x1="45" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const NorGateNode = ({ id, label, position, active = false }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} stroke-width="3">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="16" font-weight="600">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <path d="M 0 0 L 15 0 A 15 15 0 0 1 15 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <line x1="-10" y1="10" x2="10" y2="10" />
                <line x1="-10" y1="30" x2="10" y2="30" />
                <circle cx="40" cy="20" r="5" />
                <line x1="45" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const XorGateNode = ({ id, label, position, active = false }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} stroke-width="3">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="16" font-weight="600">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <path d="M 0 0 L 20 0 A 10 10 0 0 1 20 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <path d="M -5 2.5 A 6 10 0 0 1 -5 37.5" fill="none" />
                <line x1="-10" y1="10" x2="3" y2="10" />
                <line x1="-10" y1="30" x2="3" y2="30" />
                <line x1="40" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const XnorGateNode = ({ id, label, position, active = false }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} data-component-id=${id} stroke-width="3">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="16" font-weight="600">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <path d="M 0 0 L 15 0 A 15 15 0 0 1 15 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <path d="M -5 2.5 A 6 10 0 0 1 -5 37.5" fill="none" />
                <line x1="-10" y1="10" x2="3" y2="10" />
                <line x1="-10" y1="30" x2="3" y2="30" />
                <circle cx="40" cy="20" r="5" />
                <line x1="45" y1="20" x2="50" y2="20" />
            </g>
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
