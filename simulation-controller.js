export class SimulationController {
    constructor(circuit) {
        this.circuit = circuit
    }

    tick() {
        this.circuit.wires.forEach((wire) => wire.propagateSignal())
        this.circuit.components.forEach((component) => component.process())
    }
}
