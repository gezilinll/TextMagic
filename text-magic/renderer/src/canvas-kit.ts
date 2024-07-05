import { TMFontInfo } from '@text-magic/common';
import CanvasKitInit from 'canvaskit-wasm';
import { CanvasKit } from 'canvaskit-wasm';

let CANVAS_KIT: CanvasKit | null = null;
let DEFAULT_FONT: ArrayBuffer | null = null;
export const DEFAULT_FONT_FAMILY = 'default-font-family';

export async function getCanvasKit() {
    if (CANVAS_KIT) {
        return CANVAS_KIT;
    }
    CANVAS_KIT = await CanvasKitInit({
        locateFile: (_file) =>
            `https://cdn.bootcdn.net/ajax/libs/canvaskit-wasm/0.39.1/canvaskit.wasm`,
    });
    return CANVAS_KIT;
}

export async function getDefaultFont(): Promise<TMFontInfo> {
    if (DEFAULT_FONT) {
        return { data: DEFAULT_FONT, family: DEFAULT_FONT_FAMILY };
    }
    DEFAULT_FONT = await fetch(
        'https://zf.sc.chinaz.com/Files/DownLoad/upload/2024/0627/zaozigongfangxinranti.otf'
    ).then((response) => response.arrayBuffer());
    return { data: DEFAULT_FONT!, family: DEFAULT_FONT_FAMILY };
}
