import { it, describe } from 'node:test'
import assert from 'node:assert/strict'

import Circuit, { ToggleSource, DisplayProbe, NotGate, AndGate, OrGate, NandGate, Wire } from '../public/circuit.js'
import { readFileSync } from 'node:fs'

describe('circuit components', () => {
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

        const orGate = new OrGate('or')
        assert.equal(orGate.pins.in0.value, false)
        assert.equal(orGate.pins.in1.value, false)
        assert.equal(orGate.pins.out.value, false)
        
        const nandGate = new NandGate('nand')
        assert.equal(nandGate.pins.in0.value, false)
        assert.equal(nandGate.pins.in1.value, false)
        assert.equal(nandGate.pins.out.value, true)
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

        const orGate = new OrGate('or')
        orGate.pins.in0.value = true
        orGate.process()
        assert.equal(orGate.pins.out.value, true)

        const nandGate = new NandGate('nand')
        nandGate.pins.in0.value = true
        nandGate.pins.in1.value = true
        nandGate.process()
        assert.equal(nandGate.pins.out.value, false)
    })

    it('propagates signals through wires correctly', () => {
        const source = new ToggleSource('source', true)
        const probe = new DisplayProbe('probe')
        const wire = new Wire('wire', source.pins.out, probe.pins.in)

        wire.propagateSignal()
        assert.equal(probe.pins.in.value, true)

        source.setActive(false)
        wire.propagateSignal()
        assert.equal(probe.pins.in.value, false)
    })

    it('can be parsed from a json', () => {
        const json = {
            components: [
                { id: 'source', type: 'source/toggle', active: true },
                { id: 'probe', type: 'probe/display' }
            ],
            wires: [
                { id: 'wire', source: 'source/out', target: 'probe/in' }
            ]
        }

        const circuit = Circuit.fromJSON(json)

        assert.equal(circuit.components.length, 2)
        assert.equal(circuit.wires.length, 1)

        const source = circuit.components.find(c => c.id === 'source')
        const probe = circuit.components.find(c => c.id === 'probe')
        const wire = circuit.wires[0]

        assert(source instanceof ToggleSource)
        assert.equal(source.active, true)
        assert(probe instanceof DisplayProbe)
        assert.equal(wire.sourcePin, source.pins.out)
        assert.equal(wire.targetPin, probe.pins.in)
    })

    it('loads the demo-circuit.json correctly from the file system', () => {
        const blueprintJson = JSON.parse(readFileSync('public/demo-blueprint.json', 'utf-8'))
        const circuit = Circuit.fromJSON(blueprintJson.circuit)

        assert.equal(circuit.components.length, 5)
        assert.equal(circuit.wires.length, 4)
    })
})
