import { it, describe } from 'node:test'
import assert from 'node:assert/strict'

import Circuit, { ToggleSource, DisplayProbe, NotGate, AndGate, OrGate, NandGate, NorGate, XorGate, XnorGate, Wire } from '../public/circuit.js'
import { readFileSync } from 'node:fs'

describe('circuit components', () => {
    it('shows the pin values as initialized at the beginning', () => {
        const source0 = new ToggleSource({ id: 'source0', active: false })
        assert.equal(source0.pins.out.value, false)

        const source1 = new ToggleSource({ id: 'source1', active: true })
        assert.equal(source1.pins.out.value, true)

        const probe = new DisplayProbe({ id: 'probe' })
        assert.equal(probe.pins.in.value, false)
        assert.equal(probe.pins.out.value, false)

        const notGate = new NotGate({ id: 'not' })
        assert.equal(notGate.pins.in.value, false)
        assert.equal(notGate.pins.out.value, true)

        const andGate = new AndGate({ id: 'and' })
        assert.equal(andGate.pins.in0.value, false)
        assert.equal(andGate.pins.in1.value, false)
        assert.equal(andGate.pins.out.value, false)

        const orGate = new OrGate({ id: 'or' })
        assert.equal(orGate.pins.in0.value, false)
        assert.equal(orGate.pins.in1.value, false)
        assert.equal(orGate.pins.out.value, false)

        const nandGate = new NandGate({ id: 'nand' })
        assert.equal(nandGate.pins.in0.value, false)
        assert.equal(nandGate.pins.in1.value, false)
        assert.equal(nandGate.pins.out.value, true)

        const norGate = new NorGate({ id: 'nor' })
        assert.equal(norGate.pins.in0.value, false)
        assert.equal(norGate.pins.in1.value, false)
        assert.equal(norGate.pins.out.value, true)

        const xorGate = new XorGate({ id: 'xor' })
        assert.equal(xorGate.pins.in0.value, false)
        assert.equal(xorGate.pins.in1.value, false)
        assert.equal(xorGate.pins.out.value, false)

        const xnorGate = new XnorGate({ id: 'xnor' })
        assert.equal(xnorGate.pins.in0.value, false)
        assert.equal(xnorGate.pins.in1.value, false)
        assert.equal(xnorGate.pins.out.value, true)
    })

    it('processes state changes correctly', () => {
        const notGate = new NotGate({ id: 'not' })
        notGate.pins.in.value = true
        notGate.process()
        assert.equal(notGate.pins.out.value, false)

        const andGate = new AndGate({ id: 'and' })
        andGate.pins.in0.value = true
        andGate.process()
        assert.equal(andGate.pins.out.value, false)
        andGate.pins.in1.value = true
        andGate.process()
        assert.equal(andGate.pins.out.value, true)

        const orGate = new OrGate({ id: 'or' })
        orGate.pins.in0.value = true
        orGate.process()
        assert.equal(orGate.pins.out.value, true)

        const nandGate = new NandGate({ id: 'nand' })
        nandGate.pins.in0.value = true
        nandGate.pins.in1.value = true
        nandGate.process()
        assert.equal(nandGate.pins.out.value, false)

        const norGate = new NorGate({ id: 'nor' })
        norGate.pins.in0.value = false
        norGate.pins.in1.value = false
        norGate.process()
        assert.equal(norGate.pins.out.value, true)
        norGate.pins.in0.value = true
        norGate.process()
        assert.equal(norGate.pins.out.value, false)

        const xorGate = new XorGate({ id: 'xor' })
        xorGate.pins.in0.value = false
        xorGate.pins.in1.value = true
        xorGate.process()
        assert.equal(xorGate.pins.out.value, true)
        xorGate.pins.in0.value = true
        xorGate.process()
        assert.equal(xorGate.pins.out.value, false)

        const xnorGate = new XnorGate({ id: 'xnor' })
        xnorGate.pins.in0.value = true
        xnorGate.pins.in1.value = true
        xnorGate.process()
        assert.equal(xnorGate.pins.out.value, true)
        xnorGate.pins.in1.value = false
        xnorGate.process()
        assert.equal(xnorGate.pins.out.value, false)
    })

    it('propagates signals through wires correctly', () => {
        const source = new ToggleSource({ id: 'source', active: true })
        const probe = new DisplayProbe({ id: 'probe' })
        const wire = new Wire({ id: 'wire', sourcePin: source.pins.out, targetPin: probe.pins.in })

        wire.propagateSignal()
        assert.equal(probe.pins.in.value, true)

        source.setActive(false)
        wire.propagateSignal()
        assert.equal(probe.pins.in.value, false)
    })

    it('can parse a circuit with connected components and wires from a json', () => {
        const json = {
            components: [
                { id: 'source', type: 'source/toggle', active: true, label: 'Source', position: { x: 10, y: 20 } },
                { id: 'probe', type: 'probe/display', label: 'Probe', position: { x: 100, y: 200 } }
            ],
            wires: [
                { id: 'wire', source: 'source/out', target: 'probe/in', from: { x: 30, y: 25 }, to: { x: 90, y: 210 } }
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
        assert.deepEqual(source.position, { x: 10, y: 20 })
        assert.equal(source.label, 'Source')
        assert(probe instanceof DisplayProbe)
        assert.deepEqual(probe.position, { x: 100, y: 200 })
        assert.equal(probe.label, 'Probe')
        assert.equal(wire.sourcePin, source.pins.out)
        assert.equal(wire.targetPin, probe.pins.in)
        assert.deepEqual(wire.from, { x: 30, y: 25 })
        assert.deepEqual(wire.to, { x: 90, y: 210 })
    })

    it('can parse all gate types from a json', () => {
        const json = {
            components: [
                { id: 'not', type: 'gate/not', position: { x: 0, y: 0 } },
                { id: 'and', type: 'gate/and', position: { x: 0, y: 0 } },
                { id: 'or', type: 'gate/or', position: { x: 10, y: 10 } },
                { id: 'nand', type: 'gate/nand', position: { x: 20, y: 20 } },
                { id: 'nor', type: 'gate/nor', position: { x: 0, y: 0 } },
                { id: 'xor', type: 'gate/xor', position: { x: 10, y: 10 } },
                { id: 'xnor', type: 'gate/xnor', position: { x: 20, y: 20 } }
            ],
            wires: []
        }

        const circuit = Circuit.fromJSON(json)

        assert(circuit.components.find(c => c.id === 'not') instanceof NotGate)
        assert(circuit.components.find(c => c.id === 'and') instanceof AndGate)
        assert(circuit.components.find(c => c.id === 'or') instanceof OrGate)
        assert(circuit.components.find(c => c.id === 'nand') instanceof NandGate)
        assert(circuit.components.find(c => c.id === 'nor') instanceof NorGate)
        assert(circuit.components.find(c => c.id === 'xor') instanceof XorGate)
        assert(circuit.components.find(c => c.id === 'xnor') instanceof XnorGate)
    })

    it('loads the demo-circuit.json correctly from the file system', () => {
        const circuitJson = JSON.parse(readFileSync('public/demo-circuit.json', 'utf-8'))
        const circuit = Circuit.fromJSON(circuitJson)

        assert.equal(circuit.components.length, 5)
        assert.equal(circuit.wires.length, 4)
    })
})
