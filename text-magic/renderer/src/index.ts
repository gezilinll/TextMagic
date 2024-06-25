import {
    Rect,
    TMCharacterPosition,
    TMRenderer as IRenderer,
    TMSelectRange,
    TMTextData,
    TMTextFragment,
    TMTextMetrics,
    TMTextRow,
} from '@text-magic/common';

export class TMRenderer implements IRenderer {
    private _container: HTMLDivElement;
    private _canvas: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;
    private _textMetrics: TMTextMetrics;

    constructor() {
        this._textMetrics = { width: 0, height: 0, rows: [], characterBounds: [] };

        this._container = document.createElement('div');

        this._canvas = document.createElement('canvas');
        this._context = this._canvas.getContext('2d')!;
        this._container.appendChild(this._canvas);
    }

    getContainer(): HTMLDivElement {
        return this._container;
    }

    getPositionForCursor(mouseX: number, mouseY: number): TMCharacterPosition {
        let indexOfFullText = 0;
        for (let i = 0; i < this._textMetrics.rows.length; i++) {
            const currentRow = this._textMetrics.rows[i];
            if (mouseY < currentRow.y || mouseY > currentRow.y + currentRow.height) {
                indexOfFullText += currentRow.fragments.length;
                continue;
            }
            for (let j = 0; j < currentRow.fragments.length; j++) {
                const bound = currentRow.fragments[j].bound;
                if (mouseX >= bound.x && mouseX <= bound.x + bound.width) {
                    const indexOfRow = mouseX < bound.x + bound.width / 2 ? j - 1 : j;
                    return {
                        whichRow: i,
                        indexOfRow,
                        indexOfFullText: indexOfFullText + indexOfRow,
                    };
                }
            }
            return {
                whichRow: i,
                indexOfRow: currentRow.fragments.length - 1,
                indexOfFullText: indexOfFullText + currentRow.fragments.length - 1,
            };
        }
        const whichRow = Math.max(0, this._textMetrics.rows.length - 1);
        const indexOfRow =
            this._textMetrics.rows.length > 0
                ? this._textMetrics.rows[this._textMetrics.rows.length - 1].fragments.length - 1
                : -1;
        indexOfFullText = this._textMetrics.characterBounds.length - 1;
        return { whichRow, indexOfRow, indexOfFullText };
    }

    measure(data: TMTextData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const rows: TMTextRow[] = [];
        const characterBounds: Rect[] = [];
        rows.push({
            y: 0,
            width: 0,
            height: 0,
            originHeight: 0,
            fontDescent: 0,
            fragments: [],
        });
        let x = 0;
        let y = 0;
        data.fragments.forEach((item) => {
            const fontSize = item.fontSize;
            const font = this._getFont(item);
            const measureInfo = {
                width: 0,
                height: 0,
                ascent: 0,
                descent: 0,
                fontDescent: 0,
            };
            if (item.content === '\n') {
                measureInfo.height = fontSize;
            } else {
                ctx.font = font;
                const {
                    width,
                    actualBoundingBoxAscent,
                    actualBoundingBoxDescent,
                    fontBoundingBoxAscent,
                    fontBoundingBoxDescent,
                } = ctx.measureText(item.content);
                measureInfo.width = width;
                measureInfo.height = fontBoundingBoxAscent + fontBoundingBoxDescent;
                measureInfo.ascent = actualBoundingBoxAscent;
                measureInfo.descent = actualBoundingBoxDescent;
                measureInfo.fontDescent = fontBoundingBoxDescent;
            }
            const curRow = rows[rows.length - 1];
            if (curRow.width + measureInfo.width <= data.width && item.content !== '\n') {
                curRow.fragments.push({
                    ...item,
                    font,
                    bound: {
                        x,
                        y,
                        width: measureInfo.width,
                        height: measureInfo.height,
                    },
                });
                characterBounds.push({
                    x,
                    y,
                    width: measureInfo.width,
                    height: measureInfo.height,
                });
                curRow.width += measureInfo.width;
                curRow.height = measureInfo.height;
                curRow.originHeight = Math.max(curRow.originHeight, measureInfo.height);
                curRow.fontDescent = measureInfo.fontDescent;
            } else {
                x = 0;
                y += curRow.height;
                rows.push({
                    y,
                    width: measureInfo.width,
                    height: measureInfo.height,
                    originHeight: measureInfo.height,
                    fontDescent: measureInfo.descent,
                    maxDescent: measureInfo.descent,
                    fragments: [
                        {
                            ...item,
                            font,
                            bound: {
                                x,
                                y,
                                width: measureInfo.width,
                                height: measureInfo.height,
                            },
                        },
                    ],
                });
                characterBounds.push({
                    x,
                    y,
                    width: measureInfo.width,
                    height: measureInfo.height,
                });
            }
            x += measureInfo.width;
        });
        this._textMetrics = { width: data.width, height: data.height, rows, characterBounds };
        return this._textMetrics;
    }

    render(selectRange?: TMSelectRange) {
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._canvas.width = this._textMetrics.width;
        this._canvas.height = this._textMetrics.height;
        this._canvas.style.width = `${this._textMetrics.width}px`;
        this._canvas.style.height = `${this._textMetrics.height}px`;
        const ctx = this._context;
        let renderHeight = 0;
        let selectStart = -1;
        let selectEnd = -1;
        if (
            selectRange &&
            selectRange.start !== selectRange.end &&
            selectRange.start !== -1 &&
            selectRange.end !== -1
        ) {
            selectStart = Math.min(selectRange.start, selectRange.end);
            selectEnd = Math.max(selectRange.start, selectRange.end);
        }
        let renderIndex = 0;
        this._textMetrics.rows.forEach((row) => {
            let renderWidth = 0;
            row.fragments.forEach((item) => {
                if (item.content === '\n') {
                    return;
                }
                ctx.save();
                ctx.font = item.font;
                ctx.fillStyle = item.color;
                ctx.fillText(
                    item.content,
                    renderWidth,
                    renderHeight + row.height - row.fontDescent
                );
                if (selectStart !== selectEnd) {
                    if (renderIndex > selectStart && renderIndex <= selectEnd) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.globalAlpha = selectRange!.opacity;
                        ctx.fillStyle = selectRange!.color;
                        ctx.fillRect(
                            renderWidth,
                            renderHeight,
                            item.bound.width,
                            item.bound.height
                        );
                        ctx.restore();
                    }
                }
                renderWidth += item.bound.width;
                renderIndex++;
                ctx.restore();
            });
            renderHeight += row.height;
        });
    }

    private _getFont(fragment: TMTextFragment) {
        return `${fragment.fontSize}px ${fragment.fontFamily}`;
    }
}
