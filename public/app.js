import { html, useRef, useState, useEffect } from 'preact-standalone'
import Circuit, { Component, ToggleSource, Clock, NotGate, AndGate, OrGate, NandGate, NorGate, XorGate, XnorGate, DisplayProbe, Wire } from './circuit.js'
import { ToggleNode, ClockNode, NotGateNode, AndGateNode, OrGateNode, NandGateNode, NorGateNode, XorGateNode, XnorGateNode, DisplayProbeNode, WirePath } from './ui-components.js'
import { SimulationController } from './simulation-controller.js'
import { initSelection } from './selection.js'
import { ComponentLibrary } from './component-library.js'
import { Properties } from './properties.js'

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
    'source/toggle': { UI: ToggleNode, Model: ToggleSource, title: 'Toggle Source', shortTitle: 'Toggle', description: 'Manual binary switch.' },
    'source/clock': { UI: ClockNode, Model: Clock, title: 'Clock', shortTitle: 'Clock', description: 'Outputs 1 on tick' },
    'gate/not': { UI: NotGateNode, Model: NotGate, title: 'NOT Gate', shortTitle: 'NOT', description: 'Inverts a single signal.' },
    'gate/and': { UI: AndGateNode, Model: AndGate, title: 'AND Gate', shortTitle: 'AND', description: 'Outputs 1 when both inputs are 1.' },
    'gate/or': { UI: OrGateNode, Model: OrGate, title: 'OR Gate', shortTitle: 'OR', description: 'Outputs 1 when any input is 1.' },
    'gate/nand': { UI: NandGateNode, Model: NandGate, title: 'NAND Gate', shortTitle: 'NAND', description: 'Inverse of AND output.' },
    'gate/nor': { UI: NorGateNode, Model: NorGate, title: 'NOR Gate', shortTitle: 'NOR', description: 'Inverse of OR output.' },
    'gate/xor': { UI: XorGateNode, Model: XorGate, title: 'XOR Gate', shortTitle: 'XOR', description: 'True when inputs differ.' },
    'gate/xnor': { UI: XnorGateNode, Model: XnorGate, title: 'XNOR Gate', shortTitle: 'XNOR', description: 'True when inputs are the same.' },
    'probe/display': { UI: DisplayProbeNode, Model: DisplayProbe, title: 'Display', shortTitle: 'Display', description: 'Visualizes an input signal.' }
}

export function App() {
    const svg = useRef()
    const selection = useRef()
    const selectionModule = useRef()
    const containerRef = useRef()
    const [selectionMode, setSelectionMode] = useState(false)
    const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)
    const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 })
    const [selectedElements, setSelectedElements] = useState([])
    const [circuit, setCircuit] = useState(new Circuit({ title: 'Untitled Circuit', components: [], wires: [] }))
    const [pastCircuits, setPastCircuits] = useState([])
    const [futureCircuits, setFutureCircuits] = useState([])
    const [simulationController, setSimulationController] = useState(new SimulationController({ stepsPerClockTick: 10 }))

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    })

    useEffect(() => {
        // REVISE AI generated, needs review & refactoring
        if (!containerRef.current) return
        const sel = initSelection({
            container: containerRef.current,
            getSelectable: () => svg.current ? svg.current.querySelectorAll('g.selectable') : [],
            onSelectionChange: (infos, event) => {
                // infos: [{id, item}]
                if (!infos || infos.length === 0) { setSelectedElements([]); return }
                const mapped = infos.map(info => {
                    if (info.item === 'component') return circuit.components.find(c => String(c.id) === String(info.id))
                    return circuit.wires.find(w => String(w.id) === String(info.id))
                }).filter(Boolean)

                if (event && (event.shiftKey || event.ctrlKey || event.metaKey)) {
                    setSelectedElements(prev => {
                        const ids = new Set(prev.map(p => String(p.id)))
                        mapped.forEach(m => ids.has(String(m.id)) ? ids.delete(String(m.id)) : ids.add(String(m.id)))
                        // rebuild array preserving references from circuit
                        const res = []
                        circuit.components.forEach(c => { if (ids.has(String(c.id))) res.push(c) })
                        circuit.wires.forEach(w => { if (ids.has(String(w.id))) res.push(w) })
                        return res
                    })
                } else {
                    setSelectedElements(mapped)
                }
            }
        })
        selectionModule.current = sel
        sel.disable()
        return () => sel.destroy()
    }, [circuit])

    const onKeyDown = (e) => {
        if (((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'z')) && futureCircuits.length) {
            e.preventDefault()
            redo()
        } else if (((e.ctrlKey && e.key.toLowerCase() === 'z') || (e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'z')) && pastCircuits.length) {
            e.preventDefault()
            undo()
        } else if ((e.key === 'Backspace' || e.key === 'Delete') && svg.current.isActive && selectedElements.length) {
            e.preventDefault()
            deleteElements(selectedElements)
            setSelectedElements([])
        }
    }

    const undo = () => {
        const previous = Circuit.fromJSON(pastCircuits[pastCircuits.length - 1])
        simulationController.pause()
        setPastCircuits(pastCircuits.slice(0, pastCircuits.length - 1))
        setFutureCircuits([circuit.toJSON(), ...futureCircuits])
        setCircuit(previous)
        setSelectedElements([])
    }
    
    const redo = () => {
        const next = Circuit.fromJSON(futureCircuits[0])
        simulationController.pause()
        setPastCircuits([...pastCircuits, circuit.toJSON()])
        setFutureCircuits(futureCircuits.slice(1))
        setCircuit(next)
        setSelectedElements([])
    }

    const addComponent = (type) => {
        setPastCircuits([...pastCircuits, circuit.toJSON()])
        const position = snapToGrid({ x: viewBox.x + 200, y: viewBox.y + 100 })
        const c = new Components[type].Model({ id: circuit.nextId(type.split('/')[1]), position })
        setCircuit(new Circuit({ title: circuit.title, components: [...circuit.components, c], wires: circuit.wires }))
    }

    const deleteElements = (elements) => {
        setPastCircuits([...pastCircuits, circuit.toJSON()])
        elements.forEach(element => circuit[element instanceof Component ? 'deleteComponent' : 'deleteWire'](element))
        setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))        
    }

    const setStepsPerClockTick = (steps) => {
        const newSimulationController = new SimulationController({ stepsPerClockTick: steps })
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
        simulationController.tick(function onStep() {
            setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
        })
    }

    const playOrPause = () => {
        const newSimulationController = new SimulationController({ stepsPerClockTick: simulationController.stepsPerClockTick })
        if (simulationController.isPlaying) {
            simulationController.pause()
        } else {
            newSimulationController.play(circuit, function onStep() {
                setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
            })
        }
        setSimulationController(newSimulationController)
    }

    const reset = () => {
        simulationController.reset(circuit)
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
        if (isDraggingFrom && isDraggingTo && wire.from.x === wire.to.x && wire.from.y === wire.to.y) {
            if (wire.targetPin && !wire.sourcePin) isDraggingTo = false
            if (!wire.targetPin && wire.sourcePin) isDraggingFrom = false
            if (!wire.targetPin && !wire.sourcePin) isDraggingFrom = false
        }
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
            const snapshot = circuit.toJSON()
            const startPoint = toSvgPoint(event.clientX, event.clientY)
            if (element instanceof Component) {
                const pinInRange = findPinInRange(startPoint)
                if (pinInRange) {
                    createdConnectedWireAndSelectForDragging(pinInRange, startPoint)
                } else {
                    // if multiple elements selected and this element is part of selection,
                    // prepare multi-drag state (per-element offsets, support components and wires)
                    if (selectedElements.length > 1 && selectedElements.some(s => String(s.id) === String(element.id))) {
                        const selectedIds = new Set(selectedElements.map(s => String(s.id)))
                        const offsets = selectedElements.map(s => {
                            if (s instanceof Component) return { type: 'component', offset: subPoints(startPoint, s.position) }
                            // wire: determine whether endpoints are movable (connected component is selected)
                            const fromMovable = !s.sourcePin || selectedIds.has(String(s.sourcePin.component.id))
                            const toMovable = !s.targetPin || selectedIds.has(String(s.targetPin.component.id))
                            return {
                                type: 'wire',
                                offsetFrom: s.from ? subPoints(startPoint, s.from) : { x: 0, y: 0 },
                                offsetTo: s.to ? subPoints(startPoint, s.to) : { x: 0, y: 0 },
                                fromMovable, toMovable
                            }
                        })
                        selection.current = { elements: selectedElements.slice(), startPoint, offsets, isMulti: true }
                    } else {
                        selection.current = { element, startPoint, offset: subPoints(startPoint, element.position) }
                    }
                }
            } else {
                const wire = element
                // support multi-drag for wires as well
                if (selectedElements.length > 1 && selectedElements.some(s => String(s.id) === String(wire.id))) {
                    const selectedIds = new Set(selectedElements.map(s => String(s.id)))
                    const offsets = selectedElements.map(s => {
                        if (s instanceof Component) return { type: 'component', offset: subPoints(startPoint, s.position) }
                        const fromMovable = !s.sourcePin || selectedIds.has(String(s.sourcePin.component.id))
                        const toMovable = !s.targetPin || selectedIds.has(String(s.targetPin.component.id))
                        return {
                            type: 'wire',
                            offsetFrom: s.from ? subPoints(startPoint, s.from) : { x: 0, y: 0 },
                            offsetTo: s.to ? subPoints(startPoint, s.to) : { x: 0, y: 0 },
                            fromMovable, toMovable
                        }
                    })
                    selection.current = { elements: selectedElements.slice(), startPoint, offsets, isMulti: true }
                } else {
                    selectWire(wire, startPoint, distance(startPoint, wire.from) < 10, distance(startPoint, wire.to) < 10)
                }
            }
            selection.current.snapshot = snapshot
        }
        // selection handling: click on element selects it (or toggles if modifier key)
        if (element) {
            if (event.shiftKey || event.ctrlKey || event.metaKey) {
                setSelectedElements(prev => {
                    const exists = prev.find(p => p === element || String(p.id) === String(element.id))
                    if (exists) return prev.filter(p => String(p.id) !== String(element.id))
                    return [...prev, element]
                })
            } else {
                // preserve existing multi-selection when clicking on one of the selected items
                const isInPrev = selectedElements.some(p => String(p.id) === String(element.id))
                if (!(selectedElements.length > 1 && isInPrev)) {
                    setSelectedElements([element])
                }
            }
        }
        // clicking empty canvas should clear selection unless rubberband selection is active
        if (!element && !selectionModule.current?.enabled) {
            setSelectedElements([])
        }
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
        if (sel.isMulti && Array.isArray(sel.elements)) {
            // two-phase: move components first (so wires attached to moved components update), then move wires
            const selectedIds = new Set(sel.elements.map(s => String(s.id)))
            // phase 1: components
            sel.elements.forEach((el, idx) => {
                if (el instanceof Component) {
                    const off = sel.offsets && sel.offsets[idx] ? sel.offsets[idx] : null
                    const o = off && off.type === 'component' ? off.offset || { x: 0, y: 0 } : { x: 0, y: 0 }
                    el.position = snapToGrid({ x: point.x - o.x, y: point.y - o.y })
                    Object.values(el.pins).forEach(pin => pin.connectedWires
                        .forEach(wire => pin.type === 'output' ? wire.from = pinPos(pin) : wire.to = pinPos(pin)))
                }
            })
            // phase 2: wires
            sel.elements.forEach((el, idx) => {
                if (!(el instanceof Component)) {
                    const off = sel.offsets && sel.offsets[idx] ? sel.offsets[idx] : null
                    if (off && off.type === 'wire') {
                        // handle 'from' endpoint
                        if (off.fromMovable) {
                            // if endpoint is attached to a selected component, prefer that pin position
                            if (el.sourcePin && selectedIds.has(String(el.sourcePin.component.id))) {
                                el.from = pinPos(el.sourcePin)
                            } else {
                                const of = off.offsetFrom || { x: 0, y: 0 }
                                el.from = { x: point.x - of.x, y: point.y - of.y }
                            }
                        }
                        // handle 'to' endpoint
                        if (off.toMovable) {
                            if (el.targetPin && selectedIds.has(String(el.targetPin.component.id))) {
                                el.to = pinPos(el.targetPin)
                            } else {
                                const ot = off.offsetTo || { x: 0, y: 0 }
                                el.to = { x: point.x - ot.x, y: point.y - ot.y }
                            }
                        }
                    }
                }
            })
        } else if (sel.element instanceof Component) {
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
        if (!selection.current) return
        if (selection.current.isMulti) {
            // multi-drag: only record snapshot if a drag actually happened
            if (selection.current.isDragging) {
                setPastCircuits(prev => [...prev, selection.current.snapshot])
            }
        } else {
            // single-element behavior (keep toggle for source/toggle)
            const el = selection.current.element
            if (el && el.type === 'source/toggle' && !selection.current.isDragging) {
                el.toggle()
                setCircuit(new Circuit({ title: circuit.title, components: circuit.components, wires: circuit.wires }))
                setPastCircuits(prev => [...prev, selection.current.snapshot])
            } else if (selection.current.isDragging) {
                setPastCircuits(prev => [...prev, selection.current.snapshot])
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
            aside input {
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
                cursor: pointer;
                border: none;
                padding: 0;
                background: none;
                color: inherit;
                font: inherit;
            }
            aside button:hover:enabled {
                filter: drop-shadow(0 0 2px #ffffff);
            }
            aside button:disabled {
                cursor: default;
                color: #666666;
            }
            aside button:has(img) {
                line-height: 0;
            }
            .selected {
                filter: drop-shadow(0 0 6px #0f172ad9);
            }
        </style>
        <aside style="position: fixed; top: 16px; left: 16px;">
            <input type="text" value=${circuit.title} onInput=${(e) => setCircuit(new Circuit({ title: e.target.value, components: circuit.components, wires: circuit.wires }))} style="width: 160px;" />
            <button type="button" title="Open" onClick=${open}><img src="icons/open.svg" /></button>
            <button type="button" title="Save" onClick=${save}><img src="icons/save.svg" /></button>
            <span style="font-size: 28px; color: #999999; user-select: none;">|</span>
            <button disabled=${pastCircuits.length === 0} type="button" title="Undo" onClick=${undo}>↩</button>
            <button disabled=${futureCircuits.length === 0} type="button" title="Redo" onClick=${redo}>↪</button>
        </aside>
        <aside style="position: fixed; top: 16px; left: 50%; transform: translateX(-50%);">
            <label>
                <span style="font-weight: bold;">Steps / clock tick: </span>
                <input type="number" min="4" step="2" value=${simulationController.stepsPerClockTick} onInput=${(e) => setStepsPerClockTick(Number(e.target.value))} />
            </label>
            <button type="button" title="One single step" onClick=${step}><img src="icons/step.svg" /></button>
            <button type="button" title="One full clock tick" onClick=${tick}><img src="icons/tick.svg" /></button>
            <button type="button" title=${simulationController.isPlaying ? 'Pause' : 'Play continuously'} onClick=${playOrPause}><img src=${simulationController.isPlaying ? 'icons/pause.svg' : 'icons/play.svg'} /></button>
            <button type="button" title="Reset" onClick=${reset}><img src="icons/reset.svg" /></button>
        </aside>    
        <main ref=${containerRef} style="width: 100vw; height: 100vh; overflow: hidden; cursor: ${selection.current ? 'grabbing' : 'default'};"
            onPointerDown=${pointerDown} onPointerMove=${move} onPointerUp=${pointerUp} onPointerCancel=${pointerUp} onContextMenu=${(e) => e.preventDefault()} onWheel=${wheel} onPointerLeave=${() => svg.current.isActive = false} onPointerEnter=${() => svg.current.isActive = true}
        >
            <svg ref=${svg} width="100vw" height="100vh" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}">
                <defs>
                    <pattern id="grid-pattern" width=${GRID_SPACING} height=${GRID_SPACING} patternUnits="userSpaceOnUse">
                        <path d=${`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`} fill="none" stroke="#cbd5f5" stroke-width="1" />
                    </pattern>
                </defs>
                <rect x=${-MAX_WIDTH} y=${-MAX_WIDTH} width=${MAX_WIDTH * 2} height=${MAX_WIDTH * 2} fill="url(#grid-pattern)" />

                ${circuit.components.map(comp => html`
                <g class=${`selectable ${selectedElements.some(s => s && s.id === comp.id) ? 'selected' : ''}`} data-id=${comp.id} data-item="component" style="cursor: ${selection.current ? 'inherit' : comp.type === 'source/toggle' ? 'pointer' : 'grab'};" key=${comp.id} onPointerDown=${(event) => pointerDown(event, comp)}>
                    <${Components[comp.type].UI} id=${comp.id} label=${comp.label} position=${comp.position} active=${comp.isActive()} />
                </g>
                `)}

                ${circuit.wires.map(wire => html`
                <g class=${`selectable ${selectedElements.some(s => s && s.id === wire.id) ? 'selected' : ''}`} data-id=${wire.id} data-item="wire" style="cursor: ${selection.current ? 'inherit' : 'grab'};" key=${wire.id} onPointerDown=${(event) => pointerDown(event, wire)}>
                    <${WirePath} id=${wire.id} from=${wire.from} sourcePin=${wire.sourcePin} to=${wire.to} targetPin=${wire.targetPin} active=${wire.isActive()} />
                </g>
                `)}
            </svg>
        </main>
        <aside class="library" style="position: fixed; top: 50%; transform: translateY(-50%); left: 16px; flex-direction: column; max-height: calc(100vh - 10rem);">
            <${ComponentLibrary} components=${Object.entries(Components).map(Comp => ({ type: Comp[0], ...Comp[1] }))} onCreate=${addComponent} />
        </aside>
        <aside style="position: fixed; bottom: 16px; right: 16px;">
            <span>x: ${Math.round(pointerPosition.x)}, y: ${Math.round(pointerPosition.y)}</span>
            <button title="Home" type="button" onClick=${() => setViewBox(INITIAL_VIEWBOX)}>
                <img src="icons/home.svg" width="16" height="16" />
            </button>
            <button title="Selection mode" aria-pressed=${selectionMode} type="button" onClick=${() => {
                if (selectionModule.current?.enabled) { selectionModule.current.disable(); setSelectionMode(false) } else { selectionModule.current?.enable(); setSelectionMode(true) }
            }} style=${selectionMode ? 'margin-left:8px; padding:6px; border-radius:8px; background: rgba(37,99,235,0.22); border:1px solid rgba(37,99,235,0.36);' : 'margin-left:8px; padding:6px; border-radius:8px; background: transparent;'}>
                <img src="icons/crosshair.svg" width="16" height="16" style=${selectionMode ? 'opacity:1' : 'opacity:0.9; filter:brightness(0.95)'} />
            </button>
        </aside>
        ${selectedElements.length === 1 && html`
        <aside style="position: fixed; right: 16px; top: 50%; transform: translateY(-50%);">
            <${Properties} element=${selectedElements[0]} />
        </aside>
        `}
    `
}
