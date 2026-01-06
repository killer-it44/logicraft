export class SimulationController {
    step(circuit) {
        circuit.wires.forEach((wire) => wire.propagateSignal())
        circuit.components.forEach((component) => component.process())
    }
}
