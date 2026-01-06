export default class Circuit {
    constructor({ components, wires }) {
        this.components = components
        this.wires = wires
    }

    getPin(componentId, pinId) {
        return this.components.find(c => c.id === componentId).pins[pinId]
    }

    findConnectedWireHeads(component) {
        const result = []
        Object.keys(component.pins).forEach(pinId => {
            const pin = component.pins[pinId]
            result.push(...this.wires.filter(w => (w.sourcePin === pin)).map(wire => ({ wireHead: wire.from, pinId })))
            result.push(...this.wires.filter(w => (w.targetPin === pin)).map(wire => ({ wireHead: wire.to, pinId })))
        })
        return result
    }

    static fromJSON(json) {
        const components = json.components.map((compJson) => {
            const baseConfig = { id: compJson.id, label: compJson.label, position: structuredClone(compJson.position) }

            switch (compJson.type) {
                case 'source/toggle': return new ToggleSource({ ...baseConfig, active: compJson.active })
                case 'gate/not': return new NotGate(baseConfig)
                case 'gate/and': return new AndGate(baseConfig)
                case 'gate/or': return new OrGate(baseConfig)
                case 'gate/nand': return new NandGate(baseConfig)
                case 'gate/nor': return new NorGate(baseConfig)
                case 'gate/xor': return new XorGate(baseConfig)
                case 'gate/xnor': return new XnorGate(baseConfig)
                case 'probe/display': return new DisplayProbe(baseConfig)
                default: throw new Error(`Unknown component type: ${compJson.type}`)
            }
        })

        const wires = json.wires.map((wireJson) => {
            const [sourceCompId, sourcePinId] = wireJson.source.split('/')
            const sourcePin = components.find(c => c.id === sourceCompId).pins[sourcePinId]
            const [targetCompId, targetPinId] = wireJson.target.split('/')
            const targetPin = components.find(c => c.id === targetCompId).pins[targetPinId]
            const [from, to] = [structuredClone(wireJson.from), structuredClone(wireJson.to)]
            return new Wire({ id: wireJson.id, sourcePin, targetPin, from, to })
        })
        return new Circuit({ components, wires })
    }
}

export class ToggleSource {
    constructor({ id, active, label, position }) {
        this.id = id
        this.type = 'source/toggle'
        this.label = label
        this.position = position
        this.active = active
        this.pins = {
            out: { type: 'output', value: active }
        }
    }

    process() { }

    toggle() {
        this.active = !this.active
        this.pins['out'].value = this.active
    }
}

export class NotGate {
    constructor({ id, label, position }) {
        this.id = id
        this.type = 'gate/not'
        this.label = label
        this.position = position
        this.pins = {
            in: { type: 'input', value: false },
            out: { type: 'output', value: true }
        }
        this.active = this.pins.out.value
    }

    process() {
        this.pins['out'].value = !this.pins['in'].value
        this.active = this.pins.out.value
    }
}

export class AndGate {
    constructor({ id, label, position }) {
        this.id = id
        this.type = 'gate/and'
        this.label = label
        this.position = position
        this.pins = {
            in0: { type: 'input', value: false },
            in1: { type: 'input', value: false },
            out: { type: 'output', value: false }
        }
        this.active = this.pins.out.value
    }

    process() {
        this.pins['out'].value = this.pins['in0'].value && this.pins['in1'].value
        this.active = this.pins.out.value
    }
}

export class OrGate {
    constructor({ id, label, position }) {
        this.id = id
        this.type = 'gate/or'
        this.label = label
        this.position = position
        this.pins = {
            in0: { type: 'input', value: false },
            in1: { type: 'input', value: false },
            out: { type: 'output', value: false }
        }
        this.active = this.pins.out.value
    }

    process() {
        this.pins['out'].value = this.pins['in0'].value || this.pins['in1'].value
        this.active = this.pins.out.value
    }
}

export class NandGate {
    constructor({ id, label, position }) {
        this.id = id
        this.type = 'gate/nand'
        this.label = label
        this.position = position
        this.pins = {
            in0: { type: 'input', value: false },
            in1: { type: 'input', value: false },
            out: { type: 'output', value: true }
        }
        this.active = this.pins.out.value
    }

    process() {
        this.pins['out'].value = !(this.pins['in0'].value && this.pins['in1'].value)
        this.active = this.pins.out.value
    }
}

export class NorGate {
    constructor({ id, label, position }) {
        this.id = id
        this.type = 'gate/nor'
        this.label = label
        this.position = position
        this.pins = {
            in0: { type: 'input', value: false },
            in1: { type: 'input', value: false },
            out: { type: 'output', value: true }
        }
        this.active = this.pins.out.value
    }

    process() {
        this.pins['out'].value = !(this.pins['in0'].value || this.pins['in1'].value)
        this.active = this.pins.out.value
    }
}

export class XorGate {
    constructor({ id, label, position }) {
        this.id = id
        this.type = 'gate/xor'
        this.label = label
        this.position = position
        this.pins = {
            in0: { type: 'input', value: false },
            in1: { type: 'input', value: false },
            out: { type: 'output', value: false }
        }
        this.active = this.pins.out.value
    }

    process() {
        const a = this.pins['in0'].value
        const b = this.pins['in1'].value
        this.pins['out'].value = a !== b
        this.active = this.pins.out.value
    }
}

export class XnorGate {
    constructor({ id, label, position }) {
        this.id = id
        this.type = 'gate/xnor'
        this.label = label
        this.position = position
        this.pins = {
            in0: { type: 'input', value: false },
            in1: { type: 'input', value: false },
            out: { type: 'output', value: true }
        }
    }

    process() {
        const a = this.pins['in0'].value
        const b = this.pins['in1'].value
        this.pins['out'].value = a === b
        this.active = this.pins.out.value
    }
}

export class DisplayProbe {
    constructor({ id, label, position }) {
        this.id = id
        this.type = 'probe/display'
        this.label = label
        this.position = position
        this.pins = {
            in: { type: 'input', value: false }
        }
        this.active = this.pins.in.value
    }

    process() {
        this.active = this.pins.in.value
    }

    getValue() {
        return this.pins['in'].value ? 1 : 0
    }
}

export class Wire {
    constructor({ id, sourcePin, targetPin, from, to }) {
        this.id = id
        this.sourcePin = sourcePin
        this.targetPin = targetPin
        this.from = from ? { ...from } : null
        this.to = to ? { ...to } : null
        this.active = this.targetPin.value
    }

    propagateSignal() {
        this.targetPin.value = this.sourcePin.value
        this.active = this.targetPin.value
    }
}
