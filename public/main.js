import { html, render, useRef, useState, useEffect } from 'https://unpkg.com/htm/preact/standalone.module.js'
import { SceneRenderer } from './scene-renderer.js'
import { SimulationControllerInline } from './simulation-controller.js'

const NODE_HIT_RADIUS = 16

const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

const App = () => {
    const canvasRef = useRef(null)
    const rendererRef = useRef(null)
    const simulationRef = useRef(null)
    const sceneRef = useRef(null)
    const [running, setRunning] = useState(true)
    const [stepping, setStepping] = useState(false)
    const [duration, setDuration] = useState(1200)
    const [scene, setScene] = useState(null)
    const [loadingScene, setLoadingScene] = useState(true)
    const [sceneError, setSceneError] = useState(null)

    useEffect(() => {
        let cancelled = false

        const loadScene = async () => {
            try {
                const response = await fetch('./demo-scene.json')
                if (!response.ok) throw new Error(`Failed to load scene: ${response.status}`)
                const data = await response.json()
                if (cancelled) return
                sceneRef.current = data
                setScene(data)
            } catch (error) {
                if (cancelled) return
                console.error('Unable to load demo scene', error)
                setSceneError(error)
            } finally {
                if (!cancelled) setLoadingScene(false)
            }
        }

        loadScene()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (!canvasRef.current || !scene) return undefined

        rendererRef.current = new SceneRenderer(canvasRef.current)
        rendererRef.current.setScene(scene)
        sceneRef.current = scene
        simulationRef.current = new SimulationControllerInline({
            scene: sceneRef.current,
            duration,
            onRender: (progress, scene) => {
                rendererRef.current?.setScene(scene)
                rendererRef.current?.draw(progress)
            }
        })
        rendererRef.current.draw(0)
        if (running) simulationRef.current.start()

        return () => {
            rendererRef.current?.destroy()
            rendererRef.current = null
            simulationRef.current?.destroy()
            simulationRef.current = null
        }
    }, [scene])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !scene) return undefined

        const handleClick = (event) => {
            if (!sceneRef.current || !simulationRef.current) return
            const rect = canvas.getBoundingClientRect()
            const point = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            }
            const targetNode = findInputNodeAt(point)
            if (!targetNode) return
            toggleInputNodeValue(targetNode)
        }

        canvas.addEventListener('click', handleClick)
        return () => {
            canvas.removeEventListener('click', handleClick)
        }
    }, [scene])

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

    const findInputNodeAt = (point) => {
        const nodes = sceneRef.current?.nodes || []
        return nodes.find(
            (node) => node.type === 'input' && distanceBetween(node.position, point) <= NODE_HIT_RADIUS
        )
    }

    const toggleInputNodeValue = (node) => {
        if (!simulationRef.current) return
        const nextValue = node.value === 1 ? 0 : 1
        simulationRef.current.sendInput({ id: node.id, value: nextValue }).then(() => {
            rendererRef.current?.setScene(sceneRef.current)
            rendererRef.current?.draw()
        })
    }

    if (loadingScene) {
        return html`<section><p style=${{ color: '#8f98ae' }}>Loading demo scene…</p></section>`
    }

    if (sceneError) {
        return html`<section><p style=${{ color: '#f07178' }}>Could not load demo scene.</p></section>`
    }

    if (!scene) {
        return html`<section><p style=${{ color: '#f07178' }}>Scene data unavailable.</p></section>`
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