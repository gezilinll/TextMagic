import { Rect, TMInput as IInput, TMRenderer, TMTextData, TMTextMetrics } from '@text-magic/common';

export class TMInput implements IInput {
    private _textData: TMTextData;
    private _textMetrics: TMTextMetrics | null = null;
    private _renderer: TMRenderer | null = null;
    private _textArea: HTMLTextAreaElement;
    private _cursorPosition = -1;
    private _cursor: HTMLDivElement;
    private _blinkTimer = Number.NaN;
    private _isMouseDown = false;
    private _isCompositing = false;

    constructor() {
        this._textData = { width: 100, height: 100, fragments: [] };

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
        this._showCursor();
    }

    private _handleKeyDown() {}

    private _showCursor() {
        clearTimeout(this._blinkTimer);
        const textInfo: Rect =
            this._cursorPosition >= 0
                ? this.textMetrics.characterBounds[this._cursorPosition]
                : { x: 0, y: 0, width: 0, height: 100 };
        this._cursor.style.left = `${textInfo.x + textInfo.width}px`;
        this._cursor.style.top = `${textInfo.y}px`;
        this._cursor.style.height = `${textInfo.height * 2}px`;
        this._cursor.style.opacity = '1';
        setTimeout(() => {
            this._textArea.focus();
            this._cursor.style.display = 'block';
            this._blinkCursor(0);
        }, 0);
    }

    private _hideCursor() {}

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
