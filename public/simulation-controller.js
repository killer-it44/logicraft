import { TickSimulation } from './simulation.js'

const nodeIdFromEndpoint = (endpoint) => {
    if (!endpoint) return undefined
    return typeof endpoint === 'string' ? endpoint : endpoint.node
}

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
        const normalized = ((progress % 1) + 1) % 1
        this.scene.wires.forEach((wire) => {
            if (!wire.signal) wire.signal = {}
            wire.signal.phase = normalized
            const sourceId = nodeIdFromEndpoint(wire.source)
            const sourceValue = sourceId ? nodeLookup?.get(sourceId)?.value : undefined
            if (typeof sourceValue === 'number') {
                wire.signal.value = sourceValue
            } else {
                wire.signal.value = normalized > 0.5 ? 1 : 0
            }
        })
        if (nodeLookup) this.syncDisplayValues(nodeLookup)
    }

    syncDisplayValues(nodeLookup) {
        this.scene.nodes.forEach((node) => {
            if (node.type === 'binary-display' && typeof node.value !== 'number') {
                node.value = 0
            }
        })
        this.scene.wires.forEach((wire) => {
            const targetId = nodeIdFromEndpoint(wire.target)
            if (!targetId) return
            const node = nodeLookup.get(targetId)
            if (!node || node.type === 'digital-toggle') return
            if (typeof wire.signal?.value === 'number') {
                node.value = wire.signal.value
            }
        })
    }

    destroy() {
        this.tick.destroy()
        this.pendingInputs.clear()
    }
}
