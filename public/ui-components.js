import { html } from 'preact-standalone'

const FONT_FAMILY = 'Space Grotesk, sans-serif'
const fillColor = (active) => active ? '#22c55e' : '#f87171'
const lineColor = (active) => active ? '#047857' : '#b91c1c'
const inputPinRadius = 3
const outputPinRadius = 2

export const ToggleNode = ({ label, position, active }) => {
    const trackW = 40, trackH = 20, trackR = trackH / 2, knobR = trackR - 2.5
    const knobX = (active ? trackW - trackR : trackR)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <rect width=${trackW} height=${trackH} rx=${trackR} ry=${trackR} />
                <line x1="40" y1="10" x2="50" y2="10" />
                <circle stroke-width="0" cx="50" cy="10" r=${outputPinRadius} />
                <circle cx=${knobX} cy=${trackR} r=${knobR} fill="#f8fafc" />
                <text style="user-select: none;" x=${knobX} y=${trackR + 1} text-anchor="middle" dominant-baseline="middle" font-family=${FONT_FAMILY} font-size="10" stroke-width="1">
                    ${active ? '✔' : 'X'}
                </text>
            </g>
        </g>
    `
}
ToggleNode.pinPositions = { out: { x: 50, y: 10 } }

export const ClockNode = ({ label, position, active }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <line x1="20" y1="10" x2="30" y2="10" />
                <circle cx="10" cy="10" r="10" />
                <circle stroke-width="0" cx="30" cy="10" r=${outputPinRadius} />
                <path d="M 4 14 H 8 V 6 H 12 V 14 H 16" />
            </g>
        </g>
    `
}
ClockNode.pinPositions = { out: { x: 30, y: 10 } }

export const NotGateNode = ({ label, position, active }) => {
    const pinY = 10, startX = 0, height = 20, tipX = 20, bubbleRadius = 5
    const bubbleCenterX = tipX + bubbleRadius
    const outputX = bubbleCenterX + bubbleRadius + 10

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d=${`M${startX} 0 L${startX} ${height} L${tipX} ${pinY} Z`} />
                <circle cx=${bubbleCenterX} cy=${pinY} r=${bubbleRadius} />
                <line x1="-10" y1=${pinY} x2=${startX} y2=${pinY} />
                <circle stroke-width="0" cx=-10 cy=${pinY} r=${inputPinRadius} />
                <line x1=${bubbleCenterX + bubbleRadius} y1=${pinY} x2=${outputX} y2=${pinY} />
                <circle stroke-width="0" cx=${outputX} cy=${pinY} r=${outputPinRadius} />
            </g>
        </g>
    `
}
NotGateNode.pinPositions = { in: { x: -10, y: 10 }, out: { x: 40, y: 10 } }

export const AndGateNode = ({ label, position, active }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 20 0 A 10 10 0 0 1 20 40 L 0 40 L 0 0 Z" />
                <line x1="-10" y1="10" x2="0" y2="10" />
                <circle stroke-width="0" cx="-10" cy="10" r=${inputPinRadius} />
                <line x1="-10" y1="30" x2="0" y2="30" />
                <circle stroke-width="0" cx="-10" cy="30" r=${inputPinRadius} />
                <line x1="40" y1="20" x2="50" y2="20" />
                <circle stroke-width="0" cx="50" cy="20" r=${outputPinRadius} />
            </g>
        </g>
    `
}
AndGateNode.pinPositions = { in0: { x: -10, y: 10 }, in1: { x: -10, y: 30 }, out: { x: 50, y: 20 } }

export const OrGateNode = ({ label, position, active }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`} stroke-width="2">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <path d="M 0 0 L 20 0 A 10 10 0 0 1 20 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <line x1="-10" y1="10" x2="10" y2="10" />
                <circle stroke-width="0" cx="-10" cy="10" r=${inputPinRadius} />
                <line x1="-10" y1="30" x2="10" y2="30" />
                <circle stroke-width="0" cx="-10" cy="30" r=${inputPinRadius} />
                <line x1="40" y1="20" x2="50" y2="20" />
                <circle stroke-width="0" cx="50" cy="20" r=${outputPinRadius} />
            </g>
        </g>
    `
}
OrGateNode.pinPositions = { in0: { x: -10, y: 10 }, in1: { x: -10, y: 30 }, out: { x: 50, y: 20 } }

export const NandGateNode = ({ label, position, active }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 15 0 A 15 15 0 0 1 15 40 L 0 40 L 0 0 Z" />
                <line x1="-10" y1="10" x2="0" y2="10" />
                <circle stroke-width="0" cx="-10" cy="10" r=${inputPinRadius} />
                <line x1="-10" y1="30" x2="0" y2="30" />
                <circle stroke-width="0" cx="-10" cy="30" r=${inputPinRadius} />
                <circle cx="40" cy="20" r="5" />
                <line x1="45" y1="20" x2="50" y2="20" />
                <circle stroke-width="0" cx="50" cy="20" r=${outputPinRadius} />
            </g>
        </g>
    `
}
NandGateNode.pinPositions = { in0: { x: -10, y: 10 }, in1: { x: -10, y: 30 }, out: { x: 50, y: 20 } }

export const NorGateNode = ({ label, position, active }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 15 0 A 15 15 0 0 1 15 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <line x1="-10" y1="10" x2="10" y2="10" />
                <circle stroke-width="0" cx="-10" cy="10" r=${inputPinRadius} />
                <line x1="-10" y1="30" x2="10" y2="30" />
                <circle stroke-width="0" cx="-10" cy="30" r=${inputPinRadius} />
                <circle cx="40" cy="20" r="5" />
                <line x1="45" y1="20" x2="50" y2="20" />
                <circle stroke-width="0" cx="50" cy="20" r=${outputPinRadius} />
            </g>
        </g>
    `
}
NorGateNode.pinPositions = { in0: { x: -10, y: 10 }, in1: { x: -10, y: 30 }, out: { x: 50, y: 20 } }

export const XorGateNode = ({ label, position, active }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 20 0 A 10 10 0 0 1 20 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <path d="M -5 3 A 6 10 0 0 1 -5 37" fill="none" />
                <line x1="-10" y1="10" x2="3" y2="10" />
                <circle stroke-width="0" cx="-10" cy="10" r=${inputPinRadius} />
                <line x1="-10" y1="30" x2="3" y2="30" />
                <circle stroke-width="0" cx="-10" cy="30" r=${inputPinRadius} />
                <line x1="40" y1="20" x2="50" y2="20" />
                <circle stroke-width="0" cx="50" cy="20" r=${outputPinRadius} />
            </g>
        </g>
    `
}
XorGateNode.pinPositions = { in0: { x: -10, y: 10 }, in1: { x: -10, y: 30 }, out: { x: 50, y: 20 } }

export const XnorGateNode = ({ label, position, active }) => {
    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 15 0 A 15 15 0 0 1 15 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <path d="M -5 3 A 6 10 0 0 1 -5 37" fill="none" />
                <line x1="-10" y1="10" x2="3" y2="10" />
                <circle stroke-width="0" cx="-10" cy="10" r=${inputPinRadius} />
                <line x1="-10" y1="30" x2="3" y2="30" />
                <circle stroke-width="0" cx="-10" cy="30" r=${inputPinRadius} />
                <circle cx="40" cy="20" r="5" />
                <line x1="45" y1="20" x2="50" y2="20" />
                <circle stroke-width="0" cx="50" cy="20" r=${outputPinRadius} />
            </g>
        </g>
    `
}
XnorGateNode.pinPositions = { in0: { x: -10, y: 10 }, in1: { x: -10, y: 30 }, out: { x: 50, y: 20 } }

export const DisplayProbeNode = ({ label, position, active }) => {
    const width = 20, height = 20, borderRadius = height / 4

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <rect width=${width} height=${height} rx=${borderRadius} ry=${borderRadius} />
                <line x1="-10" y1=${height / 2} x2="0" y2=${height / 2} />
                <circle stroke-width="0" cx="-10" cy=${height / 2} r=${inputPinRadius} />
                <text style="user-select: none;" x=${width / 2} y=${height / 2} text-anchor="middle" dominant-baseline="middle" font-family=${FONT_FAMILY} font-size="14" stroke-width="2">
                    ${active ? 1 : 0}
                </text>
            </g>
        </g>
    `
}
DisplayProbeNode.pinPositions = { in: { x: -10, y: 10 } }

export const WirePath = ({ from, sourcePin, to, targetPin, active }) => {
    const points = [from, to].map((p) => `${p.x},${p.y}`).join(' ')

    return html`
        <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="1">
            <polyline points=${points} fill="none" stroke="white" opacity="0" stroke-width="10"/>
            <polyline points=${points} fill="none" stroke-width=${active ? 3 : 2} />
            <circle fill=${!sourcePin ? 'white' : lineColor(active)} stroke=${!sourcePin ? 'black' : lineColor(active)} cx=${from.x} cy=${from.y} r=${outputPinRadius} />
            <circle fill=${!targetPin ? 'white' : lineColor(active)} stroke=${!targetPin ? 'black' : lineColor(active)} cx=${to.x} cy=${to.y} r=${inputPinRadius} />
        </g>
    `
}
