export default class Circuit {
    constructor(components, wires) {
        this.components = components
        this.wires = wires
    }

    static fromJSON(json) {
        const components = json.components.map((compJson) => {
            switch (compJson.type) {
                case 'source/toggle':
                    return new ToggleSource(compJson.id, compJson.activated)
                case 'gate/not':
                    return new NotGate(compJson.id)
                case 'gate/and':
                    return new AndGate(compJson.id)
                case 'probe/display':
                    return new DisplayProbe(compJson.id)
                default:
                    throw new Error(`Unknown component type: ${compJson.type}`)
            }
        })

        const wires = json.wires.map((wireJson) => {
            const [sourceCompId, sourcePinName] = wireJson.source.split('/')
            const sourcePin = components.find(c => c.id === sourceCompId).pins[sourcePinName]
            const [targetCompId, targetPinName] = wireJson.target.split('/')
            const targetPin = components.find(c => c.id === targetCompId).pins[targetPinName]
            new Wire(wireJson.id, sourcePin, targetPin)
        })
        return new Circuit(components, wires)
    }
}

export class ToggleSource {
    constructor(id, activated) {
        this.id = id
        this.type = 'source/toggle'
        this.activated = activated
        this.pins = {
            out: { type: 'output', value: activated }
        }
    }

    process() {
        // No-op for toggle source as it only changes state when toggled
    }

    setActivated(activated) {
        this.activated = activated
        this.pins['out'].value = activated
    }
}

export class NotGate {
    constructor(id) {
        this.id = id
        this.type = 'gate/not'
        this.pins = {
            in: { type: 'input', value: false },
            out: { type: 'output', value: true }
        }
    }

    process() {
        this.pins['out'].value = !this.pins['in'].value
    }
}

export class AndGate {
    constructor(id) {
        this.id = id
        this.type = 'gate/and'
        this.pins = {
            in0: { type: 'input', value: false },
            in1: { type: 'input', value: false },
            out: { type: 'output', value: false }
        }
    }

    process() {
        this.pins['out'].value = this.pins['in0'].value && this.pins['in1'].value
    }
}

export class DisplayProbe {
    constructor(id) {
        this.id = id
        this.type = 'probe/display'
        this.pins = {
            in: { type: 'input', value: false },
            out: { type: 'output', value: false }
        }
    }

    process() {
        this.pins['out'].value = this.pins['in'].value
    }

    getValue() {
        return this.pins['in'].value ? 1 : 0
    }
}

export class Wire {
    constructor(id, sourcePin, targetPin) {
        this.id = id
        this.sourcePin = sourcePin
        this.targetPin = targetPin
    }

    propagateSignal() {
        this.targetPin.value = this.sourcePin.value
    }
}
