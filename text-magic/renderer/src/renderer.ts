import {
    TMCharacterMetrics,
    TMFontInfo,
    TMRenderer as IRenderer,
    TMRowMetrics,
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

    private _typeFace: Map<string, Typeface> = new Map();
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
        if (this._typeFace.has(font.family)) {
            return;
        }
        const CanvasKit = this.CanvasKit!;
        this.FontMgr!.registerFont(font.data, font.family);
        this._typeFace.set(font.family, CanvasKit.Typeface.MakeFreeTypeFaceFromData(font.data)!);
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
        if (this._paragraph) {
            this._paragraph.delete();
            this._paragraph = null;
        }
        if (data.contents.length === 0) {
            return { width: 0, height: 0, allCharacter: [], rows: [] };
        }
        const CanvasKit = this.CanvasKit!;
        const characterBounds: TMCharacterMetrics[] = [];
        const style = data.styles[0];
        const paraStyle = new CanvasKit.ParagraphStyle({
            textStyle: {
                color: CanvasKit.parseColorString(style.color),
                fontFamilies: [style.fontFamily],
                fontSize: style.fontSize,
                fontStyle: this._convertFontStyle(style.fontStyle, style.fontWeight),
            },
            textAlign: CanvasKit.TextAlign.Left,
        });
        const builder = CanvasKit.ParagraphBuilder.MakeFromFontProvider(paraStyle, this.FontMgr!);
        data.contents.forEach((content, index) => {
            const style = data.styles[index];
            const textStyle = new CanvasKit.TextStyle({
                color: CanvasKit.parseColorString(style.color),
                fontFamilies: [style.fontFamily],
                fontSize: style.fontSize,
                fontStyle: this._convertFontStyle(style.fontStyle, style.fontWeight),
            });
            builder.pushStyle(textStyle);
            builder.addText(content);
            builder.pop();
        });
        this._paragraph = builder.build();
        this._paragraph.layout(data.width);

        const lineMetrics = this._paragraph.getLineMetrics();
        const shapedLines = this._paragraph.getShapedLines();
        const rows: TMRowMetrics[] = [];
        let shapedLineIndex = 0;
        lineMetrics.forEach((line, index) => {
            if (line.width > 0) {
                const shapeLine = shapedLines[shapedLineIndex];
                rows.push({
                    width: line.width,
                    height: line.height,
                    top: rows.length > 0 ? rows[rows.length - 1].bottom : shapeLine.top,
                    bottom: shapeLine.bottom,
                });
                shapedLineIndex++;
            } else if (index === 0) {
                rows.push({ width: 0, height: line.height, top: 0, bottom: line.height });
            } else {
                const lastRow = rows[rows.length - 1];
                rows.push({
                    top: lastRow.bottom,
                    bottom: lastRow.bottom + line.height,
                    width: 0,
                    height: line.height,
                });
            }
        });
        let rowIndex = 0;
        let characterIndex = 0;
        data.contents.forEach((content, index) => {
            for (let i = 0; i < content.length; i++) {
                const glyphInfo = this._paragraph!.getGlyphInfoAt(characterIndex)!;
                if (
                    content[i] === '\n' ||
                    glyphInfo.graphemeLayoutBounds[1] >= rows[rowIndex].bottom
                ) {
                    rowIndex++;
                }
                characterBounds.push({
                    char: content[i],
                    x: content[i] === '\n' ? 0 : glyphInfo.graphemeLayoutBounds[0],
                    y: content[i] === '\n' ? rows[rowIndex].top : glyphInfo.graphemeLayoutBounds[1],
                    width:
                        content[i] === '\n'
                            ? 0
                            : glyphInfo.graphemeLayoutBounds[2] - glyphInfo.graphemeLayoutBounds[0],
                    height: glyphInfo.graphemeLayoutBounds[3] - glyphInfo.graphemeLayoutBounds[1],
                    whichContent: index,
                    indexOfContent: i,
                    lineIndex: rowIndex,
                    style: data.styles[index],
                });
                characterIndex++;
            }
        });

        this._textMetrics = {
            rows,
            width: this._paragraph.getMaxWidth(),
            height: this._paragraph.getHeight(),
            allCharacter: characterBounds,
        };

        builder.delete();
        return this._textMetrics;
    }

    render() {
        const CanvasKit = this.CanvasKit!;

        if (!this._paragraph || !this._textMetrics) {
            this.canvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));
            this.surface.flush();
            return;
        }

        this._canvasElement.width = 300 * window.devicePixelRatio;
        this._canvasElement.height = 300 * window.devicePixelRatio;
        this._canvasElement.style.width = '300px';
        this._canvasElement.style.height = '300px';
        this._surface = CanvasKit.MakeCanvasSurface(this._canvasElement)!;
        this._canvas = this._surface.getCanvas();
        this.canvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));

        const textPaint = new CanvasKit.Paint();
        textPaint.setAntiAlias(true);
        textPaint.setStyle(CanvasKit.PaintStyle.Fill);
        const strokePaint = new CanvasKit.Paint();
        strokePaint.setAntiAlias(true);
        strokePaint.setColor(CanvasKit.Color(255, 0, 0, 1.0)); // 红色
        strokePaint.setStyle(CanvasKit.PaintStyle.Stroke);
        strokePaint.setStrokeWidth(3.0);

        const lineMetrics = this._paragraph.getLineMetrics();
        lineMetrics.forEach((line) => {
            if (line.width === 0) {
                return;
            }
            for (let index = line.startIndex; index < line.endIndex; index++) {
                const character = this._textMetrics!.allCharacter[index];
                const font = new CanvasKit.Font(
                    this._typeFace.get(character.style.fontFamily)!,
                    character.style.fontSize
                );
                font.setEmbolden(character.style.fontWeight !== 'normal');
                font.setSkewX(character.style.fontStyle !== 'normal' ? -1 / 4 : 0);
                textPaint.setColor(CanvasKit.parseColorString(character.style.color));
                this.canvas.drawText(
                    character.char,
                    character.x,
                    character.y + character.height - line.descent,
                    strokePaint,
                    font
                );
                this.canvas.drawText(
                    character.char,
                    character.x,
                    character.y + character.height - line.descent,
                    textPaint,
                    font
                );
                font.delete();
            }
        });

        this.surface.flush();

        textPaint.delete();
        strokePaint.delete();
    }

    isUseDevicePixelRatio(): boolean {
        return true;
    }

    notifyDevicePixelRatioChanged() {
        this.render();
    }

    destroy() {}

    private get surface() {
        return this._surface!;
    }

    private get canvas() {
        return this._canvas!;
    }
}
