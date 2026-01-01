import { TickSimulation } from './simulation.js'

export class SimulationControllerInline {
    constructor({ scene, duration = 1200, onRender } = {}) {
        this.scene = scene
        this.onRender = onRender
        this.tick = new TickSimulation({
            duration,
            onUpdate: (progress) => this.handleProgress(progress)
        })
        this.pendingInputs = new Map()
    }

    setScene(scene) {
        this.scene = scene
    }

    setOnRender(callback) {
        this.onRender = callback
    }

    setDuration(ms) {
        this.tick.setDuration(ms)
    }

    start() {
        this.tick.start()
    }

    stop() {
        this.tick.stop()
    }

    reset({ resume = false } = {}) {
        this.tick.resetTick({ resume })
    }

    step() {
        if (this.tick.running) return Promise.resolve()
        return new Promise((resolve) => {
            this.tick.resetTick()
            this.tick.stepOnce(() => resolve())
        })
    }

    sendInput({ id, value }) {
        this.pendingInputs.set(id, value)
        return Promise.resolve()
    }

    handleProgress(progress) {
        this.applyWireSignals(progress)
        this.onRender?.(progress, this.scene)
    }

    applyWireSignals(progress) {
        if (!this.scene?.wires) return
        this.scene.wires.forEach((wire) => {
            if (!wire.signal) wire.signal = {}
            const offset = typeof wire.signal.offset === 'number' ? wire.signal.offset : 0
            const phase = (progress + offset) % 1
            const normalized = phase < 0 ? phase + 1 : phase
            wire.signal.phase = normalized
            wire.signal.value = normalized > 0.5 ? 1 : 0
        })
    }

    destroy() {
        this.tick.destroy()
        this.pendingInputs.clear()
    }
}
