import { render, html } from 'preact-standalone'
import { CircuitCanvas, ToggleNode, WirePath } from './ui-components.js'

const segments = [
                    { "from": { "x": 160, "y": 140 }, "to": { "x": 250, "y": 140 } },
                    { "from": { "x": 250, "y": 140 }, "to": { "x": 250, "y": 280 } },
                    { "from": { "x": 250, "y": 280 }, "to": { "x": 340, "y": 280 } }
]

const App = () => html`
    <main style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#e2e8f0;">
        <${CircuitCanvas} width=800 height=480>
            <${ToggleNode} id="toggle0" label="a" position=${{ x: 100, y: 100 }} activated=${false} / >
            <${WirePath} id="wire0" segments=${segments} / >
        <//>
    </main>
`

const root = document.getElementById('app')
render(html`<${App} />`, root)
