export default class Circuit {
    constructor({ title, components, wires }) {
        this.title = title
        this.components = components
        this.wires = wires
    }

    nextId(prefix) {
        const ids = [...this.components.map(c => c.id), ...this.wires.map(w => w.id)]
        const nums = ids.filter(id => id.startsWith(prefix)).map(id => Number(id.match(/^.+?(\d+)$/)?.[1]))
        return `${prefix}${Math.max(...nums, -1) + 1}`
    }

    findAvailablePins(pinType) {
        return this.components.map(c => Object.values(c.pins)).flat()
            .filter(p => (p.type === pinType || !pinType))
            .filter(p => p.type === 'output' || (p.type === 'input' && p.connectedWires.length === 0))
    }

    deleteComponent(component) {
        Object.values(component.pins).forEach(pin => pin.connectedWires.forEach(wire => wire.disconnectFrom(pin)))
        this.components.splice(this.components.indexOf(component), 1)
    }

    deleteWire(wire) {
        if (wire.sourcePin) wire.disconnectFrom(wire.sourcePin)
        if (wire.targetPin) wire.disconnectFrom(wire.targetPin)
        this.wires.splice(this.wires.indexOf(wire), 1)
    }

    resetState() {
        this.components.forEach(comp => Object.values(comp.pins).forEach(pin => pin.value = false))
        this.wires.forEach(wire => wire.active = false)
    }

    toJSON() {
        const path = (pin) => pin ? `${pin.component.id}/${pin.id}` : null
        return {
            title: this.title,
            components: this.components.map(c => {
                const pinStates = Object.fromEntries(Object.entries(c.pins).map(([pId, pin]) => [pId, pin.value]))
                return { id: c.id, type: c.type, label: c.label, position: c.position, pinStates }
            }),
            wires: this.wires.map(w => {
                return { id: w.id, source: path(w.sourcePin), target: path(w.targetPin), from: w.from, to: w.to }
            })
        }
    }

    static fromJSON(json) {
        const components = json.components.map((compJson) => {
            switch (compJson.type) {
                case 'source/toggle': return new ToggleSource(compJson)
                case 'source/clock': return new Clock(compJson)
                case 'gate/not': return new NotGate(compJson)
                case 'gate/and': return new AndGate(compJson)
                case 'gate/or': return new OrGate(compJson)
                case 'gate/nand': return new NandGate(compJson)
                case 'gate/nor': return new NorGate(compJson)
                case 'gate/xor': return new XorGate(compJson)
                case 'gate/xnor': return new XnorGate(compJson)
                case 'probe/display': return new DisplayProbe(compJson)
                default: throw new Error(`Unknown component type: ${compJson.type}`)
            }
        })

        const wires = json.wires.map((wireJson) => {
            const wire = new Wire({ id: wireJson.id, from: wireJson.from, to: wireJson.to })
            const [sourceCompId, sourcePinId] = wireJson.source ? wireJson.source.split('/') : []
            if (sourceCompId) wire.connectTo(components.find(c => c.id === sourceCompId).pins[sourcePinId])
            const [targetCompId, targetPinId] = wireJson.target ? wireJson.target.split('/') : []
            if (targetCompId) wire.connectTo(components.find(c => c.id === targetCompId).pins[targetPinId])
            return wire
        })
        return new Circuit({ title: json.title, components, wires })
    }
}

export class Component {
    constructor({ id, type, label, position, pins, pinStates = {} }) {
        this.id = id
        this.type = type
        this.label = label
        this.position = position
        this.pins = Object.fromEntries(Object.entries(pins).map(([pId, type]) => {
            return [pId, { id: pId, type, connectedWires: [], value: Boolean(pinStates[pId]), component: this }]
        }))
    }

    isActive() {
        return this.pins.out.value
    }
}

export class ToggleSource extends Component {
    constructor(options) {
        super({ ...options, type: 'source/toggle', pins: { 'out': 'output' } })
        this.active = false
    }

    process() { 
        this.pins.out.value = this.active
    }

    toggle() {
        this.active = !this.active
    }

    isActive() {
        return this.active
    }
}

export class Clock extends Component {
    constructor(options) {
        super({ ...options, type: 'source/clock', pins: { 'out': 'output' } })
        this.active = false
    }

    process() { 
        this.pins.out.value = this.active
    }

    tick(value) {
        this.active = value
    }
}

export class NotGate extends Component {
    constructor(options) {
        super({ ...options, type: 'gate/not', pins: { 'in': 'input', 'out': 'output' } })
    }

    process() {
        this.pins.out.value = !this.pins.in.value
    }
}

export class AndGate extends Component {
    constructor(options) {
        super({ ...options, type: 'gate/and', pins: { 'in0': 'input', 'in1': 'input', 'out': 'output' } })
    }

    process() {
        this.pins.out.value = this.pins.in0.value && this.pins.in1.value
    }
}

export class OrGate extends Component {
    constructor(options) {
        super({ ...options, type: 'gate/or', pins: { 'in0': 'input', 'in1': 'input', 'out': 'output' } })
    }

    process() {
        this.pins.out.value = this.pins.in0.value || this.pins.in1.value
    }
}

export class NandGate extends Component {
    constructor(options) {
        super({ ...options, type: 'gate/nand', pins: { 'in0': 'input', 'in1': 'input', 'out': 'output' } })
    }

    process() {
        this.pins.out.value = !(this.pins.in0.value && this.pins.in1.value)
    }
}

export class NorGate extends Component {
    constructor(options) {
        super({ ...options, type: 'gate/nor', pins: { 'in0': 'input', 'in1': 'input', 'out': 'output' } })
    }

    process() {
        this.pins.out.value = !(this.pins.in0.value || this.pins.in1.value)
    }
}

export class XorGate extends Component {
    constructor(options) {
        super({ ...options, type: 'gate/xor', pins: { 'in0': 'input', 'in1': 'input', 'out': 'output' } })
    }

    process() {
        this.pins.out.value = (this.pins.in0.value !== this.pins.in1.value)
    }
}

export class XnorGate extends Component {
    constructor(options) {
        super({ ...options, type: 'gate/xnor', pins: { 'in0': 'input', 'in1': 'input', 'out': 'output' } })
    }

    process() {
        this.pins.out.value = (this.pins.in0.value === this.pins.in1.value)
    }
}

export class DisplayProbe extends Component {
    constructor(options) {
        super({ ...options, type: 'probe/display', pins: { 'in': 'input' } })
        this.active = false
    }

    isActive() {
        return this.active
    }

    process() {
        this.active = this.pins.in.value
    }

    getValue() {
        return this.active ? 1 : 0
    }
}

export class Wire {
    constructor({ id, from, to }) {
        this.id = id
        this.sourcePin = undefined
        this.targetPin = undefined
        this.from = from
        this.to = to
    }

    isActive() {
        return this.targetPin?.value
    }

    connectTo(pin) {
        this[pin.type === 'output' ? 'sourcePin' : 'targetPin'] = pin
        pin.connectedWires.push(this)
    }

    disconnectFrom(pin) {
        this[pin.type === 'output' ? 'sourcePin' : 'targetPin'] = undefined
        pin.connectedWires.splice(pin.connectedWires.indexOf(this), 1)
    }

    propagateSignal() {
        (this.targetPin || {}).value = this.sourcePin?.value
    }
}
