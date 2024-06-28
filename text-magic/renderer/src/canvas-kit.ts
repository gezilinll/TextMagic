import CanvasKitInit from 'canvaskit-wasm';
import { CanvasKit } from 'canvaskit-wasm';

let CANVAS_KIT: CanvasKit | null = null;
let DEFAULT_FONT: ArrayBuffer | null = null;

export async function getCanvasKit() {
    if (CANVAS_KIT) {
        return CANVAS_KIT;
    }
    CANVAS_KIT = await CanvasKitInit({
        locateFile: (file) => `https://unpkg.com/canvaskit-wasm@latest/bin/${file}`,
    });
    return CANVAS_KIT;
}

export async function getDefaultFont() {
    if (DEFAULT_FONT) {
        return DEFAULT_FONT;
    }
    DEFAULT_FONT = await fetch(
        'https://storage.googleapis.com/skia-cdn/misc/Roboto-Regular.ttf'
    ).then((response) => response.arrayBuffer());
    return DEFAULT_FONT!;
}
