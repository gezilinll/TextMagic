import {
    TMCharacterMetrics,
    TMFontInfo,
    TMRenderer as IRenderer,
    TMTextData,
    TMTextMetrics,
} from '@text-magic/common';
import {
    Canvas,
    CanvasKit,
    Paragraph,
    Surface,
    Typeface,
    TypefaceFontProvider,
} from 'canvaskit-wasm';

import { getCanvasKit } from './canvas-kit';

export class TMRenderer implements IRenderer {
    private CanvasKit: CanvasKit | null = null;
    private FontMgr: TypefaceFontProvider | null = null;

    private _container: HTMLDivElement;
    private _canvasElement: HTMLCanvasElement;
    private _surface: Surface | null = null;
    private _canvas: Canvas | null = null;

    private _paragraph: Paragraph | null = null;

    private _text: string = '';
    private _typeFace: Typeface | null = null;
    private _textMetrics: TMTextMetrics | null = null;

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
        this._typeFace = this.CanvasKit!.Typeface.MakeFreeTypeFaceFromData(font.data);
    }

    getContainer(): HTMLDivElement {
        return this._container;
    }

    private _convertFontStyle(fontStyle: string, fontWeight: string) {
        const CanvasKit = this.CanvasKit!;

        let weight;
        switch (fontWeight.toLowerCase()) {
            case 'normal':
                weight = CanvasKit.FontWeight.Normal;
                break;
            case 'bold':
                weight = CanvasKit.FontWeight.Bold;
                break;
            case 'lighter':
                weight = CanvasKit.FontWeight.Light;
                break;
            case 'bolder':
                weight = CanvasKit.FontWeight.ExtraBold;
                break;
            default:
                weight = CanvasKit.FontWeight.Normal;
        }

        let slant;
        switch (fontStyle.toLowerCase()) {
            case 'normal':
                slant = CanvasKit.FontSlant.Upright;
                break;
            case 'italic':
                slant = CanvasKit.FontSlant.Italic;
                break;
            case 'oblique':
                slant = CanvasKit.FontSlant.Oblique;
                break;
            default:
                slant = CanvasKit.FontSlant.Upright;
        }

        return { weight, slant, width: CanvasKit.FontWidth.Normal };
    }

    measure(data: TMTextData) {
        const CanvasKit = this.CanvasKit!;
        const characterBounds: TMCharacterMetrics[] = [];
        const paraStyle = new CanvasKit.ParagraphStyle({
            textStyle: {
                color: CanvasKit.parseColorString(data.style.color),
                fontFamilies: [data.style.fontFamily],
                fontSize: data.style.fontSize,
                fontStyle: this._convertFontStyle(data.style.fontStyle, data.style.fontWeight),
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
                content: data.content[index],
                x: glyphInfo.graphemeLayoutBounds[0],
                y: glyphInfo.graphemeLayoutBounds[1],
                width: glyphInfo.graphemeLayoutBounds[2] - glyphInfo.graphemeLayoutBounds[0],
                height: glyphInfo.graphemeLayoutBounds[3] - glyphInfo.graphemeLayoutBounds[1],
                fakeBold: data.style.fontWeight !== 'normal',
                fakeItalic: data.style.fontStyle !== 'normal',
                isNewLine: data.content[index] === '\n',
            });
        }

        this._textMetrics = {
            width: this._paragraph.getMaxWidth(),
            height: this._paragraph.getHeight(),
            allCharacter: characterBounds,
        };
        return this._textMetrics;
    }

    render() {
        if (!this._paragraph || !this._textMetrics) {
            return;
        }

        const CanvasKit = this.CanvasKit!;

        this._canvasElement.width = 300 * window.devicePixelRatio;
        this._canvasElement.height = 300 * window.devicePixelRatio;
        this._canvasElement.style.width = '300px';
        this._canvasElement.style.height = '300px';
        this._surface = CanvasKit.MakeCanvasSurface(this._canvasElement)!;
        this._canvas = this._surface.getCanvas();
        this.canvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));

        const textPaint = new CanvasKit.Paint();
        textPaint.setAntiAlias(true);
        textPaint.setColor(CanvasKit.Color(0, 0, 0, 1.0));
        textPaint.setStyle(CanvasKit.PaintStyle.Fill);
        const strokePaint = new CanvasKit.Paint();
        strokePaint.setAntiAlias(true);
        strokePaint.setColor(CanvasKit.Color(255, 0, 0, 1.0)); // 红色
        strokePaint.setStyle(CanvasKit.PaintStyle.Stroke);
        strokePaint.setStrokeWidth(3.0);

        const font = new CanvasKit.Font(this._typeFace, 36);

        const lineMetrics = this._paragraph.getLineMetrics();
        lineMetrics.forEach((line) => {
            if (line.width === 0) {
                return;
            }
            for (let index = line.startIndex; index < line.endIndex; index++) {
                const character = this._textMetrics!.allCharacter[index];
                font.setEmbolden(character.fakeBold);
                font.setSkewX(character.fakeItalic ? -1 / 4 : 0);
                this.canvas.drawText(
                    character.content,
                    character.x,
                    character.y + character.height - 8,
                    strokePaint,
                    font
                );
                this.canvas.drawText(
                    character.content,
                    character.x,
                    character.y + character.height - 8,
                    textPaint,
                    font
                );
            }
        });

        this.surface.flush();
    }

    isUseDevicePixelRatio(): boolean {
        return true;
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
