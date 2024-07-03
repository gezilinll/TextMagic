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

    registerFont(font: TMFontInfo) {
        return this._renderer.registerFont(font);
    }

    focus() {
        this._input.focus();
    }

    blur() {
        this._input.blur();
    }

    changeTextAlign(align: 'left' | 'right' | 'center') {
        this._input.changeTextAlign(align);
    }

    applyStyle(style: Partial<TMTextStyle>) {
        this._input.applyStyle(style);
    }

    get element() {
        return this._renderer.getContainer();
    }
}
