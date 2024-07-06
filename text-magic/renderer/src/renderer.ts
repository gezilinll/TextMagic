import {
    ListStyle,
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

    private _root: HTMLDivElement;
    private _container: HTMLDivElement;
    private _listCanvasElement: HTMLCanvasElement;
    private _listSurface: Surface | null = null;
    private _listCanvas: Canvas | null = null;
    private _textCanvasElement: HTMLCanvasElement;
    private _textSurface: Surface | null = null;
    private _textCanvas: Canvas | null = null;

    private _paragraph: Paragraph | null = null;

    private _typeFace: Map<string, Typeface> = new Map();
    private _emojiFontFamily: string | null = null;
    private _textMetrics: TMTextMetrics | null = null;

    private LIST_CANVAS_WIDTH = 40;
    private LIST_EMOJI_FONT_SIZE = 30;
    private _listStyleType: ListStyle = undefined;

    constructor() {
        this._root = document.createElement('div');
        this._root.style.position = 'relative';
        this._root.style.left = '0px';
        this._root.style.top = '0px';

        this._listCanvasElement = document.createElement('canvas');
        this._listCanvasElement.style.position = 'absolute';
        this._listCanvasElement.style.left = '0px';
        this._listCanvasElement.style.top = '0px';
        this._root.appendChild(this._listCanvasElement);

        this._container = document.createElement('div');
        this._container.style.position = 'absolute';
        this._container.style.left = '0px';
        this._container.style.top = '0px';
        this._root.appendChild(this._container);

        this._textCanvasElement = document.createElement('canvas');
        this._textCanvasElement.style.position = 'absolute';
        this._textCanvasElement.style.left = '0px';
        this._textCanvasElement.style.top = '0px';
        this._container.appendChild(this._textCanvasElement);
    }

    async init(): Promise<boolean> {
        this.CanvasKit = await getCanvasKit();
        this.FontMgr = this.CanvasKit.TypefaceFontProvider.Make();

        this._textSurface = this.CanvasKit.MakeCanvasSurface(this._textCanvasElement)!;
        this._textCanvas = this._textSurface.getCanvas();

        this._listSurface = this.CanvasKit.MakeCanvasSurface(this._listCanvasElement)!;
        this._listCanvas = this._listSurface.getCanvas();

        return true;
    }

    setEmojiFont(font: TMFontInfo) {
        this._emojiFontFamily = font.family;
        if (this._typeFace.has(font.family)) {
            return;
        }
        const CanvasKit = this.CanvasKit!;
        this.FontMgr!.registerFont(font.data, font.family);
        this._typeFace.set(font.family, CanvasKit.Typeface.MakeFreeTypeFaceFromData(font.data)!);
    }

    registerFont(font: TMFontInfo) {
        if (this._typeFace.has(font.family)) {
            return;
        }
        const CanvasKit = this.CanvasKit!;
        this.FontMgr!.registerFont(font.data, font.family);
        this._typeFace.set(font.family, CanvasKit.Typeface.MakeFreeTypeFaceFromData(font.data)!);
    }

    getRootContainer(): HTMLDivElement {
        return this._root;
    }

    getTextContainer(): HTMLDivElement {
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

    private extractEmojisWithDetails(text: string) {
        const emojiRegex = /\p{Emoji}/gu;
        let match;
        const emojis: Map<number, boolean> = new Map();

        while ((match = emojiRegex.exec(text)) !== null) {
            const emoji = match[0];
            const emojiStart = match.index;
            const isSurrogatePair = emoji.length > 1;
            emojis.set(emojiStart, isSurrogatePair);
        }

        return emojis;
    }

    measure(data: TMTextData) {
        if (this._paragraph) {
            this._paragraph.delete();
            this._paragraph = null;
        }
        let realWidth = data.width;
        this._listStyleType = data.listStyle;
        if (this._listStyleType) {
            realWidth = data.width - this.LIST_CANVAS_WIDTH;
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
                fontFamilies: this._emojiFontFamily
                    ? [style.fontFamily, this._emojiFontFamily]
                    : [style.fontFamily],
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
                fontFamilies: this._emojiFontFamily
                    ? [style.fontFamily, this._emojiFontFamily]
                    : [style.fontFamily],
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
        this._paragraph.layout(realWidth * window.devicePixelRatio);

        const lineMetrics = this._paragraph.getLineMetrics();
        const rows: TMRowMetrics[] = [];
        lineMetrics.forEach((line, index) => {
            if (line.width === 0 && index === lineMetrics.length - 1) {
                return;
            }
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
        let glyphIndex = 0;
        let lastCharacterIsNewLine = false;
        data.contents.forEach((content, index) => {
            const emojis = this.extractEmojisWithDetails(content);
            for (let i = 0; i < content.length; i++) {
                let currentRow = rows[rowIndex];
                if (currentRow.startIndex === -1) {
                    currentRow.startIndex = characterIndex;
                }
                const glyphInfo = this._paragraph!.getGlyphInfoAt(glyphIndex)!;

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
                    char: emojis.get(i) ? content[i] + content[i + 1] : content[i],
                    isEmoji: emojis.get(i) ?? false,
                    isSurrogatePair: emojis.get(i) ?? false,
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
                if (emojis.get(i)) {
                    i += 1;
                    glyphIndex++;
                }
                characterIndex++;
                glyphIndex++;
            }
        });
        if (rows.length > 0) {
            rows[rows.length - 1].endIndex = characterBounds.length - 1;
        }

        this._textMetrics = {
            rows,
            width: realWidth,
            height: data.height,
            allCharacter: characterBounds,
        };

        if (window.devicePixelRatio > 1 && data.textAlign !== 'left') {
            this._textMetrics.rows.forEach((row) => {
                if (data.textAlign === 'right') {
                    const lastCharacter = this._textMetrics!.allCharacter[row.endIndex];
                    const offset =
                        realWidth * window.devicePixelRatio -
                        (lastCharacter.x + lastCharacter.width);
                    for (let index = row.startIndex; index <= row.endIndex; index++) {
                        this._textMetrics!.allCharacter[index].x += offset;
                    }
                } else {
                    const firstCharacter = this._textMetrics!.allCharacter[row.startIndex];
                    const lastCharacter = this._textMetrics!.allCharacter[row.endIndex];
                    const leftOffset = firstCharacter.x;
                    const rightOffset =
                        realWidth * window.devicePixelRatio -
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
        if (this._listStyleType) {
            this._container.style.left = `${this.LIST_CANVAS_WIDTH}px`;
            this._container.style.width = `${width - this.LIST_CANVAS_WIDTH}px`;
            this._container.style.height = `${height}px`;
            this._textCanvasElement.width =
                (width - this.LIST_CANVAS_WIDTH) * window.devicePixelRatio;
            this._textCanvasElement.height = height * window.devicePixelRatio;
            this._textCanvasElement.style.width = `${width - this.LIST_CANVAS_WIDTH}px`;
            this._textCanvasElement.style.height = `${height}px`;
            this._listCanvasElement.width = this.LIST_CANVAS_WIDTH * window.devicePixelRatio;
            this._listCanvasElement.height = height * window.devicePixelRatio;
            this._listCanvasElement.style.width = `${this.LIST_CANVAS_WIDTH}px`;
            this._listCanvasElement.style.height = `${height}px`;
        } else {
            this._container.style.left = '0px';
            this._container.style.width = `${width}px`;
            this._container.style.height = `${height}px`;
            this._textCanvasElement.width = width * window.devicePixelRatio;
            this._textCanvasElement.height = height * window.devicePixelRatio;
            this._textCanvasElement.style.width = `${width}px`;
            this._textCanvasElement.style.height = `${height}px`;
            this._listCanvasElement.width = 0;
            this._listCanvasElement.height = 0;
            this._listCanvasElement.style.width = '0px';
            this._listCanvasElement.style.height = '0px';
        }

        if (!this._paragraph || !this._textMetrics) {
            this.textCanvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));
            this.textSurface.flush();
            this.listCanvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));
            this.listSurface.flush();
            return;
        }

        this._textSurface = CanvasKit.MakeCanvasSurface(this._textCanvasElement)!;
        this._textCanvas = this._textSurface.getCanvas();
        this.textCanvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));
        this._listSurface = CanvasKit.MakeCanvasSurface(this._listCanvasElement)!;
        this._listCanvas = this._listSurface.getCanvas();
        this.listCanvas.clear(CanvasKit.Color4f(1.0, 1.0, 1.0, 0.0));

        const textPaint = new CanvasKit.Paint();
        textPaint.setAntiAlias(true);
        textPaint.setStyle(CanvasKit.PaintStyle.Fill);
        const lineMetrics = this._paragraph.getLineMetrics();
        const highlighted: Set<number> = new Set();
        let characterIndex = 0;
        const rowsForList: TMRowMetrics[] = [];
        this._textMetrics!.allCharacter.forEach((character) => {
            if (character.char === '\n') {
                characterIndex++;
                return;
            }
            // todo: emoji descent(if you input emoji first and then input normal character, you will find out the emoji will jump one time)
            const drawTextY =
                character.y +
                character.height -
                (character.isEmoji
                    ? (lineMetrics[character.whichRow].descent / 3) * 2
                    : lineMetrics[character.whichRow].descent);
            const row = this._textMetrics!.rows[character.whichRow];
            if (
                characterIndex === 0 ||
                this._textMetrics!.allCharacter[characterIndex - 1].char === '\n'
            ) {
                rowsForList.push(row);
            }
            if (character.style.highlight) {
                if (!highlighted.has(characterIndex)) {
                    const highlightPaint = new CanvasKit.Paint();
                    highlightPaint.setColor(
                        CanvasKit.parseColorString(character.style.highlight.color)
                    );
                    let endCharacter = character;
                    const highlightType = character.style.highlight.type;
                    highlightPaint.setStyle(
                        highlightType === 'fill'
                            ? CanvasKit.PaintStyle.Fill
                            : CanvasKit.PaintStyle.Stroke
                    );
                    if (highlightType !== 'fill') {
                        highlightPaint.setStrokeWidth(4);
                        highlightPaint.setAntiAlias(true);
                    }
                    for (
                        let index = characterIndex;
                        index <= this._textMetrics!.allCharacter.length - 1;
                        index++
                    ) {
                        const currentCharacter = this._textMetrics!.allCharacter[index];
                        if (
                            currentCharacter.style.highlight &&
                            highlightType === currentCharacter.style.highlight.type
                        ) {
                            highlighted.add(index);
                            endCharacter = currentCharacter;
                        } else {
                            break;
                        }
                    }
                    if (character.whichRow === endCharacter.whichRow) {
                        if (highlightType === 'fill') {
                            this.textCanvas.drawRect4f(
                                character.x,
                                (row.contentTop + row.contentBottom) / 2,
                                endCharacter.x + endCharacter.width,
                                row.contentTop + row.contentHeight,
                                highlightPaint
                            );
                        } else if (highlightType === 'oval') {
                            this.textCanvas.drawOval(
                                CanvasKit.XYWHRect(
                                    character.x,
                                    row.contentTop,
                                    endCharacter.x + endCharacter.width - character.x,
                                    row.contentHeight
                                ),
                                highlightPaint
                            );
                        } else if (highlightType === 'x') {
                            this.textCanvas.drawLine(
                                character.x,
                                row.contentTop + row.contentHeight / 4,
                                endCharacter.x + endCharacter.width,
                                row.contentTop + row.contentHeight,
                                highlightPaint
                            );
                            this.textCanvas.drawLine(
                                character.x,
                                row.contentTop + row.contentHeight,
                                endCharacter.x + endCharacter.width,
                                row.contentTop + row.contentHeight / 4,
                                highlightPaint
                            );
                        }
                    } else {
                        if (highlightType === 'fill') {
                            this.textCanvas.drawRect4f(
                                character.x,
                                (row.contentTop + row.contentBottom) / 2,
                                this._textMetrics!.allCharacter[row.endIndex].x +
                                    this._textMetrics!.allCharacter[row.endIndex].width,
                                row.contentTop + row.contentHeight,
                                highlightPaint
                            );
                            for (
                                let index = character.whichRow + 1;
                                index <= endCharacter.whichRow - 1;
                                index++
                            ) {
                                const targetRow = this._textMetrics!.rows[index];
                                const startCharacter =
                                    this._textMetrics!.allCharacter[targetRow.startIndex];
                                const endCharacter =
                                    this._textMetrics!.allCharacter[targetRow.endIndex];
                                this.textCanvas.drawRect4f(
                                    startCharacter.x,
                                    (targetRow.contentTop + row.contentBottom) / 2,
                                    endCharacter.x + endCharacter.width,
                                    targetRow.contentTop + targetRow.contentHeight,
                                    highlightPaint
                                );
                            }
                            const endRow = this._textMetrics!.rows[endCharacter.whichRow];
                            this.textCanvas.drawRect4f(
                                this._textMetrics!.allCharacter[endRow.startIndex].x,
                                (endRow.contentTop + endRow.contentBottom) / 2,
                                endCharacter.x + endCharacter.width,
                                endRow.contentTop + endRow.contentHeight,
                                highlightPaint
                            );
                        } else if (highlightType === 'oval') {
                            this.textCanvas.drawOval(
                                CanvasKit.XYWHRect(
                                    character.x,
                                    row.contentTop,
                                    this._textMetrics!.allCharacter[row.endIndex].x +
                                        this._textMetrics!.allCharacter[row.endIndex].width -
                                        character.x,
                                    row.contentHeight
                                ),
                                highlightPaint
                            );
                            for (
                                let index = character.whichRow + 1;
                                index <= endCharacter.whichRow - 1;
                                index++
                            ) {
                                const targetRow = this._textMetrics!.rows[index];
                                const startCharacter =
                                    this._textMetrics!.allCharacter[targetRow.startIndex];
                                const endCharacter =
                                    this._textMetrics!.allCharacter[targetRow.endIndex];
                                this.textCanvas.drawOval(
                                    CanvasKit.XYWHRect(
                                        startCharacter.x,
                                        targetRow.contentTop,
                                        endCharacter.x + endCharacter.width - startCharacter.x,
                                        targetRow.contentHeight
                                    ),
                                    highlightPaint
                                );
                            }
                            const endRow = this._textMetrics!.rows[endCharacter.whichRow];
                            this.textCanvas.drawOval(
                                CanvasKit.XYWHRect(
                                    this._textMetrics!.allCharacter[endRow.startIndex].x,
                                    endRow.contentTop,
                                    endCharacter.x +
                                        endCharacter.width -
                                        this._textMetrics!.allCharacter[endRow.startIndex].x,
                                    endRow.contentHeight
                                ),
                                highlightPaint
                            );
                        } else if (highlightType === 'x') {
                            this.textCanvas.drawLine(
                                character.x,
                                row.contentTop + row.height / 4,
                                this._textMetrics!.allCharacter[row.endIndex].x +
                                    this._textMetrics!.allCharacter[row.endIndex].width,
                                row.contentBottom,
                                highlightPaint
                            );
                            this.textCanvas.drawLine(
                                character.x,
                                row.contentBottom,
                                this._textMetrics!.allCharacter[row.endIndex].x +
                                    this._textMetrics!.allCharacter[row.endIndex].width,
                                row.contentTop + row.contentHeight / 4,
                                highlightPaint
                            );
                            for (
                                let index = character.whichRow + 1;
                                index <= endCharacter.whichRow - 1;
                                index++
                            ) {
                                const targetRow = this._textMetrics!.rows[index];
                                const startCharacter =
                                    this._textMetrics!.allCharacter[targetRow.startIndex];
                                const endCharacter =
                                    this._textMetrics!.allCharacter[targetRow.endIndex];
                                this.textCanvas.drawLine(
                                    startCharacter.x,
                                    targetRow.contentTop + targetRow.contentHeight / 4,
                                    endCharacter.x + endCharacter.width,
                                    targetRow.contentBottom,
                                    highlightPaint
                                );
                                this.textCanvas.drawLine(
                                    character.x,
                                    targetRow.contentBottom,
                                    this._textMetrics!.allCharacter[targetRow.endIndex].x +
                                        this._textMetrics!.allCharacter[targetRow.endIndex].width,
                                    targetRow.contentTop + targetRow.contentHeight / 4,
                                    highlightPaint
                                );
                            }
                            const endRow = this._textMetrics!.rows[endCharacter.whichRow];
                            this.textCanvas.drawLine(
                                this._textMetrics!.allCharacter[endRow.startIndex].x,
                                endRow.contentTop + endRow.height / 4,
                                endCharacter.x + endCharacter.width,
                                endRow.bottom,
                                highlightPaint
                            );
                            this.textCanvas.drawLine(
                                this._textMetrics!.allCharacter[endRow.startIndex].x,
                                endRow.bottom,
                                endCharacter.x + endCharacter.width,
                                endRow.contentTop + endRow.height / 4,
                                highlightPaint
                            );
                        }
                    }
                    highlightPaint.delete();
                }
            }

            let font;
            if (character.isEmoji && this._emojiFontFamily) {
                font = new CanvasKit.Font(
                    this._typeFace.get(this._emojiFontFamily)!,
                    character.style.fontSize * window.devicePixelRatio
                );
            } else {
                font = new CanvasKit.Font(
                    this._typeFace.get(character.style.fontFamily)!,
                    character.style.fontSize * window.devicePixelRatio
                );

                font.setEmbolden(character.style.fontWeight !== 'normal');
                font.setSkewX(character.style.fontStyle === 'normal' ? 0 : -1 / 4);
            }
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
                this.textCanvas.drawText(character.char, character.x, drawTextY, shadowPaint, font);
                shadowPaint.delete();
            }
            if (character.style.stroke) {
                const strokePaint = new CanvasKit.Paint();
                strokePaint.setAntiAlias(true);
                strokePaint.setColor(CanvasKit.parseColorString(character.style.stroke.color));
                strokePaint.setStyle(CanvasKit.PaintStyle.Stroke);
                strokePaint.setStrokeWidth(character.style.stroke.width);
                this.textCanvas.drawText(character.char, character.x, drawTextY, strokePaint, font);
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
            this.textCanvas.drawText(character.char, character.x, drawTextY, textPaint, font);
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
                    this.textCanvas.drawLine(
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
                    this.textCanvas.drawPath(path, decorationPaint);
                    path.delete();
                }
                decorationPaint.delete();
            }
            font.delete();
            characterIndex++;
        });

        this.textSurface.flush();

        textPaint.delete();

        if (this._listStyleType) {
            const paint = new CanvasKit.Paint();
            paint.setColor(CanvasKit.Color(0, 0, 0, 1.0));
            paint.setAntiAlias(true);
            let font: any = null;
            if (this._listStyleType === 'circle') {
                paint.setStyle(CanvasKit.PaintStyle.Stroke);
                paint.setStrokeWidth(2);
            } else if (this._listStyleType === 'disc' || typeof this._listStyleType === 'string') {
                paint.setStyle(CanvasKit.PaintStyle.Fill);
            }
            if (typeof this._listStyleType === 'string' && this._emojiFontFamily) {
                font = new CanvasKit.Font(
                    this._typeFace.get(this._emojiFontFamily)!,
                    this.LIST_EMOJI_FONT_SIZE * window.devicePixelRatio
                );
            }
            rowsForList.forEach((row) => {
                if (this._listStyleType === 'disc' || this._listStyleType === 'circle') {
                    this.listCanvas.drawCircle(
                        (this.LIST_CANVAS_WIDTH * window.devicePixelRatio) / 2,
                        (row.top + row.bottom) / 2,
                        20,
                        paint
                    );
                } else if (typeof this._listStyleType === 'string') {
                    this.listCanvas.drawText(
                        this._listStyleType,
                        (this.LIST_CANVAS_WIDTH * window.devicePixelRatio) / 2 -
                            ((this.LIST_EMOJI_FONT_SIZE * window.devicePixelRatio) / 3) * 2,
                        (row.top + row.bottom) / 2 +
                            (this.LIST_EMOJI_FONT_SIZE * window.devicePixelRatio) / 3,
                        paint,
                        font
                    );
                }
            });
            this.listSurface.flush();
            paint.delete();
            font?.delete();
        }
    }

    isUseDevicePixelRatio(): boolean {
        return true;
    }

    destroy() {}

    private get textSurface() {
        return this._textSurface!;
    }

    private get textCanvas() {
        return this._textCanvas!;
    }

    private get listSurface() {
        return this._listSurface!;
    }

    private get listCanvas() {
        return this._listCanvas!;
    }
}
