import {
    Rect,
    TMInput as IInput,
    TMInputOptions,
    TMRenderer,
    TMSelectRange,
    TMTextData,
    TMTextMetrics,
} from '@text-magic/common';
import { throttle } from 'lodash';

export class TMInput implements IInput {
    private _textData: TMTextData;
    private _textMetrics: TMTextMetrics | null = null;
    private _renderer: TMRenderer | null = null;
    private _textArea: HTMLTextAreaElement;
    private _cursorPosition = -1;
    private _selectRange: TMSelectRange;
    private _renderRange: any = null;
    private _cursor: HTMLDivElement;
    private _blinkTimer = Number.NaN;
    private _isMouseDown = false;
    private _isCompositing = false;

    private _defaultOptions: TMInputOptions;

    constructor(options?: TMInputOptions) {
        this._defaultOptions = options || {
            fontSize: 16,
            fontColor: '#000000',
            fontFamily: 'Yahei',
            width: 260,
            height: 200,
        };

        this._textData = {
            width: this._defaultOptions.width,
            height: this._defaultOptions.height,
            fragments: [],
        };

        this._selectRange = { start: -1, end: -1, color: '#0000FF', opacity: 0.2 };

        this._textArea = document.createElement('textarea');
        this._textArea.style.position = 'fixed';
        this._textArea.style.left = '300px';
        this._textArea.addEventListener('input', (event) => {
            this._handleInput(event as InputEvent);
        });
        this._textArea.addEventListener('compositionstart', () => {
            this._isCompositing = true;
        });
        this._textArea.addEventListener('compositionend', () => {
            this._isCompositing = false;
        });
        this._textArea.addEventListener('keydown', this._handleKeyDown.bind(this));
        this._textArea.addEventListener('blur', () => {
            this._hideCursor();
            this._hideSelectRange();
        });

        this._cursor = document.createElement('div');
        this._cursor.style.position = 'absolute';
        this._cursor.style.width = '1px';
        this._cursor.style.backgroundColor = '#000';
    }

    bindRenderer(renderer: TMRenderer) {
        this._renderer = renderer;

        this._renderer
            .getContainer()
            .addEventListener('mousedown', this._handleMouseDown.bind(this));
        this._renderer
            .getContainer()
            .addEventListener('mousemove', this._handleMouseMove.bind(this));
        this._renderer.getContainer().addEventListener('mouseup', this._handleMouseUp.bind(this));

        this._renderer.getContainer().appendChild(this._textArea);

        this._renderer.getContainer().appendChild(this._cursor);
    }

    focus() {
        this._showCursor();
    }

    blur() {
        this._hideCursor();
    }

    private _handleInput(e: InputEvent) {
        setTimeout(() => {
            const data = e.data;
            if (!data || this._isCompositing) {
                return;
            }
            const arr = data.split('');
            const length = arr.length;
            const cur = this._textData.fragments[this._cursorPosition];
            this._textData.fragments.splice(
                this._cursorPosition + 1,
                0,
                ...arr.map((item) => {
                    return {
                        ...(cur || {}),
                        content: item,
                        fontSize: this._defaultOptions.fontSize,
                        color: this._defaultOptions.fontColor,
                        fontFamily: this._defaultOptions.fontFamily,
                    };
                })
            );
            this._textMetrics = this.renderer.measure(this._textData);
            this.renderer.render();
            this._cursorPosition += length;
            this._showCursor();
        }, 0);
    }

    private _handleMouseDown(e: MouseEvent) {
        this._isMouseDown = true;

        this._cursorPosition = this.renderer.getPositionForCursor(
            e.offsetX,
            e.offsetY
        ).indexOfFullText;
        this._selectRange.start = this._cursorPosition;
        this._showCursor();
    }

    private _handleMouseMove(e: MouseEvent) {
        if (!this._isMouseDown) {
            return;
        }
        if (!this._renderRange) {
            this._renderRange = throttle(
                (event: MouseEvent) => {
                    if (!this._isMouseDown) {
                        return;
                    }
                    const positionIndex = this.renderer.getPositionForCursor(
                        event.offsetX,
                        event.offsetY
                    ).indexOfFullText;

                    if (positionIndex !== -1) {
                        this._selectRange.end = positionIndex;
                        if (Math.abs(this._selectRange.end - this._selectRange.start) > 0) {
                            this._hideCursor();
                            this.renderer.render(this._selectRange);
                        }
                    }
                },
                100,
                { leading: true }
            );
        }
        this._renderRange(e);
    }

    private _handleMouseUp() {
        this._isMouseDown = false;
    }

    private _handleKeyDown() {}

    private _showCursor() {
        this._hideSelectRange();
        clearTimeout(this._blinkTimer);
        const textInfo: Rect =
            this._cursorPosition >= 0
                ? this.textMetrics.characterBounds[this._cursorPosition]
                : {
                      x: 0,
                      y: 0,
                      width: 0,
                      height:
                          this._textMetrics && this.textMetrics.characterBounds.length > 0
                              ? this.textMetrics.characterBounds[0].height
                              : this._defaultOptions.fontSize,
                  };
        this._cursor.style.left = `${textInfo.x + textInfo.width}px`;
        this._cursor.style.top = `${textInfo.y}px`;
        this._cursor.style.height = `${textInfo.height}px`;
        this._cursor.style.opacity = '1';
        setTimeout(() => {
            this._textArea.focus();
            this._cursor.style.display = 'block';
            this._blinkCursor(0);
        }, 0);
    }

    private _hideCursor() {
        clearTimeout(this._blinkTimer);
        this._cursor.style.display = 'none';
        this._cursorPosition = -1;
    }

    private _hideSelectRange() {
        if (this._selectRange.start !== -1 || this._selectRange.end !== -1) {
            this._selectRange.start === -1;
            this._selectRange.end === -1;
            this.renderer.render();
        }
    }

    private _blinkCursor(opacity: number) {
        this._blinkTimer = setTimeout(() => {
            this._cursor.style.opacity = String(opacity);
            this._blinkCursor(opacity === 0 ? 1 : 0);
        }, 500);
    }

    private get renderer() {
        return this._renderer!;
    }

    private get textMetrics() {
        return this._textMetrics!;
    }
}
