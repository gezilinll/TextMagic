import {
    TMCursorInfo,
    TMInput as IInput,
    TMInputOptions,
    TMRenderer,
    TMSelectRange,
    TMTextData,
    TMTextMetrics,
    TMTextStyle,
} from '@text-magic/common';
import { clone, throttle } from 'lodash';

export class TMInput implements IInput {
    private _textData: TMTextData;
    private _textMetrics: TMTextMetrics;
    private _textArea: HTMLTextAreaElement;
    private _cursor: HTMLDivElement;

    private _renderer: TMRenderer | null = null;
    private _cursorInfo: TMCursorInfo;
    private _selectRange: TMSelectRange;
    private _rangeCanvas: HTMLCanvasElement;
    private _renderRange: any = null;
    private _blinkTimer = Number.NaN;

    private _isMouseDown = false;
    private _isCompositing = false;
    private _media: MediaQueryList;
    private _devicePixelRatioListener: any;
    private _defaultOptions: TMInputOptions;

    constructor(options?: TMInputOptions) {
        this._defaultOptions = options || {
            fontSize: 16,
            fontColor: '#000000',
            fontFamily: 'Yahei',
            width: 260,
            height: 200,
            autoBlur: false,
        };

        this._textData = {
            width: this._defaultOptions.width,
            height: this._defaultOptions.height,
            content: '',
        };

        this._selectRange = {
            start: { characterIndex: -1, position: 'after' },
            end: { characterIndex: -1, position: 'after' },
            color: '#0000FF',
            opacity: 0.2,
        };

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

        if (this._defaultOptions.autoBlur) {
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
        }

        this._cursor = document.createElement('div');
        this._cursor.style.position = 'absolute';
        this._cursor.style.width = '1px';
        this._cursor.style.backgroundColor = '#000';

        this._media = window!.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        this._devicePixelRatioListener = this._handleDevicePixelRatioChanged.bind(this);
        this._media.addEventListener('change', this._devicePixelRatioListener);

        this._rangeCanvas = document.createElement('canvas');
        this._rangeCanvas.style.position = 'absolute';
        this._rangeCanvas.style.left = '0px';

        this._textMetrics = { width: 0, height: 0, allCharacter: [] };
        this._cursorInfo = this.getCursorByCoordinate(0, 0);
    }

    async init(renderer: TMRenderer): Promise<boolean> {
        this._renderer = renderer;

        const result = await this._renderer.init();

        this._renderer
            .getContainer()
            .addEventListener('mousedown', this._handleMouseDown.bind(this));
        this._renderer
            .getContainer()
            .addEventListener('mousemove', this._handleMouseMove.bind(this));
        this._renderer.getContainer().addEventListener('mouseup', this._handleMouseUp.bind(this));

        this._renderer.getContainer().appendChild(this._textArea);

        this._renderer.getContainer().appendChild(this._cursor);

        this._renderer.getContainer().appendChild(this._rangeCanvas);

        return result;
    }

    focus() {
        this._hideSelectRange();
        this._showCursor();
    }

    blur() {
        this._hideCursor();
        this._hideSelectRange();
    }

    destroy() {
        this._media.removeEventListener('change', this._devicePixelRatioListener);
    }

    getCursorByCoordinate(mouseX: number, mouseY: number): TMCursorInfo {
        if (this._textMetrics.allCharacter.length === 0) {
            return {
                characterIndex: -1,
                position: 'after',
            };
        }
        let result = -1;
        for (let i = 0; i < this._textMetrics.allCharacter.length; i++) {
            const bound = this._textMetrics.allCharacter[i];
            if (mouseY >= bound.y && mouseY <= bound.y + bound.height) {
                if (mouseX >= bound.x && mouseX <= bound.x + bound.width) {
                    result = i;
                    break;
                } else if (i + 1 <= this._textMetrics.allCharacter.length - 1) {
                    const nextBound = this._textMetrics.allCharacter[i + 1];
                    if (nextBound.isNewLine || nextBound.y > bound.y) {
                        result = i;
                        break;
                    }
                }
            }
        }
        if (result === -1) {
            result = this._textMetrics.allCharacter.length - 1;
        }
        const targetBound = this._textMetrics.allCharacter[result];
        return {
            characterIndex: result,
            position: mouseX < targetBound.x + targetBound.width / 2 ? 'before' : 'after',
        };
    }

    private _handleMouseDown(e: MouseEvent) {
        this._isMouseDown = true;

        this._cursorInfo = this.getCursorByCoordinate(
            e.offsetX * this.devicePixelRatio,
            e.offsetY * this.devicePixelRatio
        );
        this._hideSelectRange();
        this.focus();
        this._showCursor();
    }

    private _getCursorPosition() {
        if (
            this._textMetrics.allCharacter.length === 0 ||
            (this._cursorInfo.characterIndex < 0 && this._cursorInfo.position === 'before')
        ) {
            return { x: 0, y: 0, height: this._defaultOptions.fontSize };
        }
        if (
            (this._cursorInfo.characterIndex === -1 && this._cursorInfo.position === 'after') ||
            (this._cursorInfo.characterIndex === 0 && this._cursorInfo.position === 'before')
        ) {
            const nextCharacter = this._textMetrics.allCharacter[0];
            return { x: 0, y: 0, height: nextCharacter.height };
        }
        console.log('_getCursorPosition', this._cursorInfo, this._textMetrics);
        const character = this._textMetrics.allCharacter[this._cursorInfo.characterIndex];
        if (character.isNewLine && this._cursorInfo.position === 'after') {
            return {
                x: 0,
                y: character.y + character.height,
                height: character.height,
            };
        }
        return {
            x: character.x + (this._cursorInfo.position === 'after' ? character.width : 0),
            y: character.y,
            height: character.height,
        };
    }

    private _showCursor() {
        clearTimeout(this._blinkTimer);
        const bound = this._getCursorPosition();

        this._cursor.style.left = `${bound.x / this.devicePixelRatio}px`;
        this._cursor.style.top = `${bound.y / this.devicePixelRatio}px`;
        this._cursor.style.height = `${bound.height / this.devicePixelRatio}px`;
        this._cursor.style.opacity = '1';
        setTimeout(() => {
            this._textArea.focus();
            this._cursor.style.display = 'block';
            this._blinkCursor(0);
        }, 0);
    }

    private _blinkCursor(opacity: number) {
        clearTimeout(this._blinkTimer);
        this._blinkTimer = setTimeout(() => {
            this._cursor.style.opacity = String(opacity);
            this._blinkCursor(opacity === 0 ? 1 : 0);
        }, 500);
    }

    private _hideCursor() {
        clearTimeout(this._blinkTimer);
        this._cursor.style.display = 'none';
        this._cursorInfo.characterIndex = -1;
    }

    private _getSelectRange() {
        if (this._selectRange.start.characterIndex === this._selectRange.end.characterIndex) {
            return { start: -1, end: -1 };
        }
        const start =
            this._selectRange.start.characterIndex +
            (this._selectRange.start.position === 'after' ? 1 : 0);
        const end =
            this._selectRange.end.characterIndex +
            (this._selectRange.end.position === 'after' ? 1 : 0);
        return { start: Math.min(start, end), end: Math.max(start, end) };
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
                    if (this._isCursorShowing()) {
                        this._selectRange.start = clone(this._cursorInfo);
                    }
                    this._selectRange.end = this.getCursorByCoordinate(
                        event.offsetX * this.devicePixelRatio,
                        event.offsetY * this.devicePixelRatio
                    );
                    const targetRange = this._getSelectRange();
                    if (targetRange.end - targetRange.start > 0) {
                        this._hideCursor();
                        this._rangeCanvas.width = this._textMetrics.width;
                        this._rangeCanvas.height = this._textMetrics.height;
                        const ctx = this._rangeCanvas.getContext('2d')!;
                        ctx.clearRect(0, 0, this._rangeCanvas.width, this._rangeCanvas.height);
                        this._textMetrics.allCharacter.forEach((item, index) => {
                            if (index >= targetRange.start && index < targetRange.end) {
                                ctx.save();
                                ctx.beginPath();
                                ctx.globalAlpha = this._selectRange!.opacity;
                                ctx.fillStyle = this._selectRange!.color;
                                ctx.fillRect(item.x, item.y, item.width, item.height);
                                ctx.restore();
                            }
                        });
                    }
                },
                100,
                { leading: true }
            );
        }
        this._renderRange(e);
    }

    private _hideSelectRange() {
        if (
            this._selectRange.start.characterIndex !== -1 ||
            this._selectRange.end.characterIndex !== -1
        ) {
            this._selectRange.start.characterIndex = -1;
            this._selectRange.end.characterIndex = -1;
            const ctx = this._rangeCanvas.getContext('2d')!;
            ctx.clearRect(0, 0, this._rangeCanvas.width, this._rangeCanvas.height);
        }
    }

    private _handleMouseUp() {
        this._isMouseDown = false;
    }

    applyStyle(style: Partial<TMTextStyle>) {}

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

            this._textData.content = this._insertToContentAtCursorPosition(
                this._textData.content,
                data
            );
            this._textMetrics = this.renderer.measure(this._textData);
            this.renderer.render();
            this._cursorInfo.characterIndex += data.length;
            this._hideSelectRange();
            this._showCursor();
        }, 0);
    }

    private _insertToContentAtCursorPosition(str: string, char: string): string {
        if (this._cursorInfo.characterIndex > str.length) {
            return str + char;
        }
        const index =
            this._cursorInfo.position === 'after'
                ? this._cursorInfo.characterIndex + 1
                : this._cursorInfo.characterIndex;
        return str.slice(0, index) + char + str.slice(index);
    }

    private _handleKeyDown(e: KeyboardEvent) {
        if (e.code === 'Enter') {
            this._newLine();
            e.preventDefault();
        } else if (e.code === 'Backspace') {
            this._delete();
            e.preventDefault();
        }
    }

    private _newLine() {
        this._textData.content = this._insertToContentAtCursorPosition(
            this._textData.content,
            '\n'
        );
        this._textMetrics = this.renderer.measure(this._textData);
        this.renderer.render();
        this._cursorInfo.characterIndex++;
        this._hideSelectRange();
        this._showCursor();
    }

    private _delete() {
        let startIndex = -1;
        let length = 0;
        const selectRange = this._getSelectRange();
        if (selectRange.end - selectRange.start > 0) {
            startIndex = selectRange.start;
            length = selectRange.end - selectRange.start;
            this._cursorInfo.characterIndex = selectRange.start;
            this._cursorInfo.position = 'before';
        } else if (
            (this._cursorInfo.characterIndex === 0 && this._cursorInfo.position === 'after') ||
            this._cursorInfo.characterIndex > 0
        ) {
            startIndex = this._cursorInfo.characterIndex;
            length = 1;
            this._cursorInfo.characterIndex--;
        }
        if (length > 0) {
            this._textData.content =
                this._textData.content.slice(0, startIndex) +
                this._textData.content.slice(startIndex + length);
            console.log('_delete', startIndex, length, this._cursorInfo);
            this._textMetrics = this.renderer.measure(this._textData);
            this.renderer.render();
            this._hideSelectRange();
            this._showCursor();
        }
    }

    private _isCursorShowing() {
        return this._cursor.style.display === 'block';
    }

    private get renderer() {
        return this._renderer!;
    }

    private get devicePixelRatio() {
        return this.renderer.isUseDevicePixelRatio() ? window.devicePixelRatio : 1;
    }
}
