import { render, html, useState } from 'preact-standalone'
import { Canvas } from './canvas.js'

const App = () => {
    const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 })

    return html`
        <main style="width: 100vw; height: 100vh; overflow: hidden;">
            <${Canvas} onPointerMove=${setPointerPosition} />
            <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(255, 255, 255, 0.8); padding: 4px 8px; border-radius: 4px; font-family: sans-serif; font-size: 14px;">
                x: ${Math.round(pointerPosition.x)}, y: ${Math.round(pointerPosition.y)}
            </div>
        </main>
    `
}

const root = document.getElementById('app')
render(html`<${App} />`, root)
