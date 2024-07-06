import { TMFontInfo, TMInputOptions, TMTextStyle } from '@text-magic/common';
import { TMInput } from '@text-magic/input';
import { TMRenderer } from '@text-magic/renderer';

export class MagicInput {
    private _input: TMInput;
    private _renderer: TMRenderer;

    constructor(options?: TMInputOptions) {
        this._renderer = new TMRenderer();
        this._input = new TMInput(options);
    }

    async init(): Promise<boolean> {
        return await this._input.init(this._renderer);
    }

    setEmojiFont(font: TMFontInfo) {
        this._renderer.setEmojiFont(font);
    }

    registerFont(font: TMFontInfo) {
        return this._renderer.registerFont(font);
    }

    focus() {
        this._input.focus();
    }

    blur() {
        this._input.blur();
    }

    changeListStyle(style: 'disc' | 'decimal' | 'circle' | undefined) {
        this._input.changeListStyle(style);
    }

    changeSize(width: number, height: number): void {
        this._input.changeSize(width, height);
    }

    changeTextAlign(align: 'left' | 'right' | 'center') {
        this._input.changeTextAlign(align);
    }

    changeParagraphSpacing(spacing: number) {
        this._input.changeParagraphSpacing(spacing);
    }

    applyStyle(style: Partial<TMTextStyle>) {
        this._input.applyStyle(style);
    }

    get element() {
        return this._renderer.getContainer();
    }
}
