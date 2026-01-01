import { TickSimulation } from './simulation.js'

const clamp01 = (value) => Math.min(Math.max(value, 0), 1)

const nodeIdFromEndpoint = (endpoint) => {
    if (!endpoint) return undefined
    return typeof endpoint === 'string' ? endpoint : endpoint.node
}

const pinIdFromEndpoint = (endpoint) => {
    if (!endpoint || typeof endpoint === 'string') return undefined
    return endpoint.pin
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
        this.nodeSignalValues = new Map()
        this.lastPhase = 0
        this.tickCount = 0
        this.initializeSignalValues()
    }

    setScene(scene) {
        this.scene = scene
        this.pendingInputs.clear()
        this.initializeSignalValues()
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
        this.tickCount = 0
        this.lastPhase = 0
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
        const phase = this.normalizeProgress(progress)
        if (this.didCompleteTick(phase)) {
            this.completeWireTransitions()
            this.deliverWireOutputs()
            this.commitPendingInputs()
            this.tickCount += 1
        }
        this.updateWireSignals(phase)
        this.lastPhase = phase
        this.onRender?.(progress, this.scene, { tickCount: this.tickCount })
    }

    updateWireSignals(phase) {
        if (!this.scene?.wires) return
        this.scene.wires.forEach((wire) => {
            const desiredValue = this.resolveSourceValue(wire, phase)
            const signal = this.ensureWireSignal(wire, desiredValue)
            if (signal.transitioning) {
                signal.transitionProgress = this.computeTransitionProgress(signal, phase)
            }
            const needsTransition = !signal.transitioning && desiredValue !== signal.currentValue
            if (needsTransition) {
                signal.transitioning = true
                signal.transitionDirection = desiredValue >= signal.currentValue ? 'fill' : 'clear'
                signal.startPhase = phase
                signal.transitionProgress = 0
                signal.targetValue = desiredValue
            }
            if (!signal.transitioning) {
                signal.targetValue = signal.currentValue
                signal.transitionProgress = signal.currentValue === 1 ? 1 : 0
                signal.startPhase = null
            }
        })
    }

    applyNodeSignals(pinInputs) {
        if (!this.scene?.nodes) return
        this.scene.nodes.forEach((node) => {
            if (node.type === 'binary-display') {
                node.value = this.readPinValue(node, pinInputs, 'input', 0)
            } else if (node.type === 'not-gate') {
                const input = this.readPinValue(node, pinInputs, 'input', 0)
                node.value = input ? 0 : 1
            }
            if (typeof node.value === 'number' && this.nodeDrivesOutputs(node)) {
                this.nodeSignalValues.set(node.id, node.value)
            }
        })
    }

    readPinValue(node, pinInputs, kind, defaultValue = 0) {
        if (!node?.pins?.length) return defaultValue
        const pin = node.pins.find((candidate) => candidate.kind === kind)
        if (!pin) return defaultValue
        return pinInputs.has(pin.id) ? pinInputs.get(pin.id) : defaultValue
    }

    destroy() {
        this.tick.destroy()
        this.pendingInputs.clear()
        this.nodeSignalValues.clear()
    }

    initializeSignalValues() {
        this.nodeSignalValues.clear()
        this.lastPhase = 0
        this.tickCount = 0
        if (!this.scene?.nodes) return
        if (this.scene?.wires) {
            this.scene.wires.forEach((wire) => {
                if (wire.signal) delete wire.signal
            })
        }
        this.scene.nodes.forEach((node) => {
            const value = typeof node.value === 'number' ? node.value : 0
            this.nodeSignalValues.set(node.id, value)
            if (typeof node.value !== 'number') node.value = value
        })
        this.updateWireSignals(0)
        this.completeWireTransitions()
        this.deliverWireOutputs()
    }

    commitPendingInputs() {
        if (!this.pendingInputs.size) return
        this.pendingInputs.forEach((value, id) => {
            this.nodeSignalValues.set(id, value)
        })
        this.pendingInputs.clear()
    }

    deliverWireOutputs() {
        if (!this.scene?.wires?.length) return
        const pinInputs = new Map()
        this.scene.wires.forEach((wire) => {
            const targetPin = pinIdFromEndpoint(wire.target)
            if (!targetPin) return
            const value = typeof wire.signal?.currentValue === 'number'
                ? wire.signal.currentValue
                : 0
            pinInputs.set(targetPin, value)
        })
        this.applyNodeSignals(pinInputs)
    }

    nodeDrivesOutputs(node) {
        return Boolean(node?.pins?.some((pin) => pin.kind === 'output'))
    }

    normalizeProgress(progress) {
        return ((progress % 1) + 1) % 1
    }

    didCompleteTick(phase) {
        const wrapped = phase < this.lastPhase
        const singleEnded = !wrapped && this.tick?.mode === 'single' && phase >= 0.999
        return wrapped || singleEnded
    }

    completeWireTransitions() {
        if (!this.scene?.wires) return
        this.scene.wires.forEach((wire) => {
            const signal = wire.signal
            if (!signal) return
            if (signal.transitioning) {
                signal.transitioning = false
                if (typeof signal.targetValue === 'number') {
                    signal.currentValue = signal.targetValue
                } else if (typeof signal.currentValue !== 'number') {
                    signal.currentValue = 0
                }
            }
            if (typeof signal.currentValue === 'number') {
                signal.transitionProgress = signal.currentValue === 1 ? 1 : 0
                signal.targetValue = signal.currentValue
                signal.startPhase = null
            }
        })
    }

    ensureWireSignal(wire, desiredValue) {
        if (!wire.signal) {
            wire.signal = {
                currentValue: desiredValue,
                targetValue: desiredValue,
                transitioning: false,
                transitionDirection: desiredValue ? 'fill' : 'clear',
                transitionProgress: desiredValue ? 1 : 0,
                startPhase: null
            }
            return wire.signal
        }
        const signal = wire.signal
        if (typeof signal.currentValue !== 'number') {
            signal.currentValue = desiredValue
        }
        if (typeof signal.targetValue !== 'number') {
            signal.targetValue = signal.currentValue
        }
        if (typeof signal.transitionProgress !== 'number') {
            signal.transitionProgress = signal.currentValue === 1 ? 1 : 0
        }
        if (!signal.transitionDirection) {
            signal.transitionDirection = signal.currentValue ? 'fill' : 'clear'
        }
        if (!('startPhase' in signal)) {
            signal.startPhase = null
        }
        return signal
    }

    computeTransitionProgress(signal, currentPhase) {
        if (signal.startPhase == null) return 0
        let delta = currentPhase - signal.startPhase
        if (delta < 0) delta += 1
        return clamp01(delta)
    }

    resolveSourceValue(wire, phase) {
        const sourceId = nodeIdFromEndpoint(wire.source)
        const sourceValue = sourceId ? this.nodeSignalValues.get(sourceId) : undefined
        if (typeof sourceValue === 'number') {
            return sourceValue
        }
        return 0
    }
}
