import { it, describe } from 'node:test'
import assert from 'node:assert/strict'

import Circuit, { ToggleSource, DisplayProbe, Wire } from '../public/circuit.js'
import { SimulationController } from '../public/simulation-controller.js'

describe('simulation controller', () => {
    it('still displays 0 after a tick when the source is not active', () => {
        const source = new ToggleSource({ id: 'source', active: false })
        const probe = new DisplayProbe({ id: 'probe' })
        const circuit = new Circuit({ 
            components: [source, probe], 
            wires: [new Wire({ id: 'wire', sourcePin: source.pins.out, targetPin: probe.pins.in })] 
        })
        const controller = new SimulationController(circuit)

        controller.tick()

        assert.equal(source.pins.out.value, false)
        assert.equal(probe.pins.in.value, false)
        assert.equal(probe.getValue(), 0)
    })

    it('displays 1 after a tick when the source is active', () => {
        const source = new ToggleSource({ id: 'source', active: true })
        const probe = new DisplayProbe({ id: 'probe' })
        const circuit = new Circuit({ 
            components: [source, probe], 
            wires: [new Wire({ id: 'wire', sourcePin: source.pins.out, targetPin: probe.pins.in })] 
        })
        const controller = new SimulationController(circuit)

        assert.equal(probe.pins.in.value, false)

        controller.tick()

        assert.equal(probe.pins.in.value, true)
        assert.equal(probe.getValue(), 1)
    })

    it('propagates the signal further only after another tick', () => {
        const source = new ToggleSource({ id: 'source', active: true })
        const probe0 = new DisplayProbe({ id: 'probe0' })
        const probe1 = new DisplayProbe({ id: 'probe1' })
        const sourceToProbe0 = new Wire({ id: 'wire0', sourcePin: source.pins.out, targetPin: probe0.pins.in })
        const probe0ToProbe1 = new Wire({ id: 'wire1', sourcePin: probe0.pins.out, targetPin: probe1.pins.in })
        const circuit = new Circuit({ components: [source, probe0, probe1], wires: [sourceToProbe0, probe0ToProbe1] })
        const controller = new SimulationController(circuit)

        controller.tick()

        assert.equal(probe0.pins.in.value, true)
        assert.equal(probe0.getValue(), 1)
        assert.equal(probe1.pins.in.value, false)
        assert.equal(probe1.getValue(), 0)

        controller.tick()

        assert.equal(probe1.pins.in.value, true)
        assert.equal(probe1.getValue(), 1)
    })
})
