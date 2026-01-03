import { render, html, useState } from 'preact-standalone'
import { ToggleNode, NotGateNode, AndGateNode, OrGateNode, NandGateNode, NorGateNode, XorGateNode, XnorGateNode, WirePath, DisplayProbeNode } from './ui-components.js'
import { Canvas } from './canvas.js'

const App = () => {
    const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 })

    return html`
        <main style="width: 100vw; height: 100vh; overflow: hidden;">
            <${Canvas} onPointerMove=${setPointerPosition}>
                <${ToggleNode} label="Input" position=${{ x: 100, y: 20 }} active=${false} />
                <${NotGateNode} label="NOT" position=${{ x: 240, y: 20 }} />
                <${AndGateNode} label="AND" position=${{ x: 240, y: 120 }} />
                <${OrGateNode} label="OR" position=${{ x: 240, y: 220 }} />
                <${NandGateNode} label="NAND" position=${{ x: 240, y: 320 }} />
                <${NorGateNode} label="NOR" position=${{ x: 240, y: 420 }} />
                <${XorGateNode} label="XOR" position=${{ x: 340, y: 320 }} />
                <${XnorGateNode} label="XNOR" position=${{ x: 340, y: 420 }} />
                <${DisplayProbeNode} label="Output" position=${{ x: 440, y: 240 }} />
                <${WirePath} segments=${[
                    { from: { x: 360, y: 40 }, to: { x: 450, y: 40 } },
                    { from: { x: 450, y: 40 }, to: { x: 450, y: 180 } },
                    { from: { x: 450, y: 180 }, to: { x: 540, y: 180 } }
                ]} />
            <//>
            <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(255, 255, 255, 0.8); padding: 4px 8px; border-radius: 4px; font-family: sans-serif; font-size: 14px;">
                x: ${Math.round(pointerPosition.x)}, y: ${Math.round(pointerPosition.y)}
            </div>
        </main>
    `
}

const root = document.getElementById('app')
render(html`<${App} />`, root)
