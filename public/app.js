import { html, useRef, useState, useEffect } from 'preact-standalone'
import Circuit, { ToggleSource, NotGate, AndGate, OrGate, NandGate, NorGate, XorGate, XnorGate, DisplayProbe, Wire } from './circuit.js'
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

const Components = {
    'source/toggle': { UI: ToggleNode, Model: ToggleSource, title: 'Toggle Source', shortTitle: 'Toggle', description: 'Manual binary switch.', accent: '#fb923c' },
    'gate/not': { UI: NotGateNode, Model: NotGate, title: 'NOT Gate', shortTitle: 'NOT', description: 'Inverts a single signal.', accent: '#0ea5e9' },
    'gate/and': { UI:AndGateNode, Model: AndGate, title: 'AND Gate', shortTitle: 'AND', description: 'Outputs 1 when both inputs are 1.', accent: '#10b981' },
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
    const [circuit, setCircuit] = useState(new Circuit({ title: 'Untitled Circuit', components: [], wires: [] }))
    const pinRegistry = useRef(new Map())
    const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 })
    const [stepsPerTick, setStepsPerTick] = useState(1)
    const [isPlaying, setPlaying] = useState(false)
    const [selectedElement, setSelectedElement] = useState()
    const simulationController = useRef(new SimulationController())

    useEffect(() => {
        const isEditableTarget = (element) => {
            if (!element) return false
            if (element.isContentEditable) return true
            return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'
        }

        const onKeyDown = (e) => {
            if (e.key !== 'Backspace' && e.key !== 'Delete') return
            if (isEditableTarget(document.activeElement) || !selectedElement) return
            deleteSelected()
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [selectedElement])

    const nextId = (prefix) => {
        const nums = circuit.components
            .filter(c => c.id.startsWith(prefix))
            .map(c => Number(c.id.slice(prefix.length)))
            .filter(n => Number.isFinite(n))
        const max = nums.length ? Math.max(...nums) : -1
        return `${prefix}${max + 1}`
    }

    const nextWireId = () => {
        const nums = circuit.wires
            .map(w => Number(String(w.id).match(/(\d+)/)?.[1]))
            .filter(n => Number.isFinite(n))
        const max = nums.length ? Math.max(...nums) : -1
        return `wire${max + 1}`
    }

    const addComponent = (type) => {
        const position = snapToGrid({ x: viewBox.x + 200, y: viewBox.y + 100 })
        const comp = new Components[type].Model({ id: nextId(type.split('/')[1]), position })
        setCircuit(new Circuit({ title: circuit.title, components: [...circuit.components, comp], wires: circuit.wires }))
    }

    const deleteSelected = () => {
        if (!selectedElement) return
        // If selected element is a component, remove it and any connected wires
        if (selectedElement.type) {
            const comp = selectedElement
            const compPins = Object.values(comp.pins)
            const remainingWires = circuit.wires.filter(w => !(
                compPins.includes(w.sourcePin) || compPins.includes(w.targetPin)
            ))
            const remainingComponents = circuit.components.filter(c => c !== comp)
            setCircuit(new Circuit({ title: circuit.title, components: remainingComponents, wires: remainingWires }))
        } else {
            // Selected element is a wire
            const remainingWires = circuit.wires.filter(w => w !== selectedElement)
            setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: remainingWires }))
        }
        setSelectedElement(undefined)
    }

    const step = () => {
        simulationController.current.step(circuit)
        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
    }

    const tick = () => {
        for (let i = 0; i < stepsPerTick; i++) {
            simulationController.current.step(circuit)
            setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
        }
    }

    const play = () => {
        if (!isPlaying) {
            simulationController.current.isPlaying = true
            const play = async () => {
                while (simulationController.current.isPlaying) {
                    for (let i = 0; i < stepsPerTick; i++) {
                        simulationController.current.step(circuit)
                        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                }
            }
            play()
            setPlaying(true)
        } else {
            simulationController.current.isPlaying = false
            setPlaying(false)
        }
    }

    const reset = () => {
        circuit.components.forEach(comp => {
            comp.active = false
            Object.keys(comp.pins).forEach(pinId => comp.pins[pinId].value = false)
        })
        circuit.wires.forEach(wire => wire.active = false)
        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
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
                // node: check if clicking near a pin to start a wire, otherwise drag component
                const startPoint = toSvgPoint(event.clientX, event.clientY)
                const pins = pinRegistry.current.get(element.id) || []
                let nearestPin = null
                let nearestDist = Infinity
                for (const p of pins) {
                    const d = Math.hypot(p.x - startPoint.x, p.y - startPoint.y)
                    if (d < nearestDist) { nearestPin = p; nearestDist = d }
                }

                if (nearestPin && nearestDist <= SNAP_DISTANCE) {
                    // Start a new wire anchored on this pin
                    const clickedPin = circuit.getPin(element.id, nearestPin.id)
                    const wireId = nextWireId()
                    const initialPoint = snapToGrid({ x: nearestPin.x, y: nearestPin.y })
                    const isOutput = clickedPin.type === 'output'
                    const wire = new Wire({ id: wireId, sourcePin: undefined, targetPin: undefined, from: initialPoint, to: initialPoint })

                    if (isOutput) {
                        wire.sourcePin = clickedPin
                    } else {
                        // Avoid multiple wires into the same input: only start if free
                        const hasWire = circuit.wires.some(w => w.targetPin === clickedPin)
                        if (hasWire) {
                            // If input already occupied, fall back to component drag
                            const offset = { x: startPoint.x - element.position.x, y: startPoint.y - element.position.y }
                            const connectedWireHeads = circuit.findConnectedWireHeads(element)
                            selection.current = { startPoint, offset, element, connectedWireHeads }
                            return
                        }
                        wire.targetPin = clickedPin
                    }

                    // Add wire to circuit and begin dragging the opposite end
                    setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: [...circuit.wires, wire] }))

                    const offsetFrom = { x: startPoint.x - wire.from.x, y: startPoint.y - wire.from.y }
                    const offsetTo = { x: startPoint.x - wire.to.x, y: startPoint.y - wire.to.y }
                    selection.current = {
                        startPoint,
                        element: wire,
                        offsetFrom,
                        offsetTo,
                        isDraggingFrom: !isOutput, // clicked on input -> drag source
                        isDraggingTo: isOutput,    // clicked on output -> drag target
                        startedOnPin: true
                    }
                } else {
                    // drag component
                    const offset = { x: startPoint.x - element.position.x, y: startPoint.y - element.position.y }
                    const connectedWireHeads = circuit.findConnectedWireHeads(element)
                    selection.current = { startPoint, offset, element, connectedWireHeads }
                }
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

        setSelectedElement(selection.current?.element)
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
                const wire = selection.current.element
                if (selection.current.isDraggingFrom || !selection.current.isDraggingTo) {
                    wire.from = snapWireEndpoint({ x: point.x - selection.current.offsetFrom.x, y: point.y - selection.current.offsetFrom.y }, wire, 'source')
                }
                if (selection.current.isDraggingTo || !selection.current.isDraggingFrom) {
                    wire.to = snapWireEndpoint({ x: point.x - selection.current.offsetTo.x, y: point.y - selection.current.offsetTo.y }, wire, 'target')
                }
            }
            setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
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
            if (selection.current.element.type === 'source/toggle' && !selection.current.startedOnPin) {
                selection.current.element.toggle()
                setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
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
            <input type="text" value=${circuit.title} onChange=${() => null} style="width: 160px;" />
            <button type="button" onClick=${open}>Open</button>
            <button type="button" onClick=${save}>Save</button>
        </aside>
        <aside style="position: fixed; top: 16px; left: 50%; transform: translateX(-50%);">
            <label>
                <span style="font-weight: bold;">Steps per Tick: </span>
                <input type="number" min="1" step="1" value=${stepsPerTick} onChange=${(e) => setStepsPerTick(Number(e.target.value))} />
            </label>
            <img onClick=${step} title="One single step" src="icons/step.svg" width="28" height="28" />
            <img onClick=${tick} title="One full clock tick" src="icons/tick.svg" width="28" height="28" />
            <img onClick=${play} title=${ isPlaying ? 'Pause' : 'Play continuously'} src=${ isPlaying ? 'icons/pause.svg' : 'icons/play.svg'} width="28" height="28" />
            <img onClick=${reset} title="Reset" src="icons/reset.svg" width="28" height="28" />
        </aside>    
        <main style="overflow: hidden;">
            <svg ref=${svg} width="100vw" height="100vh" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" style="cursor: ${selection.current ? 'grabbing' : 'default'};"
                onPointerDown=${pointerDown} onPointerMove=${move} onPointerUp=${pointerUp} onPointerCancel=${pointerUp} onContextMenu=${(e) => e.preventDefault()} onWheel=${wheel}
            >
                <defs>
                    <pattern id="grid-pattern" width=${GRID_SPACING} height=${GRID_SPACING} patternUnits="userSpaceOnUse">
                        <path d=${`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`} fill="none" stroke="#cbd5f5" stroke-width="1" />
                    </pattern>
                </defs>
                <rect x=${-MAX_WIDTH} y=${-MAX_WIDTH} width=${MAX_WIDTH * 2} height=${MAX_WIDTH * 2} fill="url(#grid-pattern)" />

                ${circuit.components.map(comp => html`
                <g class="${comp === selectedElement && 'selected'}" style="cursor: ${selection.current ? 'inherit' : comp.type === 'source/toggle' ? 'pointer' : 'grab'};" key=${comp.id} onPointerDown=${(event) => pointerDown(event, comp)}>
                    <${Components[comp.type].UI} id=${comp.id} label=${comp.label} position=${comp.position} active=${comp.active} pinRegistry=${pinRegistry.current} />
                </g>
                `)}

                ${circuit.wires.map(wire => html`
                <g class="${wire === selectedElement && 'selected'}" style="cursor: ${selection.current ? 'inherit' : 'grab'};" key=${wire.id} onPointerDown=${(event) => pointerDown(event, wire)}>
                    <${WirePath} id=${wire.id} from=${wire.from} sourcePin=${wire.sourcePin} to=${wire.to} targetPin=${wire.targetPin} active=${wire.active} />
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
