import { Clock } from './circuit.js'

export class SimulationController {
    constructor({ stepsPerClockTick }) {
        this.stepsPerClockTick = Math.max(stepsPerClockTick, 4)
        this.pauseAfterStep = 500
        this.steps = 0
    }

    step(circuit) {
        // Clock will stay "on" for half of the clock tick duration, up to a maximum of 5 steps
        const clockOnSteps = Math.min(this.stepsPerClockTick / 2, 5)
        const isClockOn = this.steps % this.stepsPerClockTick >= this.stepsPerClockTick - clockOnSteps
        circuit.components.filter(c => c instanceof Clock).forEach(c => c.tick(isClockOn))
        circuit.wires.forEach((wire) => wire.propagateSignal())
        circuit.components.forEach((component) => component.process())
        this.steps++
    }

    async tick(circuit, onStep) {
        for (let i = (this.steps % this.stepsPerClockTick) || 1; i % (this.stepsPerClockTick + 1) !== 0; i++) {
            this.step(circuit)
            onStep()
            await new Promise(resolve => setTimeout(resolve, this.pauseAfterStep))
            if (!this.isPlaying) break
        }
    }

    async play(circuit, onStep) {
        if (!this.isPlaying) {
            this.isPlaying = true
            while (this.isPlaying) {
                await this.tick(circuit, onStep)
            }
        }
    }

    pause() {
        this.isPlaying = false
    }

    reset(circuit) {
        this.steps = 0
        circuit.resetState()
    }
}
