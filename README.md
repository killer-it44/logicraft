# logisiml

Lightweight logic-gate playground with a static Node server and a no-build Preact + htm frontend.

## Agreed Scope
- **Server**: Node-only static file host (no simulation logic, no SSR).
- **Frontend**: Browser-based, interactive editor with future support for dragging wires, toggling inputs, and sleek minimal styling.
- **Rendering tech**: HTML shell + `<canvas>` for dynamic circuit visuals; Preact (via `htm/preact/standalone`) handles UI state without a bundler. Leaves room to offload heavy simulation logic to workers/WASM later if needed.
- **Initial milestone**: Render a single wire and show a 0→1 transition over one tick (traveling bit animation or color pulse) to validate the render/tick loop.
- **Future considerations**: Desktop-first responsive layout, eventual mobile support, separation between simulation core and rendering, potential Web Worker/WASM upgrade path, and accessibility once core interactions stabilize.

## Proposed Structure
```
logisiml/
├─ server.js           # Tiny Node static file host
├─ package.json        # npm metadata + start script
└─ public/
      ├─ index.html       # Minimal shell loading Preact + canvas
      ├─ styles.css       # Sleek minimal tokens
      ├─ main.js          # Bootstraps Preact + canvas
      ├─ demoScene.json   # Sample scene data used on load
      ├─ svg-scene.js     # Preact SVG renderer (current UI)
      ├─ scene-renderer.js # Legacy canvas renderer for experiments
      ├─ simulation.js    # Tick controller / future simulation hook
      └─ node-renderer.js  # Node markers/labels overlay
```

## Next Steps
1. Enrich the scene schema (node roles, net metadata, future gate shells) so later logic work doesn’t require reshuffling saved scenes.
2. Add interactable input controls in the UI (e.g., click to toggle an input node) to prove the controller/renderer react to live edits.
3. Introduce a lightweight scene validation helper that warns when wires reference missing nodes or layout data is inconsistent.
4. Lock down the simulation-controller abstraction (`start/stop/reset/step/sendInput/setScene`) so swapping in a worker-backed version is trivial.
5. Draft the worker messaging scaffold (message types, optional echo worker) to smooth the eventual move off the main thread.

## Simulation / Rendering Split Plan

### Single-thread baseline
1. **UI thread components**
      - `TickSimulation`: orchestrates tick timing, owns play/pause/step, emits progress updates.
      - `SceneSvg`: reacts to scene mutations and renders wires/nodes using SVG.
      - `App` state: holds `scene`, dispatches control intents (toggle inputs, move nodes), and forwards mutations to both simulation and renderer.
2. **Data flow**
      - `App` passes canonical `scene` (nodes, wires, nets) to renderer via `setScene(scene)`.
      - `TickSimulation` calls `onUpdate(progress)` each frame; handler mutates `scene.wires[*].signal` and nudges `SceneSvg` (via state) to re-render.
      - Inputs (UI toggles, clocks) dispatch `simulationRef.current.queueEvent({ type: 'input', id, value })` to update logical state before next tick.

### Worker-ready abstraction
1. **Simulation interface** (works both inline and in worker):
      ```ts
      type SimMessage =
             | { type: 'init', scene, options }
             | { type: 'tick', time }
             | { type: 'input', id, value }
             | { type: 'set-duration', ms }
             | { type: 'reset' }
             | { type: 'step' }

      type SimResponse =
             | { type: 'state', nets, timestamp }
             | { type: 'ack', requestId }
             | { type: 'error', message }
      ```
2. **Main thread responsibilities**
      - Maintain authoritative `scene` for layout + selection.
      - Mirror worker state to renderer: when a `SimResponse` arrives, update `scene.wires[*].signal` based on the net/wire mapping.
      - Keep UI controls agnostic: they call an abstraction (`simulationController`) that internally either proxies to worker `postMessage` or calls the inline `TickSimulation`.
3. **Worker responsibilities**
      - Hold the mutable simulation graph (nets, gate states) and timing data.
      - Process `tick` messages using `performance.now()` (or timestamps provided by main thread) to stay in sync with requestAnimationFrame.
      - Respond with `state` messages that include only the data needed for rendering (net values, phases, optional metadata like gate outputs).

### Migration path
1. Keep current inline `TickSimulation` as `SimulationControllerInline` implementing the message interface directly.
2. When ready, add `SimulationControllerWorker` that spins up a worker (e.g., `simulationWorker.js`), forwards the same messages, and returns Promises for responses.
3. UI components depend only on `simulationController` API (`start()`, `stop()`, `reset()`, `step()`, `setDuration()`, `sendInput()`), so switching between inline and worker implementations is a constructor option.
4. Later, the worker can host a WASM module for heavy gate evaluations—message schema remains unchanged; only the worker internals change.

### Performance considerations
- `scene` stays on main thread to avoid constant `structuredClone` overhead for large graphs; only simulation state snapshots traverse the worker boundary.
- Prefer delta updates (net IDs + new values) over shipping the entire scene on every tick.
- Ensure tick pacing stays tied to `requestAnimationFrame`; the main thread sends `tick` messages with the frame timestamp so worker results align with the render loop.

## Wire + Node Schema Sketch

Goal: describe circuits in a way that the renderer can draw any number of wire segments while the simulation core manipulates only data, not canvas calls.

### Core entities
- **Node**: named coordinate anchor in logical space with zero or more pins describing where wires attach.
   ```json
   {
            "id": "toggle-a",
            "label": "Toggle A",
            "position": { "x": 120, "y": 80 },
            "type": "digital-toggle",
            "pins": [
                  { "id": "toggle-a-out", "kind": "output", "position": { "x": 134, "y": 80 } }
            ],
            "value": 1
   }
   ```
- **Gate node**: same structure, but multiple pins (e.g., input + output) and a `type` like `not-gate`. Simulation derives its output value from incoming pin signals and exposes it to connected wires.
- **Wire**: ordered set of segments connecting two endpoints (node + specific pin) plus style metadata.
   ```json
   {
         "id": "w1",
            "source": { "node": "toggle-a", "pin": "toggle-a-out" },
            "target": { "node": "probe-a", "pin": "probe-a-in" },
         "segments": [
               { "from": { "x": 120, "y": 80 }, "to": { "x": 220, "y": 80 } },
               { "from": { "x": 220, "y": 80 }, "to": { "x": 220, "y": 140 } }
         ],
         "signal": { "value": 0, "phase": 0.0 }
   }
   ```
- **Net**: optional higher-level grouping so multiple wires can share the same logical signal while rendering separately.

### Rendering contract
- Canvas layer consumes `{ nodes, wires }` plus viewport scale. Each wire segment is drawn in order; the "traveling bit" animation uses `signal.phase` to know where to place the glow (phase 0..1 across the wire length).
- Renderer maintains no business logic; it only interpolates positions and visual states from the schema.

### Simulation contract
- Simulation updates `signal.value` and `signal.phase` per net/wire each tick.
- Wires reference node IDs only, so gates can move nodes without rewriting segment arrays—just recompute `segments` from node positions.
- Schema is serializable, enabling save/load and possible worker transfer via `structuredClone`.
