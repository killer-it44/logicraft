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
            this.drawMarker(ctx, node.position, color)
            if (node.label) this.drawLabel(ctx, node)
        })
    }

    colorForType(type) {
        switch (type) {
            case 'input':
                return '#6decb9'
            case 'output':
                return '#7fc8ff'
            case 'junction':
                return '#f6d365'
            default:
                return '#c7c9d3'
        }
    }

    drawMarker(ctx, position, color) {
        const { x, y } = position
        ctx.fillStyle = '#050607'
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 11, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
    }

    drawLabel(ctx, node) {
        ctx.font = '13px Space Grotesk, system-ui'
        ctx.fillStyle = '#e6e7ef'
        ctx.textBaseline = 'top'
        ctx.fillText(node.label, node.position.x + 14, node.position.y - 18)
    }
}
