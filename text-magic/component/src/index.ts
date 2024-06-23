import { TMInput } from '@text-magic/input';
import { TMRenderer } from '@text-magic/renderer';

export class MagicInput {
    private _input: TMInput;
    private _renderer: TMRenderer;

    constructor() {
        this._renderer = new TMRenderer();
        this._input = new TMInput();
        this._input.bindRenderer(this._renderer);
    }

    focus() {
        this._input.focus();
    }

    blur() {
        this._input.blur();
    }

    get element() {
        return this._renderer.getContainer();
    }
}
