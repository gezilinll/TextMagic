import {
    Rect,
    TMCharacterPosition,
    TMRenderer as IRenderer,
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
                    return { whichRow: i, indexOfRow: j, indexOfFullText: indexOfFullText + j };
                }
            }
            return {
                whichRow: i,
                indexOfRow: currentRow.fragments.length - 1,
                indexOfFullText: indexOfFullText + currentRow.fragments.length - 1,
            };
        }
        return { whichRow: 0, indexOfRow: -1, indexOfFullText: -1 };
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
            maxDescent: 0,
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
            };
            if (item.content === '\n') {
                measureInfo.height = fontSize;
            } else {
                ctx.font = font;
                const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } =
                    ctx.measureText(item.content);
                measureInfo.width = width;
                measureInfo.height = actualBoundingBoxAscent + actualBoundingBoxDescent;
                measureInfo.ascent = actualBoundingBoxAscent;
                measureInfo.descent = actualBoundingBoxDescent;
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
                curRow.height = Math.max(curRow.height, measureInfo.height);
                curRow.originHeight = Math.max(curRow.originHeight, measureInfo.height);
                curRow.maxDescent = Math.max(curRow.maxDescent, measureInfo.descent);
                x += measureInfo.width;
            } else {
                x = 0;
                y += curRow.height;
                rows.push({
                    y,
                    width: 0,
                    height: 0,
                    originHeight: 0,
                    maxDescent: 0,
                    fragments: [],
                });
            }
        });
        this._textMetrics = { width: data.width, height: data.height, rows, characterBounds };
        return this._textMetrics;
    }

    render() {
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._canvas.width = this._textMetrics.width;
        this._canvas.height = this._textMetrics.height;
        const ctx = this._context;
        let renderHeight = 0;
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
                    renderHeight + row.height - (row.height - row.originHeight) / 2 - row.maxDescent
                );
                renderWidth += item.bound.width;
                ctx.restore();
            });
            renderHeight += row.height;
        });
    }

    private _getFont(fragment: TMTextFragment) {
        return `${fragment.fontSize}px`;
    }
}
