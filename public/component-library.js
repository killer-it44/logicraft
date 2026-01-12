import { html, useState } from 'preact-standalone'

export function ComponentLibrary({ components, onCreate }) {
    const accents = ['#fb923c',  '#10b981', '#fbbf24', '#f43f5e', '#8b5cf6', '#22d3ee', '#a3e635', '#f97316' ]
    const [isMinimized, setMinimized] = useState(true)

    return html`
        <style>
            .library-component {
                border-radius: 6px;
                background: #ffffff;
                padding: 12px 14px;
                transition: transform 0.15s ease;
                text-align: left;
            }
            .library-component:hover {
                transform: translateX(4px);
            }
        </style>
        <button style="position: absolute; top: 4px; right: 12px;" type="button" onClick=${() => setMinimized(!isMinimized)}>
            ${isMinimized ? '＞' : '＜'}
        </button>
        ${isMinimized ? html`<div>📁</div>` : html`
            <h2 style="margin: 0;">LIBRARY 📁</h2>
            <div style="color: #d4d4d4">Click to create.</div>
        `}
        <div style="display: flex; flex-direction: column; gap: 10px; padding-right: 6px; color: #0f172a; max-height: 100%; overflow-y: auto;">
        ${components.map((entry, index) => html`
            <button class="library-component" type="button" onClick=${() => onCreate(entry.type)} style="box-shadow: inset 4px 0 0 ${accents[index % accents.length]};">
                <h3 style="margin: 0;">${isMinimized ? entry.shortTitle : entry.title}</h3>
                ${!isMinimized  && html`<span style="color: #0f172aa6;">${entry.description}</span>`}
            </button>
        `)}
        </div>
    `
}
