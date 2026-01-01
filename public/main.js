import { html, render, useRef, useState, useEffect } from 'https://unpkg.com/htm/preact/standalone.module.js'
import { WireAnimator } from './wire.js'
import { SimulationControllerInline } from './simulationController.js'

const createDemoScene = () => ({
    nodes: [
        { id: 'in-a', label: 'Input A', position: { x: 110, y: 120 }, type: 'input' },
        { id: 'out-a', label: 'Probe A', position: { x: 560, y: 200 }, type: 'output' },
        { id: 'in-b', label: 'Input B', position: { x: 110, y: 260 }, type: 'input' },
        { id: 'out-b', label: 'Probe B', position: { x: 520, y: 340 }, type: 'output' }
    ],
    wires: [
        {
            id: 'wire-a',
            source: 'in-a',
            target: 'out-a',
            segments: [
                { from: { x: 120, y: 120 }, to: { x: 420, y: 120 } },
                { from: { x: 420, y: 120 }, to: { x: 560, y: 200 } }
            ],
            signal: { value: 0, phase: 0, offset: 0 },
            style: { width: 8 }
        },
        {
            id: 'wire-b',
            source: 'in-b',
            target: 'out-b',
            segments: [
                { from: { x: 120, y: 260 }, to: { x: 260, y: 260 } },
                { from: { x: 260, y: 260 }, to: { x: 260, y: 340 } },
                { from: { x: 260, y: 340 }, to: { x: 520, y: 340 } }
            ],
            signal: { value: 0, phase: 0, offset: 0.3 },
            style: { width: 8, active: '#7fc8ff' }
        }
    ]
})

const App = () => {
    const canvasRef = useRef(null)
    const animatorRef = useRef(null)
    const simulationRef = useRef(null)
    const sceneRef = useRef(createDemoScene())
    const [running, setRunning] = useState(true)
    const [stepping, setStepping] = useState(false)
    const [duration, setDuration] = useState(1200)

    useEffect(() => {
        if (!canvasRef.current) return undefined
        animatorRef.current = new WireAnimator(canvasRef.current)
        animatorRef.current.setScene(sceneRef.current)
        simulationRef.current = new SimulationControllerInline({
            scene: sceneRef.current,
            duration,
            onRender: (progress, scene) => {
                animatorRef.current?.setScene(scene)
                animatorRef.current?.draw(progress)
            }
        })
        animatorRef.current.draw(0)
        if (running) simulationRef.current.start()

        return () => {
            animatorRef.current?.destroy()
            animatorRef.current = null
            simulationRef.current?.destroy()
            simulationRef.current = null
        }
    }, [])

    useEffect(() => {
        if (!simulationRef.current || stepping) return
        running ? simulationRef.current.start() : simulationRef.current.stop()
    }, [running, stepping])

    useEffect(() => {
        simulationRef.current?.setDuration(duration)
    }, [duration])

    const toggle = () => {
        if (stepping) return
        setRunning((prev) => !prev)
    }

    const handleDuration = (event) => {
        setDuration(Number(event.target.value))
    }

    const handleReset = () => {
        if (!simulationRef.current) return
        const wasStepping = stepping
        if (wasStepping) {
            simulationRef.current.stop()
            setStepping(false)
        }
        const shouldResume = running && !wasStepping
        simulationRef.current.reset({ resume: shouldResume })
    }

    const handleStep = () => {
        if (!simulationRef.current || running || stepping) return
        setStepping(true)
        simulationRef.current.step().finally(() => setStepping(false))
    }

    return html`
        <section>
            <header style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                    <p style=${{ margin: 0, letterSpacing: '0.3em', fontSize: '0.65rem', textTransform: 'uppercase', color: '#8f98ae' }}>Prototype</p>
                    <h1 style=${{ margin: '0.2rem 0 0', fontSize: '1.6rem' }}>Wire Tick Visualizer</h1>
                </div>
                <span class="status">${stepping ? 'stepping' : running ? 'running' : 'paused'}</span>
            </header>

            <div class="controls">
                <button type="button" onClick=${toggle} disabled=${stepping}>${running ? 'Pause' : 'Resume'}</button>
                <button type="button" onClick=${handleReset}>Reset</button>
                <button type="button" onClick=${handleStep} disabled=${running || stepping}>Step</button>
                <label style=${{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#8f98ae' }}>
                    Tick Duration (${duration} ms)
                    <input
                        type="range"
                        min="400"
                        max="2400"
                        step="100"
                        value=${duration}
                        onInput=${handleDuration}
                    />
                </label>
            </div>

            <canvas ref=${canvasRef} width="900" height="420"></canvas>
        </section>
    `
}

const root = document.getElementById('app')
render(html`<${App} />`, root)