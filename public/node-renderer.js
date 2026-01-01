export class NodeRenderer {
    constructor() {
        this.nodes = []
    }

    setNodes(nodes) {
        this.nodes = nodes || []
    }

    draw(ctx) {
        if (!this.nodes?.length) return
        this.nodes.forEach((node) => {
            const color = this.colorForType(node.type)
            this.drawMarker(ctx, node, color)
            if (node.pins?.length) this.drawPins(ctx, node, color)
            if (node.label) this.drawLabel(ctx, node)
        })
    }

    colorForType(type) {
        switch (type) {
            case 'digital-toggle':
                return '#6decb9'
            case 'binary-display':
                return '#7fc8ff'
            case 'junction':
                return '#f6d365'
            default:
                return '#c7c9d3'
        }
    }

    drawMarker(ctx, node, color) {
        const { x, y } = node.position
        ctx.fillStyle = '#050607'
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 11, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        const hasValue = typeof node.value === 'number'
        ctx.fillStyle = hasValue && node.value ? color : '#1b2530'
        ctx.beginPath()
        ctx.arc(x, y, hasValue ? 6 : 4, 0, Math.PI * 2)
        ctx.fill()
    }

    drawPins(ctx, node, color) {
        node.pins.forEach((pin) => {
            const { x, y } = pin.position
            ctx.fillStyle = '#0f141c'
            ctx.strokeStyle = color
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
        })
    }

    drawLabel(ctx, node) {
        ctx.font = '13px Space Grotesk, system-ui'
        ctx.fillStyle = '#e6e7ef'
        ctx.textBaseline = 'top'
        const suffix = typeof node.value === 'number' ? ` (${node.value})` : ''
        ctx.fillText(`${node.label}${suffix}`, node.position.x + 14, node.position.y - 18)
    }
}
