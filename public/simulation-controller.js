export class SimulationController {
    constructor({ stepsPerTick }) {
        this.stepsPerTick = stepsPerTick
        this.pauseAfterTick = 1000
    }

    step(circuit) {
        circuit.wires.forEach((wire) => wire.propagateSignal())
        circuit.components.forEach((component) => component.process())
    }

    tick(circuit) {
        for (let i = 0; i < this.stepsPerTick; i++) {
            this.step(circuit)
        }
    }

    async play(circuit, onTick) {
        if (!this.isPlaying) {
            this.isPlaying = true
            while (this.isPlaying) {
                this.tick(circuit)
                onTick()
                await new Promise(resolve => setTimeout(resolve, this.pauseAfterTick))
            }
        }
    }

    pause() {
        this.isPlaying = false
    }
}
