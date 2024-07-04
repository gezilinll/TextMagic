import {
    TMCharacterMetrics,
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
            fontFamily: '',
            textAlign: 'left',
            paragraphSpacing: 0,
            width: 260,
            height: 200,
        };

        this._textData = {
            width: this._defaultOptions.width,
            height: this._defaultOptions.height,
            textAlign: this._defaultOptions.textAlign,
            paragraphSpacing: this._defaultOptions.paragraphSpacing,
            contents: [],
            styles: [],
        };

        this._selectRange = {
            start: { afterCharacterIndex: -1, cursorPosition: 'after-index' },
            end: { afterCharacterIndex: -1, cursorPosition: 'after-index' },
            color: '#0000FF',
            opacity: 0.2,
        };

        this._textArea = document.createElement('textarea');
        this._textArea.style.position = 'absolute';
        this._textArea.style.left = '0px';
        this._textArea.style.top = '0px';
        this._textArea.style.zIndex = '-9999';
        this._textArea.style.width = '0px';
        this._textArea.style.height = '0px';
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
                event.clientX < bound.left ||
                event.clientX > bound.right ||
                event.clientY < bound.top ||
                event.clientY >= bound.bottom
            ) {
                this._textArea.blur();
            }
        });

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
        this._rangeCanvas.style.top = '0px';

        this._textMetrics = { width: 0, height: 0, allCharacter: [], rows: [] };
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
        this._textArea.blur();
    }

    destroy() {
        this._media.removeEventListener('change', this._devicePixelRatioListener);
    }

    getCursorByCoordinate(mouseX: number, mouseY: number): TMCursorInfo {
        if (
            this._textMetrics.allCharacter.length === 0 ||
            (this._textMetrics.allCharacter.length === 1 &&
                this._textMetrics.allCharacter[0].char === '\n')
        ) {
            return {
                afterCharacterIndex: -1,
                cursorPosition: 'after-index',
            };
        }
        let result = -1;
        for (let i = 0; i < this._textMetrics.allCharacter.length; i++) {
            const bound = this._textMetrics.allCharacter[i];
            const row = this._textMetrics.rows[bound.whichRow];
            if (mouseY >= row.top && mouseY <= row.bottom) {
                if (this._textData.textAlign === 'left') {
                    if (
                        mouseX >
                        this._textMetrics.allCharacter[row.endIndex].x +
                            this._textMetrics.allCharacter[row.endIndex].width
                    ) {
                        result = row.endIndex;
                        break;
                    }
                } else if (this._textData.textAlign === 'right') {
                    if (mouseX < this._textMetrics.allCharacter[row.startIndex].x) {
                        return {
                            afterCharacterIndex: row.startIndex - 1,
                            cursorPosition: 'before-next-index',
                        };
                    }
                } else if (this._textData.textAlign === 'center') {
                    if (mouseX < this._textMetrics.allCharacter[row.startIndex].x) {
                        return {
                            afterCharacterIndex: row.startIndex - 1,
                            cursorPosition: 'before-next-index',
                        };
                    } else if (
                        mouseX >
                        this._textMetrics.allCharacter[row.endIndex].x +
                            this._textMetrics.allCharacter[row.endIndex].width
                    ) {
                        result = row.endIndex;
                        break;
                    }
                }
                if (mouseX >= bound.x && mouseX <= bound.x + bound.width) {
                    result = i;
                    break;
                }
            }
        }
        if (result === -1) {
            result = this._textMetrics.allCharacter.length - 1;
        }
        const targetBound = this._textMetrics.allCharacter[result];
        if (targetBound.char === '\n') {
            return {
                afterCharacterIndex: result - 1,
                cursorPosition: 'after-index',
            };
        } else {
            return {
                afterCharacterIndex:
                    mouseX < targetBound.x + targetBound.width / 2 ? result - 1 : result,
                cursorPosition: 'after-index',
            };
        }
    }

    private _handleMouseDown(e: MouseEvent) {
        this._isMouseDown = true;

        this._cursorInfo = this.getCursorByCoordinate(
            e.offsetX * this.devicePixelRatio,
            e.offsetY * this.devicePixelRatio
        );
        this.focus();
    }

    private _getCursorRenderInfo(): { x: number; y: number; height: number } {
        const getXBeforeZeroOrNewLine = (character?: TMCharacterMetrics) => {
            if (character) {
                return character.x;
            }
            if (this._textData.textAlign === 'left') {
                return 0;
            } else if (this._textData.textAlign === 'center') {
                return (this._textData.width * this.devicePixelRatio) / 2;
            } else {
                return this._textData.width * this.devicePixelRatio;
            }
        };

        if (
            this._textMetrics.allCharacter.length === 0 &&
            this._cursorInfo.afterCharacterIndex < 0
        ) {
            return {
                x: getXBeforeZeroOrNewLine(),
                y: 0,
                height: this._defaultOptions.fontSize * this.devicePixelRatio,
            };
        }
        if (this._cursorInfo.afterCharacterIndex < 0 && this._textMetrics.allCharacter.length > 0) {
            const nextCharacter = this._textMetrics.allCharacter[0];
            return {
                x: getXBeforeZeroOrNewLine(nextCharacter),
                y: 0,
                height: this._textMetrics.rows[nextCharacter.whichRow].contentHeight,
            };
        }

        if (this._cursorInfo.cursorPosition === 'after-index') {
            const character = this._textMetrics.allCharacter[this._cursorInfo.afterCharacterIndex];
            const row = this._textMetrics.rows[character.whichRow];
            return {
                x:
                    character.char === '\n'
                        ? getXBeforeZeroOrNewLine(
                              this._textMetrics.allCharacter[
                                  this._cursorInfo.afterCharacterIndex + 1
                              ]
                          )
                        : character.x + character.width,
                y:
                    character.char === '\n'
                        ? row.bottom + this._textData.paragraphSpacing
                        : row.contentTop,
                height:
                    character.char === '\n' &&
                    character.whichRow + 1 <= this._textMetrics.rows.length - 1
                        ? this._textMetrics.rows[character.whichRow + 1].contentHeight
                        : row.contentHeight,
            };
        } else {
            const nextCharacter =
                this._textMetrics.allCharacter[this._cursorInfo.afterCharacterIndex + 1];
            const row = this._textMetrics.rows[nextCharacter.whichRow];
            return {
                x: nextCharacter.x,
                y: row.contentTop,
                height: row.contentHeight,
            };
        }
    }

    private _showCursor() {
        clearTimeout(this._blinkTimer);
        const bound = this._getCursorRenderInfo();
        const offset =
            bound.x >= this._textData.width * this.devicePixelRatio
                ? Math.max(1, this._textData.width * this.devicePixelRatio - bound.x)
                : 0;
        this._cursor.style.left = `${bound.x / this.devicePixelRatio - offset}px`;
        this._cursor.style.top = `${bound.y / this.devicePixelRatio}px`;
        this._cursor.style.height = `${bound.height / this.devicePixelRatio}px`;
        this._cursor.style.opacity = '1';
        this._textArea.style.left = `${bound.x / this.devicePixelRatio - offset * 5}px`;
        this._textArea.style.top = `${(bound.y + bound.height / 2) / this.devicePixelRatio}px`;
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
        this._cursorInfo.afterCharacterIndex = -1;
    }

    private _getSelectRange() {
        if (
            this._selectRange.start.afterCharacterIndex ===
            this._selectRange.end.afterCharacterIndex
        ) {
            return { start: -1, end: -1 };
        }
        const actualStart =
            this._selectRange.start.afterCharacterIndex < this._selectRange.end.afterCharacterIndex
                ? this._selectRange.start
                : this._selectRange.end;
        const actualEnd =
            this._selectRange.start.afterCharacterIndex > this._selectRange.end.afterCharacterIndex
                ? this._selectRange.start
                : this._selectRange.end;
        return { start: actualStart.afterCharacterIndex + 1, end: actualEnd.afterCharacterIndex };
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
                    this._showSelectRange();
                },
                100,
                { leading: true }
            );
        }
        this._renderRange(e);
    }

    private _showSelectRange() {
        const targetRange = this._getSelectRange();
        if (targetRange.start !== -1 && targetRange.end !== -1) {
            this._hideCursor();
            this._rangeCanvas.width = this._textData.width * this.devicePixelRatio;
            this._rangeCanvas.height = this._textData.height * this.devicePixelRatio;
            this._rangeCanvas.style.width = `${this._textData.width}px`;
            this._rangeCanvas.style.height = `${this._textData.height}px`;
            const ctx = this._rangeCanvas.getContext('2d')!;
            ctx.clearRect(0, 0, this._rangeCanvas.width, this._rangeCanvas.height);
            for (let index = targetRange.start; index <= targetRange.end; index++) {
                const character = this._textMetrics.allCharacter[index];
                const row = this._textMetrics.rows[character.whichRow];
                ctx.save();
                ctx.beginPath();
                ctx.globalAlpha = this._selectRange!.opacity;
                ctx.fillStyle = this._selectRange!.color;
                ctx.fillRect(character.x, row.contentTop, character.width, row.contentHeight);
                ctx.restore();
            }
        }
    }

    private _hideSelectRange() {
        if (
            this._selectRange.start.afterCharacterIndex !== -1 ||
            this._selectRange.end.afterCharacterIndex !== -1
        ) {
            this._selectRange.start.afterCharacterIndex = -1;
            this._selectRange.end.afterCharacterIndex = -1;
            const ctx = this._rangeCanvas.getContext('2d')!;
            ctx.clearRect(0, 0, this._rangeCanvas.width, this._rangeCanvas.height);
        }
    }

    private _handleMouseUp() {
        this._isMouseDown = false;
    }

    private _refresh() {
        this._textMetrics = this.renderer.measure(this._textData);
        this.renderer.render(this._textData.width, this._textData.height);
        this._refreshInput();
    }

    private _refreshInput() {
        const range = this._getSelectRange();
        if (range.start !== -1 && range.end !== -1) {
            this._showSelectRange();
        } else if (this._isCursorShowing()) {
            this._showCursor();
        }
    }

    changeSize(width: number, height: number): void {
        this._textData.width = width;
        this._textData.height = height;
        this._refresh();
    }

    changeTextAlign(align: 'left' | 'right' | 'center'): void {
        this._textData.textAlign = align;
        this._refresh();
    }

    changeParagraphSpacing(spacing: number) {
        this._textData.paragraphSpacing = spacing;
        this._refresh();
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
            this._textMetrics = this.renderer.measure(this._textData);
            this.renderer.render(this._textData.width, this._textData.height);
            this._showSelectRange();
        } else {
            this._textData.styles.forEach((styleItem) => {
                Object.assign(styleItem, style);
            });
            this._textMetrics = this.renderer.measure(this._textData);
            this.renderer.render(this._textData.width, this._textData.height);
        }
    }

    private _handleDevicePixelRatioChanged() {
        if (this._renderer && this._renderer.isUseDevicePixelRatio()) {
            this._hideSelectRange();
            this._hideCursor();
            this._textMetrics = this.renderer.measure(this._textData);
            this.renderer.render(this._textData.width, this._textData.height);
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
            this.renderer.render(this._textData.width, this._textData.height);
            this._cursorInfo.afterCharacterIndex += data.length;
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
                this._delete();
                this._insertToContentAtCursorPosition(data);
            } else {
                let whichContent = 0;
                let indexOfContent = 0;
                if (this._cursorInfo.afterCharacterIndex < 0) {
                    const content = this._textData.contents[whichContent];
                    this._textData.contents[whichContent] = data + content.slice(0);
                } else {
                    const character =
                        this._textMetrics.allCharacter[this._cursorInfo.afterCharacterIndex];
                    whichContent = character.whichContent;
                    indexOfContent = character.indexOfContent;
                    const content = this._textData.contents[whichContent];
                    this._textData.contents[whichContent] =
                        content.slice(0, indexOfContent + 1) +
                        data +
                        content.slice(indexOfContent + 1);
                }
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
        } else if (
            e.code === 'ArrowUp' ||
            e.code === 'ArrowDown' ||
            e.code === 'ArrowLeft' ||
            e.code === 'ArrowRight'
        ) {
            this._arrow(e);
            e.preventDefault();
        } else if (e.code === 'KeyA' && e.metaKey) {
            this._selectAll();
            e.preventDefault();
        } else if (e.code === 'KeyC' && e.metaKey) {
            this._copy();
            e.preventDefault();
        } else if (e.code === 'KeyV' && e.metaKey) {
            this._paste();
            e.preventDefault();
        } else if (e.code === 'Tab') {
            e.preventDefault();
        }
    }

    private _newLine() {
        this._insertToContentAtCursorPosition('\n');
        this._textMetrics = this.renderer.measure(this._textData);
        this.renderer.render(this._textData.width, this._textData.height);
        this._cursorInfo.afterCharacterIndex++;
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
            this._cursorInfo.afterCharacterIndex = selectRange.start - 1;
        } else if (this._cursorInfo.afterCharacterIndex >= 0) {
            updated = true;
            const index = this._cursorInfo.afterCharacterIndex;
            const targetCharacter = this._textMetrics.allCharacter[index];
            const content = this._textData.contents[targetCharacter.whichContent];
            this._textData.contents[targetCharacter.whichContent] =
                content.slice(0, targetCharacter.indexOfContent) +
                content.slice(targetCharacter.indexOfContent + 1);
            if (this._textData.contents[targetCharacter.whichContent].length === 0) {
                this._textData.contents.splice(targetCharacter.whichContent, 1);
                this._textData.styles.splice(targetCharacter.whichContent, 1);
            }
            this._cursorInfo.afterCharacterIndex--;
        }
        if (updated) {
            this._textMetrics = this.renderer.measure(this._textData);
            this.renderer.render(this._textData.width, this._textData.height);
            this._hideSelectRange();
            this._showCursor();
        }
    }

    private _arrow(e: KeyboardEvent) {
        const selectRange = this._getSelectRange();
        const rangeIsValid = selectRange.start !== -1 && selectRange.end !== -1;
        if (e.code === 'ArrowUp') {
            if (rangeIsValid) {
                this._cursorInfo = {
                    afterCharacterIndex: selectRange.start - 1,
                    cursorPosition: 'after-index',
                };
                this._hideSelectRange();
            }
            const renderInfo = this._getCursorRenderInfo();
            if (renderInfo.y > 0) {
                this._cursorInfo = this.getCursorByCoordinate(renderInfo.x, renderInfo.y - 2);
            }
            this._showCursor();
        } else if (e.code === 'ArrowDown') {
            if (rangeIsValid) {
                this._cursorInfo = {
                    afterCharacterIndex: selectRange.end,
                    cursorPosition: 'after-index',
                };
                this._hideSelectRange();
            }
            const renderInfo = this._getCursorRenderInfo();
            this._cursorInfo = this.getCursorByCoordinate(
                renderInfo.x,
                renderInfo.y + renderInfo.height + 2
            );
            this._showCursor();
        } else if (e.code === 'ArrowRight') {
            if (rangeIsValid) {
                this._cursorInfo = {
                    afterCharacterIndex: selectRange.end - 1,
                    cursorPosition: 'after-index',
                };
                this._hideSelectRange();
            }
            if (this._textMetrics.allCharacter.length > this._cursorInfo.afterCharacterIndex + 1) {
                this._cursorInfo.afterCharacterIndex++;
                this._showCursor();
            }
        } else if (e.code === 'ArrowLeft') {
            if (rangeIsValid) {
                this._cursorInfo = {
                    afterCharacterIndex: selectRange.start,
                    cursorPosition: 'after-index',
                };
                this._hideSelectRange();
            }
            if (this._cursorInfo.afterCharacterIndex >= 0) {
                this._cursorInfo.afterCharacterIndex--;
                this._showCursor();
            }
        }
    }

    private _selectAll() {
        if (this._textMetrics.allCharacter.length > 0) {
            this._selectRange.start = { afterCharacterIndex: -1, cursorPosition: 'after-index' };
            this._selectRange.end = {
                afterCharacterIndex: this._textMetrics.allCharacter.length - 1,
                cursorPosition: 'after-index',
            };
            this._showSelectRange();
        }
    }

    private _copy() {}

    private _paste() {}

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
