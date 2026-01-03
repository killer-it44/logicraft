import { render, html, useState } from 'preact-standalone'
import { ToggleNode, WirePath, DisplayProbeNode, AndGateNode, NotGateNode } from './ui-components.js'
import { Canvas } from './canvas.js'

const App = () => {
    const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 })

    return html`
        <main style="width: 100vw; height: 100vh; overflow: hidden;">
            <${Canvas} onPointerMove=${setPointerPosition}>
                <${ToggleNode} id="toggle0" label="Input" position=${{ x: 100, y: 100 }} active=${false} />
                <${WirePath} id="wire0" segments=${[
                    { from: { x: 160, y: 140 }, to: { x: 250, y: 140 } },
                    { from: { x: 250, y: 140 }, to: { x: 250, y: 280 } },
                    { from: { x: 250, y: 280 }, to: { x: 340, y: 280 } }
                ]} />
                <${NotGateNode} id="and0" label="NOT" position=${{ x: 240, y: 100 }} />
                <${AndGateNode} id="and0" label="AND" position=${{ x: 240, y: 200 }} />
                <${DisplayProbeNode} id="probe0" label="Output" position=${{ x: 340, y: 240 }} />
            <//>
            <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(255, 255, 255, 0.8); padding: 4px 8px; border-radius: 4px; font-family: sans-serif; font-size: 14px;">
                x: ${Math.round(pointerPosition.x)}, y: ${Math.round(pointerPosition.y)}
            </div>
        </main>
    `
}

const root = document.getElementById('app')
render(html`<${App} />`, root)
