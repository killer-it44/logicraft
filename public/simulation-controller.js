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
        if (this.scene?.nodes) {
            const node = this.scene.nodes.find((candidate) => candidate.id === id)
            if (node) node.value = value
        }
        return Promise.resolve()
    }

    handleProgress(progress) {
        this.applyWireSignals(progress)
        this.onRender?.(progress, this.scene)
    }

    applyWireSignals(progress) {
        if (!this.scene?.wires) return
        const nodeLookup = this.scene?.nodes
            ? new Map(this.scene.nodes.map((node) => [node.id, node]))
            : null
        this.scene.wires.forEach((wire) => {
            if (!wire.signal) wire.signal = {}
            const normalized = ((progress % 1) + 1) % 1
            wire.signal.phase = normalized
            const sourceValue = nodeLookup?.get(wire.source)?.value
            if (typeof sourceValue === 'number') {
                wire.signal.value = sourceValue
            } else {
                wire.signal.value = normalized > 0.5 ? 1 : 0
            }
        })
    }

    destroy() {
        this.tick.destroy()
        this.pendingInputs.clear()
    }
}
