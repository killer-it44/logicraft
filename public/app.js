import { html, useRef, useState, useEffect } from 'preact-standalone'
import Circuit, { Component, ToggleSource, NotGate, AndGate, OrGate, NandGate, NorGate, XorGate, XnorGate, DisplayProbe, Wire } from './circuit.js'
import { ToggleNode, NotGateNode, AndGateNode, OrGateNode, NandGateNode, NorGateNode, XorGateNode, XnorGateNode, DisplayProbeNode, WirePath } from './ui-components.js'
import { SimulationController } from './simulation-controller.js'
import { ComponentLibrary } from './component-library.js'

const GRID_SPACING = 10
const INITIAL_VIEWBOX = { x: 0, y: 0, width: 800, height: 480 }
const ZOOM_SPEED = 1.07
const MIN_WIDTH = INITIAL_VIEWBOX.width / 10
const MAX_WIDTH = INITIAL_VIEWBOX.width * 10
const SNAP_DISTANCE = 10

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const snapToGrid = ({ x, y }) => ({
    x: Math.round(x / GRID_SPACING) * GRID_SPACING,
    y: Math.round(y / GRID_SPACING) * GRID_SPACING
})

const addPoints = (p1, p2) => ({ x: p1.x + p2.x, y: p1.y + p2.y })
const subPoints = (p1, p2) => ({ x: p1.x - p2.x, y: p1.y - p2.y })
const distance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y)

const Components = {
    'source/toggle': { UI: ToggleNode, Model: ToggleSource, title: 'Toggle Source', shortTitle: 'Toggle', description: 'Manual binary switch.', accent: '#fb923c' },
    'gate/not': { UI: NotGateNode, Model: NotGate, title: 'NOT Gate', shortTitle: 'NOT', description: 'Inverts a single signal.', accent: '#0ea5e9' },
    'gate/and': { UI: AndGateNode, Model: AndGate, title: 'AND Gate', shortTitle: 'AND', description: 'Outputs 1 when both inputs are 1.', accent: '#10b981' },
    'gate/or': { UI: OrGateNode, Model: OrGate, title: 'OR Gate', shortTitle: 'OR', description: 'Outputs 1 when any input is 1.', accent: '#fbbf24' },
    'gate/nand': { UI: NandGateNode, Model: NandGate, title: 'NAND Gate', shortTitle: 'NAND', description: 'Inverse of AND output.', accent: '#f43f5e' },
    'gate/nor': { UI: NorGateNode, Model: NorGate, title: 'NOR Gate', shortTitle: 'NOR', description: 'Inverse of OR output.', accent: '#8b5cf6' },
    'gate/xor': { UI: XorGateNode, Model: XorGate, title: 'XOR Gate', shortTitle: 'XOR', description: 'True when inputs differ.', accent: '#22d3ee' },
    'gate/xnor': { UI: XnorGateNode, Model: XnorGate, title: 'XNOR Gate', shortTitle: 'XNOR', description: 'True when inputs are the same.', accent: '#a3e635' },
    'probe/display': { UI: DisplayProbeNode, Model: DisplayProbe, title: 'Display', shortTitle: 'Display', description: 'Visualizes an input signal.', accent: '#f97316' }
}

export function App() {
    const svg = useRef()
    const selection = useRef()
    const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)
    const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 })
    const [selectedElement, setSelectedElement] = useState()
    const [circuit, setCircuit] = useState(new Circuit({ title: 'Untitled Circuit', components: [], wires: [] }))
    const [simulationController, setSimulationController] = useState(new SimulationController({ stepsPerTick: 2 }))

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'Backspace' && e.key !== 'Delete') return
            if (!svg.current.isActive || !selectedElement) return
            deleteElement(selectedElement)
            setSelectedElement(undefined)
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [selectedElement])

    const addComponent = (type) => {
        const position = snapToGrid({ x: viewBox.x + 200, y: viewBox.y + 100 })
        const c = new Components[type].Model({ id: circuit.nextId(type.split('/')[1]), position })
        setCircuit(new Circuit({ title: circuit.title, components: [...circuit.components, c], wires: circuit.wires }))
    }

    const deleteElement = (element) => {
        (element instanceof Component) ? circuit.deleteComponent(element) : circuit.deleteWire(element)
        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
    }

    const setStepsPerTick = (steps) => {
        const newSimulationController = new SimulationController({ stepsPerTick: steps })
        if (simulationController.isPlaying) {
            simulationController.pause()
            newSimulationController.play(circuit, function onTick() {
                setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
            })
        }
        setSimulationController(newSimulationController)
    }

    const step = () => {
        simulationController.step(circuit)
        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
    }

    const tick = () => {
        simulationController.tick(circuit)
        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
    }

    const playOrPause = () => {
        const newSimulationController = new SimulationController({ stepsPerTick: simulationController.stepsPerTick })
        if (simulationController.isPlaying) {
            simulationController.pause()
        } else {
            newSimulationController.play(circuit, function onTick() {
                setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
            })
        }
        setSimulationController(newSimulationController)
    }

    const reset = () => {
        circuit.resetState()
        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
    }

    const toSvgPoint = (x, y) => new DOMPoint(x, y).matrixTransform(svg.current.getScreenCTM().inverse())

    const pinPos = (pin) => addPoints(pin.component.position, Components[pin.component.type].UI.pinPositions[pin.id])

    const findPinInRange = (point, pinType) => {
        const closest = circuit.findAvailablePins(pinType)
            .sort((pin1, pin2) => distance(pinPos(pin1), point) - distance(pinPos(pin2), point))[0]
        return closest && distance(pinPos(closest), point) <= SNAP_DISTANCE ? closest : undefined
    }

    const snapWireEndpoint = (point, wire, endpointKey) => {
        const connectedPin = wire[endpointKey === 'from' ? 'sourcePin' : 'targetPin']
        if (connectedPin) wire.disconnectFrom(connectedPin)

        const pinInRange = findPinInRange(point, endpointKey === 'from' ? 'output' : 'input')
        if (pinInRange) wire.connectTo(pinInRange)

        wire[endpointKey] = pinInRange ? pinPos(pinInRange) : snapToGrid(point)
    }

    const selectWire = (wire, startPoint, isDraggingFrom, isDraggingTo) => {
        const offsetFrom = subPoints(startPoint, wire.from)
        const offsetTo = subPoints(startPoint, wire.to)
        selection.current = { element: wire, startPoint, offsetFrom, offsetTo, isDraggingFrom, isDraggingTo }
    }

    const createdConnectedWireAndSelectForDragging = (pin, startPoint) => {
        const w = new Wire({ id: circuit.nextId('wire'), from: pinPos(pin), to: pinPos(pin) })
        w.connectTo(pin)
        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: [...circuit.wires, w] }))
        selectWire(w, startPoint, pin.type === 'input', pin.type === 'output')
    }

    const pointerDown = (event, element) => {
        event.preventDefault()
        if (event.button === 0 && element) {
            const startPoint = toSvgPoint(event.clientX, event.clientY)
            if (element instanceof Component) {
                const pinInRange = findPinInRange(startPoint)
                if (pinInRange) {
                    createdConnectedWireAndSelectForDragging(pinInRange, startPoint)
                } else {
                    selection.current = { element, startPoint, offset: subPoints(startPoint, element.position) }
                }
            } else {
                const wire = element
                selectWire(wire, startPoint, distance(startPoint, wire.from) < 10, distance(startPoint, wire.to) < 10)
            }
        }

        setSelectedElement(selection.current?.element)
    }

    const dragComponentWithConnectedWires = (comp, point, offset) => {
        comp.position = snapToGrid({ x: point.x - offset.x, y: point.y - offset.y })
        Object.values(comp.pins).forEach(pin => pin.connectedWires
            .forEach(wire => pin.type === 'output' ? wire.from = pinPos(pin) : wire.to = pinPos(pin)))
    }

    const dragWire = (wire, point, offsetFrom, offsetTo, isDraggingFrom, isDraggingTo) => {
        if (isDraggingFrom || !isDraggingTo) {
            snapWireEndpoint({ x: point.x - offsetFrom.x, y: point.y - offsetFrom.y }, wire, 'from')
        }
        if (isDraggingTo || !isDraggingFrom) {
            snapWireEndpoint({ x: point.x - offsetTo.x, y: point.y - offsetTo.y }, wire, 'to')
        }
    }

    const dragSelection = (sel, point) => {
        if (!sel.isDragging && distance(sel.startPoint, point) <= 10) return

        sel.isDragging = true
        if (sel.element instanceof Component) {
            dragComponentWithConnectedWires(sel.element, point, sel.offset)
        } else {
            dragWire(sel.element, point, sel.offsetFrom, sel.offsetTo, sel.isDraggingFrom, sel.isDraggingTo)
        }
        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
    }

    const pan = (delta) => {
        const client = svg.current.getBoundingClientRect()
        const scale = Math.max(viewBox.width / client.width, viewBox.height / client.height)
        setViewBox(prev => ({ ...prev, x: prev.x - delta.x * scale, y: prev.y - delta.y * scale }))
    }

    const move = (event) => {
        const point = toSvgPoint(event.clientX, event.clientY)
        setPointerPosition(point)
        if (selection.current) {
            dragSelection(selection.current, point)
        } else if (event.buttons & 2) {
            pan({ x: event.movementX, y: event.movementY })
        }
    }

    const pointerUp = () => {
        if (selection.current && !selection.current.isDragging) {
            if (selection.current.element.type === 'source/toggle') {
                selection.current.element.toggle()
                setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
            }
        }
        selection.current = undefined
    }

    const zoom = (delta, center) => {
        const svgPoint = toSvgPoint(center.x, center.y)
        const scale = delta > 0 ? ZOOM_SPEED : 1 / ZOOM_SPEED
        const clampedScale = clamp(viewBox.width * scale, MIN_WIDTH, MAX_WIDTH) / viewBox.width
        const x = svgPoint.x - (svgPoint.x - viewBox.x) * clampedScale
        const y = svgPoint.y - (svgPoint.y - viewBox.y) * clampedScale
        setViewBox({ x, y, width: viewBox.width * clampedScale, height: viewBox.height * clampedScale })
    }

    const wheel = (event) => {
        event.preventDefault()
        if (event.ctrlKey || event.metaKey) {
            zoom(event.deltaY, { x: event.clientX, y: event.clientY })
        } else {
            // REVISE check if this can re-use pan()
            setViewBox((prev) => {
                const scale = prev.width / INITIAL_VIEWBOX.width
                return { ...prev, x: prev.x + event.deltaX * scale, y: prev.y + event.deltaY * scale }
            })
        }
    }

    const open = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json,application/json'
        input.onchange = (e) => {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.onload = (event) => {
                const json = JSON.parse(event.target.result)
                setCircuit(Circuit.fromJSON(json))
            }
            reader.readAsText(file)
        }
        input.click()
    }

    const save = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(circuit.toJSON(), null, 2))
        const dlAnchorElem = document.createElement('a')
        dlAnchorElem.setAttribute("href", dataStr)
        dlAnchorElem.setAttribute("download", "circuit.json")
        dlAnchorElem.click()
    }

    return html`
        <style>
            aside {
                background: #0f172ad9;
                color: #f8fafc;
                border-radius: 8px;
                font-family: 'Space Grotesk', sans-serif;
                box-shadow: 0 8px 16px #02061759;
                padding: 8px 12px;
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
            .selected {
                filter: drop-shadow(0 0 6px #0051ffff);
            }
        </style>
        <aside style="position: fixed; top: 16px; left: 16px;">
            <input type="text" value=${circuit.title} onInput=${(e) => setCircuit(new Circuit({ title: e.target.value, components: circuit.components, wires: circuit.wires }))} style="width: 160px;" />
            <button type="button" onClick=${open}>Open</button>
            <button type="button" onClick=${save}>Save</button>
        </aside>
        <aside style="position: fixed; top: 16px; left: 50%; transform: translateX(-50%);">
            <label>
                <span style="font-weight: bold;">Steps per Tick: </span>
                <input type="number" min="2" step="1" value=${simulationController.stepsPerTick} onInput=${(e) => setStepsPerTick(Number(e.target.value))} />
            </label>
            <img onClick=${step} title="One single step" src="icons/step.svg" width="28" height="28" />
            <img onClick=${tick} title="One full clock tick" src="icons/tick.svg" width="28" height="28" />
            <img onClick=${playOrPause} title=${simulationController.isPlaying ? 'Pause' : 'Play continuously'} src=${simulationController.isPlaying ? 'icons/pause.svg' : 'icons/play.svg'} width="28" height="28" />
            <img onClick=${reset} title="Reset" src="icons/reset.svg" width="28" height="28" />
        </aside>    
        <main style="overflow: hidden;">
            <svg ref=${svg} width="100vw" height="100vh" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" style="cursor: ${selection.current ? 'grabbing' : 'default'};"
                onPointerDown=${pointerDown} onPointerMove=${move} onPointerUp=${pointerUp} onPointerCancel=${pointerUp} onContextMenu=${(e) => e.preventDefault()} onWheel=${wheel} onPointerLeave=${() => svg.current.isActive = false} onPointerEnter=${() => svg.current.isActive = true}
            >
                <defs>
                    <pattern id="grid-pattern" width=${GRID_SPACING} height=${GRID_SPACING} patternUnits="userSpaceOnUse">
                        <path d=${`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`} fill="none" stroke="#cbd5f5" stroke-width="1" />
                    </pattern>
                </defs>
                <rect x=${-MAX_WIDTH} y=${-MAX_WIDTH} width=${MAX_WIDTH * 2} height=${MAX_WIDTH * 2} fill="url(#grid-pattern)" />

                ${circuit.components.map(comp => html`
                <g class="${comp === selectedElement && 'selected'}" style="cursor: ${selection.current ? 'inherit' : comp.type === 'source/toggle' ? 'pointer' : 'grab'};" key=${comp.id} onPointerDown=${(event) => pointerDown(event, comp)}>
                    <${Components[comp.type].UI} id=${comp.id} label=${comp.label} position=${comp.position} active=${comp.isActive()} />
                </g>
                `)}

                ${circuit.wires.map(wire => html`
                <g class="${wire === selectedElement && 'selected'}" style="cursor: ${selection.current ? 'inherit' : 'grab'};" key=${wire.id} onPointerDown=${(event) => pointerDown(event, wire)}>
                    <${WirePath} id=${wire.id} from=${wire.from} sourcePin=${wire.sourcePin} to=${wire.to} targetPin=${wire.targetPin} active=${wire.isActive()} />
                </g>
                `)}
            </svg>
        </main>
        <aside class="library" style="position: fixed; top: 50%; transform: translateY(-50%); left: 16px; flex-direction: column; max-height: calc(100vh - 10rem);">
            <${ComponentLibrary} components=${Object.entries(Components).map(Comp => ({ type: Comp[0], ...Comp[1] }))} onCreate=${addComponent} />
        </aside>
        <aside style="position: fixed; bottom: 16px; right: 16px;">
            x: ${Math.round(pointerPosition.x)}, y: ${Math.round(pointerPosition.y)}
            <button style="background: none; border: none;" type="button" onClick=${() => setViewBox(INITIAL_VIEWBOX)}>⌂</button>
        </aside>
    `
}
