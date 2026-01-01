export class TickSimulation {
    constructor({ duration = 1200, onUpdate } = {}) {
        this.duration = duration
        this.onUpdate = onUpdate
        this.running = false
        this.mode = 'loop'
        this.frameId = null
        this.tickStart = 0
        this.stepResolve = null
        this.loop = this.loop.bind(this)
    }

    setOnUpdate(handler) {
        this.onUpdate = handler
    }

    setDuration(ms) {
        this.duration = Math.max(200, ms)
        if (this.running) {
            this.tickStart = performance.now()
        }
    }

    start() {
        if (this.running) return
        this.mode = 'loop'
        this.running = true
        this.tickStart = performance.now()
        this.frameId = requestAnimationFrame(this.loop)
    }

    stop(resetMode = true) {
        this.running = false
        if (this.frameId) cancelAnimationFrame(this.frameId)
        this.frameId = null
        if (resetMode) {
            this.mode = 'loop'
            this.stepResolve = null
        }
    }

    resetTick({ resume = false } = {}) {
        const wasRunning = this.running
        this.stop(false)
        this.tickStart = performance.now()
        this.onUpdate?.(0)
        if (resume && wasRunning) {
            this.start()
        }
    }

    stepOnce(done) {
        if (this.running) return
        this.mode = 'single'
        this.stepResolve = typeof done === 'function' ? done : null
        this.running = true
        this.tickStart = performance.now()
        this.frameId = requestAnimationFrame(this.loop)
    }

    loop(time) {
        if (!this.running) return
        const elapsed = time - this.tickStart
        const duration = this.duration
        const progress = this.mode === 'single'
            ? Math.min(elapsed / duration, 1)
            : (elapsed % duration) / duration

        this.onUpdate?.(progress)

        if (this.mode === 'single' && elapsed >= duration) {
            this.stop()
            const done = this.stepResolve
            this.stepResolve = null
            done?.()
            return
        }

        this.frameId = requestAnimationFrame(this.loop)
    }

    destroy() {
        this.stop()
    }
}
