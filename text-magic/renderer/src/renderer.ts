import {
    TMCharacterMetrics,
    TMFontInfo,
    TMRenderer as IRenderer,
    TMTextData,
    TMTextMetrics,
    TMTextRow,
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

    private _textMetrics: TMTextMetrics;
    private _paragraph: Paragraph | null = null;

    constructor() {
        this._textMetrics = { width: 0, height: 0, rows: [], characterMetrics: [] };

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

    getPositionForCursor(mouseX: number, mouseY: number): number {
        let indexOfFullText = 0;
        for (let i = 0; i < this._textMetrics.rows.length; i++) {
            const currentRow = this._textMetrics.rows[i];
            if (mouseY < currentRow.y || mouseY > currentRow.y + currentRow.height) {
                indexOfFullText += currentRow.characterMetrics.length;
                continue;
            }
            for (let j = 0; j < currentRow.characterMetrics.length; j++) {
                const bound = currentRow.characterMetrics[j];
                if (mouseX >= bound.x && mouseX <= bound.x + bound.width) {
                    const indexOfRow = mouseX < bound.x + bound.width / 2 ? j - 1 : j;
                    return indexOfFullText + indexOfRow;
                }
            }
            return Math.max(
                -1,
                indexOfFullText +
                    currentRow.characterMetrics.length -
                    (currentRow.characterMetrics[currentRow.characterMetrics.length - 1].width >= 0
                        ? 1
                        : 2)
            );
        }
        return this._textMetrics.characterMetrics.length - 1;
    }

    measure(data: TMTextData) {
        const CanvasKit = this.CanvasKit!;
        const rows: TMTextRow[] = [];
        const characterBounds: TMCharacterMetrics[] = [];
        data.fragments.forEach((fragment) => {
            const paraStyle = new CanvasKit.ParagraphStyle({
                textStyle: {
                    color: CanvasKit.BLACK,
                    fontFamilies: ['Roboto'],
                    fontSize: 28,
                },
                textAlign: CanvasKit.TextAlign.Left,
            });
            const builder = CanvasKit.ParagraphBuilder.MakeFromFontProvider(
                paraStyle,
                this.FontMgr!
            );
            builder.addText(fragment.content);
            this._paragraph = builder.build();
            this._paragraph.layout(data.width);
            const shapedLines = this._paragraph.getShapedLines();
            const lineMetrics = this._paragraph.getLineMetrics();
            shapedLines.forEach((line, index) => {
                rows.push({
                    y: line.top,
                    width: lineMetrics[index].width,
                    height: lineMetrics[index].height,
                    characterMetrics: [],
                });
                const currentRow = rows[rows.length - 1];
                line.runs.forEach((item) => {
                    for (let i = 0; i < item.positions.length - 1; i++) {
                        if (i % 2 !== 0) {
                            continue;
                        }
                        const bound: TMCharacterMetrics = {
                            x: item.positions[i],
                            y: line.top,
                            width: item.positions[i + 2] - item.positions[i],
                            height: lineMetrics[index].height,
                            fragmentId: fragment.id,
                            indexOfFragment: currentRow.characterMetrics.length,
                        };
                        currentRow.characterMetrics.push(bound);
                        characterBounds.push(bound);
                    }
                });
            });
        });

        this._textMetrics = {
            width: data.width,
            height: data.height,
            rows,
            characterMetrics: characterBounds,
        };
        return this._textMetrics;
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
