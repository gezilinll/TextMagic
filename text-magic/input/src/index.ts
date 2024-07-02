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
            contents: [],
            styles: [],
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
            if (mouseY >= bound.y && mouseY <= bound.y + bound.lineHeight) {
                if (mouseX >= bound.x && mouseX <= bound.x + bound.width) {
                    result = i;
                    break;
                } else if (i + 1 <= this._textMetrics.allCharacter.length - 1) {
                    const nextBound = this._textMetrics.allCharacter[i + 1];
                    if (nextBound.lineIndex !== bound.lineIndex) {
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
            characterIndex: mouseX < targetBound.x + targetBound.width / 2 ? result - 1 : result,
            position: 'after',
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

    private _getCursorRenderInfo(): { x: number; y: number; height: number } {
        if (this._textMetrics.allCharacter.length === 0 && this._cursorInfo.characterIndex < 0) {
            return { x: 0, y: 0, height: this._defaultOptions.fontSize };
        }
        if (this._cursorInfo.characterIndex < 0 && this._textMetrics.allCharacter.length > 0) {
            const nextCharacter = this._textMetrics.allCharacter[0];
            return { x: 0, y: 0, height: nextCharacter.lineHeight };
        }
        const character = this._textMetrics.allCharacter[this._cursorInfo.characterIndex];
        return {
            x: character.x + character.width,
            y: character.lineTop,
            height: character.lineHeight,
        };
    }

    private _showCursor() {
        clearTimeout(this._blinkTimer);
        const bound = this._getCursorRenderInfo();
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
        const actualStart =
            this._selectRange.start.characterIndex < this._selectRange.end.characterIndex
                ? this._selectRange.start
                : this._selectRange.end;
        const actualEnd =
            this._selectRange.start.characterIndex > this._selectRange.end.characterIndex
                ? this._selectRange.start
                : this._selectRange.end;
        return { start: actualStart.characterIndex + 1, end: actualEnd.characterIndex };
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
                    if (targetRange.start !== -1 && targetRange.end !== -1) {
                        this._hideCursor();
                        this._rangeCanvas.width = this._textMetrics.width * this.devicePixelRatio;
                        this._rangeCanvas.height = this._textMetrics.height * this.devicePixelRatio;
                        this._rangeCanvas.style.width = `${this._textMetrics.width}px`;
                        this._rangeCanvas.style.height = `${this._textMetrics.height}px`;
                        const ctx = this._rangeCanvas.getContext('2d')!;
                        ctx.clearRect(0, 0, this._rangeCanvas.width, this._rangeCanvas.height);
                        for (let index = targetRange.start; index <= targetRange.end; index++) {
                            const character = this._textMetrics.allCharacter[index];
                            ctx.save();
                            ctx.beginPath();
                            ctx.globalAlpha = this._selectRange!.opacity;
                            ctx.fillStyle = this._selectRange!.color;
                            ctx.fillRect(
                                character.x,
                                character.y,
                                character.width,
                                character.height
                            );
                            ctx.restore();
                        }
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

    applyStyle(style: Partial<TMTextStyle>) {
        const range = this._getSelectRange();
        if (range.start !== -1 && range.end !== -1) {
            const startCharacter = this._textMetrics.allCharacter[range.start];
            const endCharacter = this._textMetrics.allCharacter[range.end];
            if (startCharacter.whichContent === endCharacter.whichContent) {
                const content = this._textData.contents[startCharacter.whichContent];
                const baseStyle = this._textData.styles[startCharacter.whichContent];
                this._textData.contents[startCharacter.whichContent] = content.slice(
                    0,
                    startCharacter.indexOfContent
                );
                this._textData.contents.splice(
                    startCharacter.whichContent + 1,
                    0,
                    content.slice(startCharacter.indexOfContent, endCharacter.indexOfContent + 1)
                );
                this._textData.styles.splice(
                    startCharacter.whichContent + 1,
                    0,
                    Object.assign(clone(baseStyle), style)
                );
                this._textData.contents.splice(
                    startCharacter.whichContent + 2,
                    0,
                    content.slice(endCharacter.indexOfContent + 1)
                );
                this._textData.styles.splice(startCharacter.whichContent + 2, 0, clone(baseStyle));
            } else {
                for (
                    let index = startCharacter.whichContent + 1;
                    index < endCharacter.whichContent;
                    index++
                ) {
                    Object.assign(this._textData.styles[index], style);
                }
                const startContent = this._textData.contents[startCharacter.whichContent];
                const startStyle = clone(this._textData.styles[startCharacter.whichContent]);
                const endContent = this._textData.contents[endCharacter.whichContent];
                const endStyle = clone(this._textData.styles[endCharacter.whichContent]);
                this._textData.contents[startCharacter.whichContent] = startContent.slice(
                    0,
                    startCharacter.indexOfContent
                );
                this._textData.contents[endCharacter.whichContent] = endContent.slice(
                    endCharacter.indexOfContent + 1
                );
                this._textData.contents.splice(
                    startCharacter.whichContent + 1,
                    0,
                    startContent.slice(startCharacter.indexOfContent)
                );
                this._textData.styles.splice(
                    startCharacter.whichContent + 1,
                    0,
                    Object.assign(startStyle, style)
                );
                this._textData.contents.splice(
                    endCharacter.whichContent + 1,
                    0,
                    endContent.slice(0, endCharacter.indexOfContent + 1)
                );
                this._textData.styles.splice(
                    endCharacter.whichContent + 1,
                    0,
                    Object.assign(endStyle, style)
                );
            }
        } else if (this._isCursorShowing()) {
            //TODO
        } else {
            this._textData.styles.forEach((styleItem) => {
                Object.assign(styleItem, style);
            });
        }
        this._textMetrics = this.renderer.measure(this._textData);
        this.renderer.render();
        // this._hideSelectRange();
        // this._showCursor();
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

            this._insertToContentAtCursorPosition(data);
            this._textMetrics = this.renderer.measure(this._textData);
            this.renderer.render();
            this._cursorInfo.characterIndex += data.length;
            this._hideSelectRange();
            this._showCursor();
        }, 0);
    }

    private _insertToContentAtCursorPosition(data: string) {
        if (this._textData.contents.length === 0) {
            this._textData.contents.push(data);
            this._textData.styles.push({
                color: this._defaultOptions.fontColor,
                fontFamily: this._defaultOptions.fontFamily,
                fontSize: this._defaultOptions.fontSize,
                fontWeight: 'normal',
                fontStyle: 'normal',
            });
        } else {
            const range = this._getSelectRange();
            if (range.start !== -1 && range.end !== -1) {
            } else {
                let whichContent = 0;
                let indexOfContent = 0;
                if (this._cursorInfo.characterIndex < 0) {
                    whichContent = 0;
                    indexOfContent = 0;
                } else {
                    const character =
                        this._textMetrics.allCharacter[this._cursorInfo.characterIndex];
                    whichContent = character.whichContent;
                    indexOfContent = character.indexOfContent;
                }
                const content = this._textData.contents[whichContent];
                this._textData.contents[whichContent] =
                    content.slice(0, indexOfContent + 1) + data + content.slice(indexOfContent + 1);
            }
        }
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
        this._insertToContentAtCursorPosition('\n');
        this._textMetrics = this.renderer.measure(this._textData);
        this.renderer.render();
        this._cursorInfo.characterIndex++;
        this._hideSelectRange();
        this._showCursor();
    }

    private _delete() {
        let updated = false;
        const selectRange = this._getSelectRange();
        if (selectRange.end !== -1 && selectRange.start !== -1) {
            updated = true;
            const startCharacter = this._textMetrics.allCharacter[selectRange.start];
            const endCharacter = this._textMetrics.allCharacter[selectRange.end];
            if (startCharacter.whichContent === endCharacter.whichContent) {
                const content = this._textData.contents[startCharacter.whichContent];
                this._textData.contents[startCharacter.whichContent] =
                    content.slice(0, startCharacter.indexOfContent) +
                    content.slice(endCharacter.indexOfContent + 1);
                if (this._textData.contents[startCharacter.whichContent].length === 0) {
                    this._textData.contents.splice(startCharacter.whichContent, 1);
                    this._textData.styles.splice(startCharacter.whichContent, 1);
                }
            } else {
                const startContent = this._textData.contents[startCharacter.whichContent];
                this._textData.contents[startCharacter.whichContent] = startContent.slice(
                    0,
                    startCharacter.indexOfContent
                );
                const endContent = this._textData.contents[endCharacter.whichContent];
                this._textData.contents[endCharacter.whichContent] = endContent.slice(
                    endCharacter.indexOfContent + 1
                );
                const sliceStart =
                    this._textData.contents[startCharacter.whichContent].length === 0
                        ? startCharacter.whichContent
                        : startCharacter.whichContent + 1;
                const sliceEnd =
                    this._textData.contents[endCharacter.whichContent].length === 0
                        ? endCharacter.whichContent + 1
                        : endCharacter.whichContent;
                this._textData.contents.splice(sliceStart, sliceEnd - sliceStart);
                this._textData.styles.splice(sliceStart, sliceEnd - sliceStart);
            }
            this._cursorInfo.characterIndex = selectRange.start - 1;
        } else if (
            (this._cursorInfo.characterIndex === 0 && this._cursorInfo.position === 'after') ||
            this._cursorInfo.characterIndex > 0
        ) {
            updated = true;
            const index =
                this._cursorInfo.position === 'after'
                    ? this._cursorInfo.characterIndex
                    : this._cursorInfo.characterIndex - 1;
            const targetCharacter = this._textMetrics.allCharacter[index];
            const content = this._textData.contents[targetCharacter.whichContent];
            this._textData.contents[targetCharacter.whichContent] =
                content.slice(0, targetCharacter.indexOfContent) +
                content.slice(targetCharacter.indexOfContent + 1);
            if (this._textData.contents[targetCharacter.whichContent].length === 0) {
                this._textData.contents.splice(targetCharacter.whichContent, 1);
                this._textData.styles.splice(targetCharacter.whichContent, 1);
            }
            this._cursorInfo.characterIndex--;
        }
        if (updated) {
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
