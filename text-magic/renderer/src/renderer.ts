import {
    TMCharacterMetrics,
    TMFontInfo,
    TMRenderer as IRenderer,
    TMTextData,
} from '@text-magic/common';
import { Canvas, CanvasKit, Paragraph, Surface, TypefaceFontProvider } from 'canvaskit-wasm';

import { getCanvasKit } from './canvas-kit';

export class TMRenderer implements IRenderer {
    private CanvasKit: CanvasKit | null = null;
    private FontMgr: TypefaceFontProvider | null = null;

    private _container: HTMLDivElement;
    private _canvasElement: HTMLCanvasElement;
    private _surface: Surface | null = null;
    private _canvas: Canvas | null = null;

    private _paragraph: Paragraph | null = null;

    constructor() {
        this._container = document.createElement('div');

        this._canvasElement = document.createElement('canvas');
        this._container.appendChild(this._canvasElement);
        this._container.style.position = 'absolute';
    }

    async init(): Promise<boolean> {
        this.CanvasKit = await getCanvasKit();
        this.FontMgr = this.CanvasKit.TypefaceFontProvider.Make();

        this._surface = this.CanvasKit.MakeCanvasSurface(this._canvasElement)!;
        this._canvas = this._surface.getCanvas();
        return true;
    }

    registerFont(font: TMFontInfo) {
        this.FontMgr!.registerFont(font.data, font.family);
    }

    getContainer(): HTMLDivElement {
        return this._container;
    }

    measure(data: TMTextData) {
        const CanvasKit = this.CanvasKit!;
        const characterBounds: TMCharacterMetrics[] = [];
        const paraStyle = new CanvasKit.ParagraphStyle({
            textStyle: {
                color: CanvasKit.BLACK,
                fontFamilies: ['Roboto'],
                fontSize: 28,
            },
            textAlign: CanvasKit.TextAlign.Left,
        });
        const builder = CanvasKit.ParagraphBuilder.MakeFromFontProvider(paraStyle, this.FontMgr!);
        builder.addText(data.content);
        this._paragraph = builder.build();
        this._paragraph.layout(data.width);
        for (let index = 0; index < data.content.length; index++) {
            const glyphInfo = this._paragraph.getGlyphInfoAt(index)!;
            characterBounds.push({
                x: glyphInfo.graphemeLayoutBounds[0],
                y: glyphInfo.graphemeLayoutBounds[1],
                width: glyphInfo.graphemeLayoutBounds[2] - glyphInfo.graphemeLayoutBounds[0],
                height: glyphInfo.graphemeLayoutBounds[3] - glyphInfo.graphemeLayoutBounds[1],
                isNewLine: data.content[index] === '\n',
            });
        }

        return {
            width: data.width,
            height: data.height,
            allCharacter: characterBounds,
        };
    }

    render() {
        if (!this._paragraph) {
            return;
        }
        const CanvasKit = this.CanvasKit!;
        this.canvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));
        this.canvas.drawParagraph(this._paragraph, 0, 0);
        this.surface.flush();
    }

    isUseDevicePixelRatio(): boolean {
        return false;
    }

    notifyDevicePixelRatioChanged() {
        this.render();
    }

    private get surface() {
        return this._surface!;
    }

    private get canvas() {
        return this._canvas!;
    }
}
