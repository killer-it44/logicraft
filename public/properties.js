import { html } from 'preact-standalone'
import { Wire } from './circuit.js'
export function Properties({ element }) {

    return html`
        <style>
            .property-container {
                margin-top: 0.5em;
            }
            .property-container div {
                display: flex;
                gap: 1em;
                justify-content: space-between;
            }
        </style>
        <div style="display:flex; flex-direction: column;">
            <div style="font-weight: bold">${element.id}</div>
            <div style="font-size: 12px; color: #94a3b8;">${element instanceof Wire ? 'wire' : element.type}</div>
            <div class="property-container">
            ${element instanceof Wire ? html`
                <div><span>From:</span><span>${Math.round(element.from.x)}, ${Math.round(element.from.y)}</span></div>
                <div><span>To:</span><span>${Math.round(element.to.x)}, ${Math.round(element.to.y)}</span></div>
                <div><span>Source:</span>${element.sourcePin ? html`<span style="color:${element.sourcePin.value ? '#34d399' : '#ef4444'}">${element.sourcePin.component.id}/${element.sourcePin.id}</span>` : 'none'}</div>
                <div><span>Target:</span>${element.targetPin ? html`<span style="color:${element.targetPin.value ? '#34d399' : '#ef4444'}">${element.targetPin.component.id}/${element.targetPin.id}</span>` : 'none'}</div>                
            ` : html`
                <div><span>Position:</span><span>${Math.round(element.position.x)}, ${Math.round(element.position.y)}</span></div>
                <div style="font-weight: bold; margin-top: 0.3em;">Pins:</div>
                ${Object.entries(element.pins).map(([pid, pin]) => html`
                    <div style="font-size: 13px;"><span>${pid} (${pin.type})</span><span style="color: ${pin.value ? '#34d399' : '#ef4444'};">${pin.value ? '1' : '0'}</span></div>
                `)}
            `}
            </div>
        </div>
    `
}
