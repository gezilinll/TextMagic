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
        this._canvasElement.style.position = 'absolute';
        this._canvasElement.style.left = '0px';
        this._canvasElement.style.top = '0px';
        this._container.appendChild(this._canvasElement);
        this._container.style.position = 'relative';
        this._container.style.left = '0px';
        this._container.style.top = '0px';
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

    private _convertToTextAlign(align: 'left' | 'center' | 'right') {
        const CanvasKit = this.CanvasKit!;
        let textAlign;
        switch (align) {
            case 'left':
                textAlign = CanvasKit.TextAlign.Left;
                break;
            case 'center':
                textAlign = CanvasKit.TextAlign.Center;
                break;
            case 'right':
                textAlign = CanvasKit.TextAlign.Right;
                break;
            default:
                textAlign = CanvasKit.TextAlign.Left;
        }
        return textAlign;
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
                fontSize: style.fontSize * window.devicePixelRatio,
                fontStyle: this._convertFontStyle(style.fontStyle, style.fontWeight),
            },
            textAlign: this._convertToTextAlign(data.textAlign),
        });
        const builder = CanvasKit.ParagraphBuilder.MakeFromFontProvider(paraStyle, this.FontMgr!);
        data.contents.forEach((content, index) => {
            const style = data.styles[index];
            const textStyle = new CanvasKit.TextStyle({
                color: CanvasKit.parseColorString(style.color),
                fontFamilies: [style.fontFamily],
                fontSize: style.fontSize * window.devicePixelRatio,
                letterSpacing: style.letterSpacing,
                heightMultiplier: style.lineHeight,
                fontStyle: this._convertFontStyle(style.fontStyle, style.fontWeight),
            });
            builder.pushStyle(textStyle);
            builder.addText(content);
            builder.pop();
        });
        this._paragraph = builder.build();
        this._paragraph.layout(data.width * window.devicePixelRatio);

        const lineMetrics = this._paragraph.getLineMetrics();
        const rows: TMRowMetrics[] = [];
        lineMetrics.forEach((line) => {
            const lastRow = rows[rows.length - 1];
            const top = lastRow ? lastRow.bottom : 0;
            const bottom = lastRow ? top + line.height + data.paragraphSpacing : line.height;
            const contentTop = lastRow ? top + data.paragraphSpacing : 0;
            const contentBottom = contentTop + line.height;
            rows.push({
                width: line.width,
                height: bottom - top,
                contentHeight: line.height,
                top,
                contentTop,
                bottom,
                contentBottom,
                startIndex: -1,
                endIndex: -1,
            });
        });
        let rowIndex = 0;
        let characterIndex = 0;
        let lastCharacterIsNewLine = false;
        data.contents.forEach((content, index) => {
            for (let i = 0; i < content.length; i++) {
                let currentRow = rows[rowIndex];
                if (currentRow.startIndex === -1) {
                    currentRow.startIndex = characterIndex;
                }
                const glyphInfo = this._paragraph!.getGlyphInfoAt(characterIndex)!;

                let offsetY = data.paragraphSpacing * rowIndex;
                if (
                    lastCharacterIsNewLine ||
                    offsetY + glyphInfo.graphemeLayoutBounds[1] >=
                        currentRow.bottom - data.styles[index].fontSize / 10
                ) {
                    offsetY = data.paragraphSpacing * (rowIndex + 1);
                }
                if (
                    lastCharacterIsNewLine ||
                    offsetY + glyphInfo.graphemeLayoutBounds[1] >=
                        currentRow.bottom - data.styles[index].fontSize / 10
                ) {
                    currentRow.endIndex = characterIndex - 1;
                    rowIndex++;
                    currentRow = rows[rowIndex];
                    currentRow.startIndex = characterIndex;
                    lastCharacterIsNewLine = false;
                }
                characterBounds.push({
                    char: content[i],
                    x: glyphInfo.graphemeLayoutBounds[0],
                    y: offsetY + glyphInfo.graphemeLayoutBounds[1],
                    width: glyphInfo.graphemeLayoutBounds[2] - glyphInfo.graphemeLayoutBounds[0],
                    height: glyphInfo.graphemeLayoutBounds[3] - glyphInfo.graphemeLayoutBounds[1],
                    whichContent: index,
                    indexOfContent: i,
                    whichRow: rowIndex,
                    style: data.styles[index],
                });
                lastCharacterIsNewLine = content[i] === '\n';
                characterIndex++;
            }
        });
        rows[rows.length - 1].endIndex = characterBounds.length - 1;

        this._textMetrics = {
            rows,
            width: data.width,
            height: data.height,
            allCharacter: characterBounds,
        };

        if (window.devicePixelRatio > 1 && data.textAlign !== 'left') {
            this._textMetrics.rows.forEach((row) => {
                if (data.textAlign === 'right') {
                    const lastCharacter = this._textMetrics!.allCharacter[row.endIndex];
                    const offset =
                        data.width * window.devicePixelRatio -
                        (lastCharacter.x + lastCharacter.width);
                    for (let index = row.startIndex; index <= row.endIndex; index++) {
                        this._textMetrics!.allCharacter[index].x += offset;
                    }
                } else {
                    const firstCharacter = this._textMetrics!.allCharacter[row.startIndex];
                    const lastCharacter = this._textMetrics!.allCharacter[row.endIndex];
                    const leftOffset = firstCharacter.x;
                    const rightOffset =
                        data.width * window.devicePixelRatio -
                        (lastCharacter.x + lastCharacter.width);
                    const offset = (rightOffset - leftOffset) / 2;
                    for (let index = row.startIndex; index <= row.endIndex; index++) {
                        this._textMetrics!.allCharacter[index].x += offset;
                    }
                }
            });
        }

        builder.delete();
        return this._textMetrics;
    }

    render(width: number, height: number) {
        const CanvasKit = this.CanvasKit!;
        this._container.style.width = `${width}px`;
        this._container.style.height = `${height}px`;
        this._canvasElement.width = width * window.devicePixelRatio;
        this._canvasElement.height = height * window.devicePixelRatio;
        this._canvasElement.style.width = `${width}px`;
        this._canvasElement.style.height = `${height}px`;

        if (!this._paragraph || !this._textMetrics) {
            this.canvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));
            this.surface.flush();
            return;
        }

        this._surface = CanvasKit.MakeCanvasSurface(this._canvasElement)!;
        this._canvas = this._surface.getCanvas();
        this.canvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));

        const textPaint = new CanvasKit.Paint();
        textPaint.setAntiAlias(true);
        textPaint.setStyle(CanvasKit.PaintStyle.Fill);
        const lineMetrics = this._paragraph.getLineMetrics();
        const highlighted: Set<number> = new Set();
        let characterIndex = 0;
        this._textMetrics!.allCharacter.forEach((character) => {
            if (character.char === '\n') {
                characterIndex++;
                return;
            }
            const drawTextY =
                character.y + character.height - lineMetrics[character.whichRow].descent;
            const row = this._textMetrics!.rows[character.whichRow];
            if (character.style.highlight) {
                if (!highlighted.has(characterIndex)) {
                    const highlightPaint = new CanvasKit.Paint();
                    highlightPaint.setStyle(CanvasKit.PaintStyle.Fill);
                    highlightPaint.setColor(
                        CanvasKit.parseColorString(character.style.highlight.color)
                    );
                    let endCharacter = character;
                    for (let index = characterIndex; index <= row.endIndex; index++) {
                        if (this._textMetrics!.allCharacter[index].style.highlight) {
                            highlighted.add(index);
                            endCharacter = this._textMetrics!.allCharacter[index];
                        } else {
                            break;
                        }
                    }
                    this.canvas.drawRect4f(
                        character.x,
                        row.contentTop,
                        endCharacter.x + endCharacter.width,
                        row.contentTop + row.contentHeight,
                        highlightPaint
                    );
                    highlightPaint.delete();
                }
            }

            const font = new CanvasKit.Font(
                this._typeFace.get(character.style.fontFamily)!,
                character.style.fontSize * window.devicePixelRatio
            );
            font.setEmbolden(character.style.fontWeight !== 'normal');
            font.setSkewX(character.style.fontStyle === 'normal' ? 0 : -1 / 4);
            if (character.style.shadow) {
                const shadowPaint = new CanvasKit.Paint();
                shadowPaint.setColor(CanvasKit.Color(255, 0, 0, 1.0));
                shadowPaint.setMaskFilter(
                    CanvasKit.MaskFilter.MakeBlur(
                        CanvasKit.BlurStyle.Normal,
                        0.57735 * character.style.shadow.blurRadius + 0.5,
                        false
                    )
                );
                if (character.style.stroke) {
                    shadowPaint.setStyle(CanvasKit.PaintStyle.Stroke);
                    shadowPaint.setStrokeWidth(character.style.stroke.width);
                }
                this.canvas.drawText(character.char, character.x, drawTextY, shadowPaint, font);
                shadowPaint.delete();
            }
            if (character.style.stroke) {
                const strokePaint = new CanvasKit.Paint();
                strokePaint.setAntiAlias(true);
                strokePaint.setColor(CanvasKit.parseColorString(character.style.stroke.color));
                strokePaint.setStyle(CanvasKit.PaintStyle.Stroke);
                strokePaint.setStrokeWidth(character.style.stroke.width);
                this.canvas.drawText(character.char, character.x, drawTextY, strokePaint, font);
                strokePaint.delete();
            }

            textPaint.setColor(CanvasKit.parseColorString(character.style.color));
            if (character.style.blur) {
                textPaint.setMaskFilter(
                    CanvasKit.MaskFilter.MakeBlur(
                        CanvasKit.BlurStyle.Normal,
                        0.57735 * character.style.blur.radius + 0.5,
                        false
                    )
                );
            } else {
                textPaint.setMaskFilter(null);
            }
            this.canvas.drawText(character.char, character.x, drawTextY, textPaint, font);
            if (character.style.decoration) {
                const decorationPaint = new CanvasKit.Paint();
                decorationPaint.setAntiAlias(true);
                decorationPaint.setStyle(CanvasKit.PaintStyle.Stroke);
                decorationPaint.setStrokeWidth(character.style.decoration.thickness);
                decorationPaint.setColor(
                    CanvasKit.parseColorString(character.style.decoration.color)
                );
                const startX = character.x;
                const endX = character.x + character.width;
                let yPosition = 0;
                if (character.style.decoration.line === 'underline') {
                    yPosition =
                        drawTextY +
                        lineMetrics[character.whichRow].descent -
                        character.style.decoration.thickness / 2;
                } else {
                    yPosition =
                        character.y +
                        character.height / 2 -
                        character.style.decoration.thickness / 2;
                }
                if (character.style.decoration.style === 'solid') {
                    this.canvas.drawLine(
                        character.x,
                        yPosition,
                        character.x + character.width,
                        yPosition,
                        decorationPaint
                    );
                } else {
                    const amplitude = character.style.decoration.thickness;
                    const frequency = 0.8;
                    const path = new CanvasKit.Path();
                    path.moveTo(startX, yPosition);
                    for (let x = startX; x <= endX; x += 1) {
                        const y = yPosition + amplitude * Math.sin(frequency * x);
                        path.lineTo(x, y);
                    }
                    this.canvas.drawPath(path, decorationPaint);
                    path.delete();
                }
                decorationPaint.delete();
            }
            font.delete();
            characterIndex++;
        });

        this.surface.flush();

        textPaint.delete();
    }

    isUseDevicePixelRatio(): boolean {
        return true;
    }

    destroy() {}

    private get surface() {
        return this._surface!;
    }

    private get canvas() {
        return this._canvas!;
    }
}
