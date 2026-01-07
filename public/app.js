import { html, useRef, useState, useEffect } from 'preact-standalone'
import Circuit, { ToggleSource, NotGate, AndGate, OrGate, NandGate, NorGate, XorGate, XnorGate, DisplayProbe } from './circuit.js'
import { ToggleNode, NotGateNode, AndGateNode, OrGateNode, NandGateNode, NorGateNode, XorGateNode, XnorGateNode, DisplayProbeNode, WirePath } from './ui-components.js'
import { SimulationController } from './simulation-controller.js'

const GRID_SPACING = 10
const INITIAL_VIEWBOX = { x: -100, y: -50, width: 800, height: 480 }
const ZOOM_SPEED = 1.07
const MIN_WIDTH = INITIAL_VIEWBOX.width / 10
const MAX_WIDTH = INITIAL_VIEWBOX.width * 10
const SNAP_DISTANCE = 10

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const snapToGrid = ({ x, y }) => ({
    x: Math.round(x / GRID_SPACING) * GRID_SPACING,
    y: Math.round(y / GRID_SPACING) * GRID_SPACING
})

const Components = {
    'source/toggle': { UI: ToggleNode, Model: ToggleSource, title: 'Toggle Source', description: 'Manual binary switch.', accent: '#fb923c' },
    'gate/not': { UI: NotGateNode, Model: NotGate, title: 'NOT Gate', description: 'Inverts a single signal.', accent: '#0ea5e9' },
    'gate/and': { UI:AndGateNode, Model: AndGate, title: 'AND Gate', description: 'Outputs 1 when both inputs are 1.', accent: '#10b981' },
    'gate/or': { UI: OrGateNode, Model: OrGate, title: 'OR Gate', description: 'Outputs 1 when any input is 1.', accent: '#fbbf24' },
    'gate/nand': { UI: NandGateNode, Model: NandGate, title: 'NAND Gate', description: 'Inverse of AND output.', accent: '#f43f5e' },
    'gate/nor': { UI: NorGateNode, Model: NorGate, title: 'NOR Gate', description: 'Inverse of OR output.', accent: '#8b5cf6' },
    'gate/xor': { UI: XorGateNode, Model: XorGate, title: 'XOR Gate', description: 'True when inputs differ.', accent: '#22d3ee' },
    'gate/xnor': { UI: XnorGateNode, Model: XnorGate, title: 'XNOR Gate', description: 'True when inputs are the same.', accent: '#a3e635' },
    'probe/display': { UI: DisplayProbeNode, Model: DisplayProbe, title: 'Display', description: 'Visualizes an input signal.', accent: '#f97316' }
}

export function App() {
    const svg = useRef()
    const selection = useRef()
    const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)
    const [circuit, setCircuit] = useState(new Circuit({ components: [], wires: [] }))
    const pinRegistry = useRef(new Map())
    const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 })
    const [stepsPerTick, setStepsPerTick] = useState(1)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLibraryMinimized, setIsLibraryMinimized] = useState(true)
    const simulationController = useRef(new SimulationController())

    useEffect(() => fetch('/demo-circuit.json').then(res => res.json()).then(data => setCircuit(Circuit.fromJSON(data))), [])

    const step = () => {
        simulationController.current.step(circuit)
        setCircuit(new Circuit({ components: circuit.components, wires: circuit.wires }))
    }

    const tick = () => {
    }

    const play = () => {
    }

    const pause = () => {
    }

    const stop = () => {
    }

    const nextId = (prefix) => {
        const nums = circuit.components
            .filter(c => c.id.startsWith(prefix))
            .map(c => Number(c.id.slice(prefix.length)))
            .filter(n => Number.isFinite(n))
        const max = nums.length ? Math.max(...nums) : -1
        return `${prefix}${max + 1}`
    }

    const addComponent = (type) => {
        const position = snapToGrid({ x: viewBox.x + 200, y: viewBox.y + 100 })
        const comp = new Components[type].Model({ id: nextId(type.split('/')[1]), position })
        setCircuit(new Circuit({ components: [...circuit.components, comp], wires: circuit.wires }))
    }

    // REVISE move to model layer and add tests
    const findPinInRangeForWire = (point, wire, pinType) => {
        let [pin, position, closestDistance] = [null, null, Infinity]
        for (const [componentId, pins] of pinRegistry.current.entries()) {
            const matchingPins = pins.map(p => ({ ...p, pin: circuit.getPin(componentId, p.id) }))
                .filter(entry => entry.pin.type === pinType)
                .filter(entry => (pinType === 'output' || !circuit.wires.find(w => w.targetPin === entry.pin && w !== wire)))

            for (const p of matchingPins) {
                const distance = Math.hypot(p.x - point.x, p.y - point.y)
                if (distance < closestDistance) {
                    [pin, position, closestDistance] = [circuit.getPin(componentId, p.id), { x: p.x, y: p.y }, distance]
                }
            }
        }
        return closestDistance <= SNAP_DISTANCE ? { pin, position } : { pin: undefined, position: point }
    }

    const snapWireEndpoint = (point, wire, endpointKey) => {
        const pinInRange = findPinInRangeForWire(point, wire, endpointKey === 'source' ? 'output' : 'input')
        wire[endpointKey === 'source' ? 'sourcePin' : 'targetPin'] = pinInRange.pin
        return snapToGrid(pinInRange.position)
    }

    const toSvgPoint = (x, y) => new DOMPoint(x, y).matrixTransform(svg.current.getScreenCTM().inverse())

    const pointerDown = (event, element) => {
        event.preventDefault()
        if (event.button === 0 && element) {
            if (element.type) {
                // node
                const startPoint = toSvgPoint(event.clientX, event.clientY)
                const offset = { x: startPoint.x - element.position.x, y: startPoint.y - element.position.y }
                const connectedWireHeads = circuit.findConnectedWireHeads(element)
                selection.current = { startPoint, offset, element, connectedWireHeads }
            }
            else {
                // wire
                const startPoint = toSvgPoint(event.clientX, event.clientY)
                const offsetFrom = { x: startPoint.x - element.from.x, y: startPoint.y - element.from.y }
                const offsetTo = { x: startPoint.x - element.to.x, y: startPoint.y - element.to.y }
                const isDraggingFrom = Math.hypot(startPoint.x - element.from.x, startPoint.y - element.from.y) < 10
                const isDraggingTo = Math.hypot(startPoint.x - element.to.x, startPoint.y - element.to.y) < 10
                selection.current = { startPoint, element, offsetFrom, offsetTo, isDraggingFrom, isDraggingTo }
            }
        }
    }

    const move = (event) => {
        const point = toSvgPoint(event.clientX, event.clientY)
        setPointerPosition(point)

        if (selection.current) {
            // drag
            const startPoint = selection.current.startPoint
            if (!selection.current.isDragging && Math.hypot(startPoint.x - point.x, startPoint.y - point.y) <= 10) return

            selection.current.isDragging = true

            if (selection.current.element.type) {
                // component
                const comp = selection.current.element
                comp.position = snapToGrid({ x: point.x - selection.current.offset.x, y: point.y - selection.current.offset.y })
                selection.current.connectedWireHeads.forEach(({ wireHead, pinId }) => {
                    const pinPosition = pinRegistry.current.get(comp.id).find(pin => pin.id === pinId)
                    wireHead.x = pinPosition.x
                    wireHead.y = pinPosition.y
                })
            } else {
                // wire
                // FIXME right now we can drag a wire to zero length, and then it cannot be extended again
                const wire = selection.current.element
                if (selection.current.isDraggingFrom || !selection.current.isDraggingTo) {
                    wire.from = snapWireEndpoint({ x: point.x - selection.current.offsetFrom.x, y: point.y - selection.current.offsetFrom.y }, wire, 'source')
                }
                if (selection.current.isDraggingTo || !selection.current.isDraggingFrom) {
                    wire.to = snapWireEndpoint({ x: point.x - selection.current.offsetTo.x, y: point.y - selection.current.offsetTo.y }, wire, 'target')
                }
            }
            setCircuit(new Circuit({ components: circuit.components, wires: circuit.wires }))
        } else if (event.buttons & 2) {
            // pan
            const client = svg.current.getBoundingClientRect()
            const scale = Math.max(viewBox.width / client.width, viewBox.height / client.height)
            setViewBox((prev) => {
                return { ...prev, x: prev.x - event.movementX * scale, y: prev.y - event.movementY * scale }
            })
        }
    }

    const pointerUp = () => {
        if (selection.current && !selection.current.isDragging) {
            // click (only for components of type toggle source)
            if (selection.current.element.type === 'source/toggle') {
                selection.current.element.toggle()
                setCircuit(new Circuit({ components: circuit.components, wires: circuit.wires }))
            }
        }
        selection.current = undefined
    }

    const wheel = (event) => {
        event.preventDefault()
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

    return html`
        <style>
            aside {
                background: #0f172ad9;
                color: #f8fafc;
                border-radius: 8px;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 13px;
                box-shadow: 0 8px 16px #02061759;
                padding: 6px 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            aside input, aside button {
                border: 1px solid #94a3b880;
                border-radius: 6px;
                font: inherit;
                color: inherit;
                padding: 4px 8px;
            }
            aside input {
                width: 4em;
                background: #0f172aff;
            }
            aside button {
                font-weight: bold;
                background: #2563eb;
                cursor: pointer;
            }
        </style>
        <aside role="region" aria-label="Simulation controls" style="position: fixed; top: 16px; left: 50%; transform: translateX(-50%);">
            <label>
                <span style="font-weight: bold;">Steps per Tick: </span>
                <input type="number" min="1" step="1" value=${stepsPerTick} onChange=${(e) => setStepsPerTick(Number(e.target.value))} />
            </label>
            <button type="button" onClick=${step}>Step</button>
            <button type="button" onClick=${tick}>Tick</button>
            <button type="button" onClick=${play} disabled=${isPlaying} style=${(isPlaying ? ' opacity: 0.5; cursor: not-allowed;' : '')}>Play</button>
            <button type="button" onClick=${pause} disabled=${!isPlaying} style=${(!isPlaying ? ' opacity: 0.5; cursor: not-allowed;' : '')}>Pause</button>
            <button type="button" onClick=${stop}>Stop</button>
        </aside>    
        <main style="width: 100vw; height: 100vh; overflow: hidden; cursor: ${selection.current ? 'grabbing' : 'default'};">
            <svg ref=${svg} width="100vw" height="100vh" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}"
                onPointerDown=${pointerDown} onPointerMove=${move} onPointerUp=${pointerUp} onPointerCancel=${pointerUp} onContextMenu=${(e) => e.preventDefault()} onWheel=${wheel}
            >
                <defs>
                    <pattern id="grid-pattern" width=${GRID_SPACING} height=${GRID_SPACING} patternUnits="userSpaceOnUse">
                        <path d=${`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`} fill="none" stroke="#cbd5f5" stroke-width="1" />
                    </pattern>
                </defs>
                <rect x=${-MAX_WIDTH} y=${-MAX_WIDTH} width=${MAX_WIDTH * 2} height=${MAX_WIDTH * 2} fill="url(#grid-pattern)" />

                ${circuit.components.map(comp => html`
                <g style="cursor: ${selection.current ? 'inherit' : comp.type === 'source/toggle' ? 'pointer' : 'grab'};" key=${comp.id} onPointerDown=${(event) => pointerDown(event, comp)}>
                    <${Components[comp.type].UI} id=${comp.id} label=${comp.label} position=${comp.position} active=${comp.active} pinRegistry=${pinRegistry.current} />
                </g>
                `)}

                ${circuit.wires.map(wire => html`
                <g style="cursor: ${selection.current ? 'inherit' : 'grab'};" key=${wire.id} onPointerDown=${(event) => pointerDown(event, wire)}>
                    <${WirePath} id=${wire.id} from=${wire.from} sourcePin=${wire.sourcePin} to=${wire.to} targetPin=${wire.targetPin} active=${wire.active} />
                </g>
                `)}
            </svg>
        </main>
        <aside style="position: fixed; bottom: 16px; right: 16px;">
            x: ${Math.round(pointerPosition.x)}, y: ${Math.round(pointerPosition.y)}
        </aside>

        <aside role="region" aria-label="Library" aria-expanded=${!isLibraryMinimized} style="position: fixed; top: 16px; left: 16px; ${isLibraryMinimized ? '' : 'bottom: 16px; width: 240px;'} background: linear-gradient(180deg, #fefce8 0%, #f8fafc 55%, #e2e8f0 100%); padding: ${isLibraryMinimized ? '10px' : '24px 18px'}; display: flex; flex-direction: column; gap: 16px; border-right: 1px solid rgba(15, 23, 42, 0.1); z-index: 20; color: #0f172a; font-family: 'Space Grotesk', sans-serif; transition: width 0.15s ease, padding 0.15s ease; overflow: hidden;">
            <div style="display: flex; align-items: center; justify-content: ${isLibraryMinimized ? 'center' : 'space-between'}; gap: 8px;">
                ${isLibraryMinimized ? html`
                    <button type="button" aria-label="Expand library" title="Expand" onClick=${() => setIsLibraryMinimized(false)} style="border: 1px solid rgba(15, 23, 42, 0.2); border-radius: 8px; background: #ffffff; color: inherit; cursor: pointer; display: grid; place-items: center; font-weight: 700;">Library 📁</button>
                ` : html`
                    <div>
                        <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.05em; text-transform: uppercase;">Library</h2>
                        <p style="margin: 6px 0 0; font-size: 13px; color: rgba(15, 23, 42, 0.65);">Click a block to insert it into the canvas.</p>
                    </div>
                    <button type="button" aria-label="Minimize library" title="Minimize" onClick=${() => setIsLibraryMinimized(true)} style="border: 1px solid rgba(15, 23, 42, 0.2); border-radius: 8px; background: #ffffff; color: inherit; cursor: pointer; width: 28px; height: 28px; display: grid; place-items: center; font-weight: 700;">‹</button>
                `}
            </div>
            ${!isLibraryMinimized && html`
            <div style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-right: 6px;">
                ${Object.entries(Components).map(Comp => ({ type: Comp[0], ...Comp[1] })).map(entry => html`
                    <button type="button" onClick=${() => addComponent(entry.type)} onPointerEnter=${(event) => {
                        event.currentTarget.style.transform = 'translateX(4px)'
                        event.currentTarget.style.boxShadow = `inset 3px 0 0 ${entry.accent}`
                    }} onPointerLeave=${(event) => {
                        event.currentTarget.style.transform = 'translateX(0)'
                        event.currentTarget.style.boxShadow = `inset 3px 0 0 ${entry.accent}`
                    }} style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 14px; padding: 12px 14px 12px 18px; background: #ffffff; color: inherit; cursor: pointer; box-shadow: inset 3px 0 0 ${entry.accent}; transition: transform 0.15s ease, box-shadow 0.15s ease; font-family: 'Space Grotesk', sans-serif; text-align: left;">
                        <span style="font-size: 14px; font-weight: 600; letter-spacing: 0.03em;">${entry.title}</span>
                        <span style="font-size: 12px; color: rgba(15, 23, 42, 0.65);">${entry.description}</span>
                    </button>
                `)}
            </div>
            `}
        </aside>
    `
}
