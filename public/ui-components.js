import { html, useLayoutEffect, useMemo } from 'preact-standalone'

const FONT_FAMILY = 'Space Grotesk, sans-serif'
const fillColor = (active) => active ? '#22c55e' : '#f87171'
const lineColor = (active) => active ? '#047857' : '#b91c1c'

const useRegisterPins = (id, pinRegistry, pins) => {
    useLayoutEffect(() => {
        pinRegistry.set(id, pins)
        return () => pinRegistry.delete(id)
    }, [pins])
}

export const ToggleNode = ({ id, label, position, active, pinRegistry }) => {
    const trackW = 40, trackH = 20, trackR = trackH / 2, knobR = trackR - 2.5
    const knobX = (active ? trackW - trackR : trackR)

    const pins = useMemo(() => [
        { id: 'out', x: position.x + trackW + 10, y: position.y + trackR }
    ], [position.x, position.y])

    useRegisterPins(id, pinRegistry, pins)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <rect width=${trackW} height=${trackH} rx=${trackR} ry=${trackR} />
                <line x1="40" y1="10" x2="50" y2="10" />
                <circle cx=${knobX} cy=${trackR} r=${knobR} fill="#f8fafc" />
                <text style="user-select: none;" x=${knobX} y=${trackR + 1} text-anchor="middle" dominant-baseline="middle" font-family=${FONT_FAMILY} font-size="10" stroke-width="1">
                    ${active ? '✔' : 'X'}
                </text>
            </g>
        </g>
    `
}

export const NotGateNode = ({ id, label, position, active, pinRegistry }) => {
    const inputY = 10, startX = 0, height = 20, tipX = 15, bubbleRadius = 5
    const bubbleCenterX = tipX + bubbleRadius
    const outputX = bubbleCenterX + bubbleRadius + 10

    const pins = useMemo(() => [
        { id: 'in', x: position.x - 10, y: position.y + inputY },
        { id: 'out', x: position.x + outputX, y: position.y + inputY }
    ], [position.x, position.y])

    useRegisterPins(id, pinRegistry, pins)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d=${`M${startX} 0 L${startX} ${height} L${tipX} ${inputY} Z`} />
                <line x1="-10" y1=${inputY} x2=${startX} y2=${inputY} />
                <circle cx=${bubbleCenterX} cy=${inputY} r=${bubbleRadius} />
                <line x1=${bubbleCenterX + bubbleRadius} y1=${inputY} x2=${outputX} y2=${inputY} />
            </g>
        </g>
    `
}

export const AndGateNode = ({ id, label, position, active, pinRegistry }) => {
    const pins = useMemo(() => [
        { id: 'in0', x: position.x - 10, y: position.y + 10 },
        { id: 'in1', x: position.x - 10, y: position.y + 30 },
        { id: 'out', x: position.x + 50, y: position.y + 20 }
    ], [position.x, position.y])

    useRegisterPins(id, pinRegistry, pins)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 20 0 A 10 10 0 0 1 20 40 L 0 40 L 0 0 Z" />
                <line x1="-10" y1="10" x2="0" y2="10" />
                <line x1="-10" y1="30" x2="0" y2="30" />
                <line x1="40" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const OrGateNode = ({ id, label, position, active, pinRegistry }) => {
    const pins = useMemo(() => [
        { id: 'in0', x: position.x - 10, y: position.y + 10 },
        { id: 'in1', x: position.x - 10, y: position.y + 30 },
        { id: 'out', x: position.x + 50, y: position.y + 20 }
    ], [position.x, position.y])

    useRegisterPins(id, pinRegistry, pins)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`} stroke-width="2">
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)}>
                <path d="M 0 0 L 20 0 A 10 10 0 0 1 20 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <line x1="-10" y1="10" x2="10" y2="10" />
                <line x1="-10" y1="30" x2="10" y2="30" />
                <line x1="40" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const NandGateNode = ({ id, label, position, active, pinRegistry }) => {
    const pins = useMemo(() => [
        { id: 'in0', x: position.x - 10, y: position.y + 10 },
        { id: 'in1', x: position.x - 10, y: position.y + 30 },
        { id: 'out', x: position.x + 50, y: position.y + 20 }
    ], [position.x, position.y])

    useRegisterPins(id, pinRegistry, pins)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 15 0 A 15 15 0 0 1 15 40 L 0 40 L 0 0 Z" />
                <line x1="-10" y1="10" x2="0" y2="10" />
                <line x1="-10" y1="30" x2="0" y2="30" />
                <circle cx="40" cy="20" r="5" />
                <line x1="45" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const NorGateNode = ({ id, label, position, active, pinRegistry }) => {
    const pins = useMemo(() => [
        { id: 'in0', x: position.x - 10, y: position.y + 10 },
        { id: 'in1', x: position.x - 10, y: position.y + 30 },
        { id: 'out', x: position.x + 50, y: position.y + 20 }
    ], [position.x, position.y])

    useRegisterPins(id, pinRegistry, pins)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 15 0 A 15 15 0 0 1 15 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <line x1="-10" y1="10" x2="10" y2="10" />
                <line x1="-10" y1="30" x2="10" y2="30" />
                <circle cx="40" cy="20" r="5" />
                <line x1="45" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const XorGateNode = ({ id, label, position, active, pinRegistry }) => {
    const pins = useMemo(() => [
        { id: 'in0', x: position.x - 10, y: position.y + 10 },
        { id: 'in1', x: position.x - 10, y: position.y + 30 },
        { id: 'out', x: position.x + 50, y: position.y + 20 }
    ], [position.x, position.y])

    useRegisterPins(id, pinRegistry, pins)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 20 0 A 10 10 0 0 1 20 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <path d="M -5 3 A 6 10 0 0 1 -5 37" fill="none" />
                <line x1="-10" y1="10" x2="3" y2="10" />
                <line x1="-10" y1="30" x2="3" y2="30" />
                <line x1="40" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const XnorGateNode = ({ id, label, position, active, pinRegistry }) => {
    const pins = useMemo(() => [
        { id: 'in0', x: position.x - 10, y: position.y + 10 },
        { id: 'in1', x: position.x - 10, y: position.y + 30 },
        { id: 'out', x: position.x + 50, y: position.y + 20 }
    ], [position.x, position.y])

    useRegisterPins(id, pinRegistry, pins)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <path d="M 0 0 L 15 0 A 15 15 0 0 1 15 40 L 0 40 A 6 10 0 0 0 0 0 Z" />
                <path d="M -5 3 A 6 10 0 0 1 -5 37" fill="none" />
                <line x1="-10" y1="10" x2="3" y2="10" />
                <line x1="-10" y1="30" x2="3" y2="30" />
                <circle cx="40" cy="20" r="5" />
                <line x1="45" y1="20" x2="50" y2="20" />
            </g>
        </g>
    `
}

export const DisplayProbeNode = ({ id, label, position, active, pinRegistry }) => {
    const width = 20, height = 20, borderRadius = height / 4

    const pins = useMemo(() => [
        { id: 'in', x: position.x - 10, y: position.y + height / 2 }
    ], [position.x, position.y])

    useRegisterPins(id, pinRegistry, pins)

    return html`
        <g transform=${`translate(${position.x} ${position.y})`}>
            <text y="-8" text-anchor="left" font-family=${FONT_FAMILY} font-size="12" font-weight="400">${label}</text>
            <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="2">
                <rect width=${width} height=${height} rx=${borderRadius} ry=${borderRadius} />
                <line x1="-10" y1=${height / 2} x2="0" y2=${height / 2} />
                <text style="user-select: none;" x=${width / 2} y=${height / 2} text-anchor="middle" dominant-baseline="middle" font-family=${FONT_FAMILY} font-size="14" stroke-width="2">
                    ${active ? 1 : 0}
                </text>
            </g>
        </g>
    `
}

export const WirePath = ({ from, sourcePin, to, targetPin, active }) => {
    const points = [from, to].map((p) => `${p.x},${p.y}`).join(' ')
    
    return html`
        <g fill=${fillColor(active)} stroke=${lineColor(active)} stroke-width="0">
            <polyline points=${points} fill="none" stroke="white" opacity="0" stroke-width="10"/>
            <polyline points=${points} fill="none" stroke-width=${active ? 3 : 2} />
            <circle fill=${!sourcePin ? 'black' : lineColor(active)} cx=${from.x} cy=${from.y} r="2.5" />
            <circle fill=${!targetPin ? 'black' : lineColor(active)} cx=${to.x} cy=${to.y} r="2.5" />
        </g>
    `
}
