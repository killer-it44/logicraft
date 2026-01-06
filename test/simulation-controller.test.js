import { it, describe } from 'node:test'
import assert from 'node:assert/strict'

import Circuit, { ToggleSource, OrGate, DisplayProbe, Wire } from '../public/circuit.js'
import { SimulationController } from '../public/simulation-controller.js'

describe('simulation controller', () => {
    it('still displays 0 after a step when the source is not active', () => {
        const source = new ToggleSource({ id: 'source', active: false })
        const probe = new DisplayProbe({ id: 'probe' })
        const circuit = new Circuit({ 
            components: [source, probe],
            wires: [new Wire({ id: 'wire', sourcePin: source.pins.out, targetPin: probe.pins.in })] 
        })
        const controller = new SimulationController()

        controller.step(circuit)

        assert.equal(source.pins.out.value, false)
        assert.equal(probe.pins.in.value, false)
        assert.equal(probe.getValue(), 0)
    })

    it('displays 1 after a step when the source is active', () => {
        const source = new ToggleSource({ id: 'source', active: true })
        const probe = new DisplayProbe({ id: 'probe' })
        const circuit = new Circuit({ 
            components: [source, probe],
            wires: [new Wire({ id: 'wire', sourcePin: source.pins.out, targetPin: probe.pins.in })] 
        })
        const controller = new SimulationController()

        assert.equal(probe.pins.in.value, false)

        controller.step(circuit)

        assert.equal(probe.pins.in.value, true)
        assert.equal(probe.getValue(), 1)
    })

    it('propagates the signal further only after another step', () => {
        const source = new ToggleSource({ id: 'source', active: true })
        const or = new OrGate({ id: 'or' })
        const display = new DisplayProbe({ id: 'or' })
        const source2or0 = new Wire({ id: 'wire1', sourcePin: source.pins.out, targetPin: or.pins.in0 })
        const source2or1 = new Wire({ id: 'wire2', sourcePin: source.pins.out, targetPin: or.pins.in1 })
        const or2display = new Wire({ id: 'wire3', sourcePin: or.pins.out, targetPin: display.pins.in })
        const circuit = new Circuit({ components: [source, or, display], wires: [source2or1, source2or0, or2display] })
        const controller = new SimulationController()

        assert.equal(or.pins.in0.value, false)
        assert.equal(or.pins.in1.value, false)
        assert.equal(or.pins.out.value, false)
        assert.equal(display.pins.in.value, false)

        controller.step(circuit)

        assert.equal(or.pins.in0.value, true)
        assert.equal(or.pins.in1.value, true)
        assert.equal(or.pins.out.value, true)
        assert.equal(display.pins.in.value, false)

        controller.step(circuit)

        assert.equal(or.pins.in0.value, true)
        assert.equal(or.pins.in1.value, true)
        assert.equal(or.pins.out.value, true)
        assert.equal(display.pins.in.value, true)
    })
})
