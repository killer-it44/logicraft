import { NodeRenderer } from './nodeRenderer.js'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const easeInOut = (t) => 0.5 * (1 - Math.cos(Math.PI * clamp(t, 0, 1)))

const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

export class WireAnimator {
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.pixelRatio = window.devicePixelRatio || 1
        this.logicalWidth = canvas.clientWidth
        this.logicalHeight = canvas.clientHeight
        this.progress = 0
        this.scene = { nodes: [], wires: [] }
        this.nodeRenderer = new NodeRenderer()
        this.handleResize = this.resize.bind(this)
        window.addEventListener('resize', this.handleResize)
        this.resize()
    }

    resize() {
        this.pixelRatio = window.devicePixelRatio || 1
        const rect = this.canvas.getBoundingClientRect()
        this.logicalWidth = rect.width || this.canvas.width
        this.logicalHeight = rect.height || this.canvas.height
        this.canvas.width = Math.round(this.logicalWidth * this.pixelRatio)
        this.canvas.height = Math.round(this.logicalHeight * this.pixelRatio)
        this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
    }

    setScene(scene) {
        this.scene = scene || { nodes: [], wires: [] }
        this.nodeRenderer.setNodes(this.scene.nodes)
    }

    destroy() {
        window.removeEventListener('resize', this.handleResize)
    }

    draw(progress = this.progress) {
        this.progress = clamp(progress, 0, 1)
        const ctx = this.ctx
        if (!ctx) return

        ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
        const width = this.logicalWidth
        const height = this.logicalHeight
        ctx.clearRect(0, 0, width, height)

        const hasWires = Boolean(this.scene?.wires?.length)
        if (!hasWires) {
            this.drawPlaceholder(ctx, width, height)
        } else {
            this.scene.wires.forEach((wire) => this.drawWire(ctx, wire))
            this.nodeRenderer.draw(ctx)
        }

        this.drawHud(ctx)
    }

    drawPlaceholder(ctx, width, height) {
        const margin = 40
        const y = height / 2
        const startX = margin
        const endX = width - margin
        const eased = easeInOut(this.progress)
        const traveledX = startX + (endX - startX) * eased

        ctx.lineWidth = 8
        ctx.lineCap = 'round'

        ctx.strokeStyle = '#1b2530'
        ctx.beginPath()
        ctx.moveTo(startX, y)
        ctx.lineTo(endX, y)
        ctx.stroke()

        ctx.strokeStyle = '#5ee1a0'
        ctx.beginPath()
        ctx.moveTo(startX, y)
        ctx.lineTo(traveledX, y)
        ctx.stroke()

        this.drawBit(ctx, { x: traveledX, y }, '#5ee1a0', 10)
    }

    drawWire(ctx, wire) {
        const segments = wire.segments || []
        if (!segments.length) return
        const style = {
            width: wire.style?.width ?? 8,
            idle: wire.style?.idle ?? '#1b2530',
            active: wire.style?.active ?? '#5ee1a0',
            bitRadius: wire.style?.bitRadius ?? 9
        }

        this.strokeSegments(ctx, segments, style.width, style.idle)
        const phase = clamp(wire.signal?.phase ?? this.progress, 0, 1)
        const bitPoint = this.strokeActive(ctx, segments, style.width, style.active, phase)
        this.drawBit(ctx, bitPoint, style.active, style.bitRadius)
    }

    strokeSegments(ctx, segments, width, color) {
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.strokeStyle = color
        ctx.beginPath()
        segments.forEach((segment, index) => {
            if (index === 0) {
                ctx.moveTo(segment.from.x, segment.from.y)
            } else {
                ctx.lineTo(segment.from.x, segment.from.y)
            }
            ctx.lineTo(segment.to.x, segment.to.y)
        })
        ctx.stroke()
    }

    strokeActive(ctx, segments, width, color, phase) {
        if (phase <= 0) return null
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.strokeStyle = color
        const total = segments.reduce((sum, segment) => sum + distance(segment.from, segment.to), 0)
        if (total === 0) return null
        const target = Math.min(total * phase, total)
        let remaining = target
        let started = false
        let bitPoint = null

        ctx.beginPath()
        for (const segment of segments) {
            if (remaining <= 0) break
            const segLength = distance(segment.from, segment.to)
            if (!started) {
                ctx.moveTo(segment.from.x, segment.from.y)
                started = true
            } else {
                ctx.lineTo(segment.from.x, segment.from.y)
            }

            if (remaining >= segLength) {
                ctx.lineTo(segment.to.x, segment.to.y)
                remaining -= segLength
                bitPoint = { x: segment.to.x, y: segment.to.y }
            } else {
                const ratio = remaining / segLength
                const midX = segment.from.x + (segment.to.x - segment.from.x) * ratio
                const midY = segment.from.y + (segment.to.y - segment.from.y) * ratio
                ctx.lineTo(midX, midY)
                bitPoint = { x: midX, y: midY }
                remaining = 0
            }
        }

        if (started) ctx.stroke()
        return bitPoint
    }

    drawBit(ctx, point, color, radius) {
        if (!point) return
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = 18
        ctx.beginPath()
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
    }

    drawHud(ctx) {
        ctx.font = '16px Space Grotesk, system-ui'
        ctx.fillStyle = '#8f98ae'
        ctx.fillText(`tick: ${(this.progress * 100).toFixed(0)}%`, 24, 32)
    }
}
