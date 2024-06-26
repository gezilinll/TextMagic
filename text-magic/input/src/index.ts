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
    private _textArea: HTMLTextAreaElement;
    private _cursor: HTMLDivElement;

    private _renderer: TMRenderer | null = null;
    private _cursorPosition = -1;
    private _selectRange: TMSelectRange;
    private _renderRange: any = null;
    private _blinkTimer = Number.NaN;

    private _isMouseDown = false;
    private _isCompositing = false;
    private _media: MediaQueryList;
    private _devicePixelRatioListener: any;
    private _defaultOptions: TMInputOptions;

    private _listeners: Record<string, any> = {};

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
        this._textArea.style.left = '-99999px';
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

        document.addEventListener('mousedown', (event) => {
            if (!this._renderer) {
                return;
            }
            const bound = this._renderer.getContainer().getBoundingClientRect();
            if (
                event.clientX >= bound.x &&
                event.clientX <= bound.x + bound.width &&
                event.clientY >= bound.y &&
                event.clientY <= bound.y + bound.height
            ) {
                this.focus();
            } else {
                this.blur();
            }
        });

        this._cursor = document.createElement('div');
        this._cursor.style.position = 'absolute';
        this._cursor.style.width = '1px';
        this._cursor.style.backgroundColor = '#000';

        this._media = window!.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        this._devicePixelRatioListener = this._handleDevicePixelRatioChanged.bind(this);
        this._media.addEventListener('change', this._devicePixelRatioListener);
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
        this._hideSelectRange();
    }

    destroy() {
        this._media.removeEventListener('change', this._devicePixelRatioListener);
    }

    private _handleDevicePixelRatioChanged() {
        if (this._renderer && this._renderer.isUseDevicePixelRatio()) {
            this._hideSelectRange();
            this._hideCursor();
            this._textMetrics = this.renderer.measure(this._textData);
            this.renderer.notifyDevicePixelRatioChanged();
        }
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
            e.offsetX * this.devicePixelRatio,
            e.offsetY * this.devicePixelRatio
        ).indexOfFullText;
        this._selectRange.start = this._cursorPosition;
        this.focus();
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
                        event.offsetX * this.devicePixelRatio,
                        event.offsetY * this.devicePixelRatio
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

    private _handleKeyDown(e: KeyboardEvent) {
        if (e.code === 'Enter') {
            this._newLine();
            e.preventDefault();
        } else if (e.code === 'Backspace') {
            this._delete();
            e.preventDefault();
        } else if (e.code === 'Tab') {
            this._tab();
            e.preventDefault();
        }
    }

    private _newLine() {
        this._textData.fragments.splice(this._cursorPosition + 1, 0, {
            content: '\n',
            fontSize: this._defaultOptions.fontSize,
            color: '',
            fontFamily: '',
            fontStyle: '',
        });
        this._textMetrics = this.renderer.measure(this._textData);
        this.renderer.render();
        this._cursorPosition++;
        this._showCursor();
    }

    private _delete() {}

    private _tab() {}

    private _showCursor() {
        this._hideSelectRange();
        clearTimeout(this._blinkTimer);
        const textInfo: Rect = {
            x: 0,
            y: 0,
            width: 0,
            height: this._defaultOptions.fontSize * this.devicePixelRatio,
        };
        if (this._cursorPosition >= 0) {
            const fragment = this._textData.fragments[this._cursorPosition];
            const bounds = this.textMetrics.characterBounds[this._cursorPosition];
            if (fragment.content === '\n') {
                const nextRow = this.textMetrics.rows[bounds.rowIndex + 1];
                textInfo.y = nextRow.y;
                textInfo.height = nextRow.height;
            } else {
                textInfo.x = bounds.x + bounds.width;
                textInfo.y = bounds.y;
                textInfo.height = this.textMetrics.rows[bounds.rowIndex].height;
            }
        }

        this._cursor.style.left = `${(textInfo.x + textInfo.width) / this.devicePixelRatio}px`;
        this._cursor.style.top = `${textInfo.y / this.devicePixelRatio}px`;
        this._cursor.style.height = `${textInfo.height / this.devicePixelRatio}px`;
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
        clearTimeout(this._blinkTimer);
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

    private get devicePixelRatio() {
        return this.renderer.isUseDevicePixelRatio() ? window.devicePixelRatio : 1;
    }
}
