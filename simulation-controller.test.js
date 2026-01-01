import { it, describe } from 'node:test'
import assert from 'node:assert/strict'

import Circuit, { ToggleSource, DisplayProbe, NotGate, AndGate, Wire } from './circuit.js'
import { SimulationController } from './simulation-controller.js'

describe('models', () => {
    it('shows the pin values as initialized at the beginning', () => {
        const source0 = new ToggleSource('source0', false)
        assert.equal(source0.pins.out.value, false)

        const source1 = new ToggleSource('source1', true)
        assert.equal(source1.pins.out.value, true)

        const probe = new DisplayProbe('probe')
        assert.equal(probe.pins.in.value, false)
        assert.equal(probe.pins.out.value, false)

        const notGate = new NotGate('not')
        assert.equal(notGate.pins.in.value, false)
        assert.equal(notGate.pins.out.value, true)

        const andGate = new AndGate('and')
        assert.equal(andGate.pins.in0.value, false)
        assert.equal(andGate.pins.in1.value, false)
        assert.equal(andGate.pins.out.value, false)
    })

    it('processes state changes correctly', () => {
        const notGate = new NotGate('not')
        notGate.pins.in.value = true
        notGate.process()
        assert.equal(notGate.pins.out.value, false)

        const andGate = new AndGate('and')
        andGate.pins.in0.value = true
        andGate.process()
        assert.equal(andGate.pins.out.value, false)
        
        andGate.pins.in1.value = true
        andGate.process()
        assert.equal(andGate.pins.out.value, true)
    })

    it('propagates signals through wires correctly', () => {
        const source = new ToggleSource('source', true)
        const probe = new DisplayProbe('probe')
        const wire = new Wire('wire', source.pins.out, probe.pins.in)

        wire.propagateSignal()
        assert.equal(probe.pins.in.value, true)

        source.setActivated(false)
        wire.propagateSignal()
        assert.equal(probe.pins.in.value, false)
    })
})

describe('simulation controller', () => {
    it('still displays 0 after a tick when the source is not activated', () => {
        const source = new ToggleSource('source', false)
        const probe = new DisplayProbe('probe')
        const circuit = new Circuit([source, probe], [new Wire('wire', source.pins.out, probe.pins.in)])
        const controller = new SimulationController(circuit)

        controller.tick()

        assert.equal(source.pins.out.value, false)
        assert.equal(probe.pins.in.value, false)
        assert.equal(probe.getValue(), 0)
    })

    it('displays 1 after a tick when the source is activated', () => {
        const source = new ToggleSource('source', true)
        const probe = new DisplayProbe('probe')
        const circuit = new Circuit([source, probe], [new Wire('wire', source.pins.out, probe.pins.in)])
        const controller = new SimulationController(circuit)

        assert.equal(probe.pins.in.value, false)

        controller.tick()

        assert.equal(probe.pins.in.value, true)
        assert.equal(probe.getValue(), 1)
    })

    it('propagates the signal further only after another tick', () => {
        const source = new ToggleSource('source', true)
        const probe0 = new DisplayProbe('probe0')
        const probe1 = new DisplayProbe('probe1')
        const sourceToProbe0 = new Wire('wire0', source.pins.out, probe0.pins.in)
        const probe0ToProbe1 = new Wire('wire1', probe0.pins.out, probe1.pins.in)
        const circuit = new Circuit([source, probe0, probe1], [sourceToProbe0, probe0ToProbe1])
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