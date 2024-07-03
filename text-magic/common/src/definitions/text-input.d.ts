import { TMTextStyle } from './text-data';
import { TMRenderer } from './text-renderer';

export interface TMInputOptions {
    width: number;
    height: number;
    fontSize: number;
    fontColor: string;
    fontFamily: string;
    textAlign: 'left' | 'right' | 'center';
    paragraphSpacing: number;
}

export interface TMSelectRange {
    start: TMCursorInfo;
    end: TMCursorInfo;
    color: string;
    opacity: number;
}

export interface TMCursorInfo {
    afterCharacterIndex: number;
    cursorPosition: 'after-index' | 'before-next-index';
}

export interface TMInput {
    init(renderer: TMRenderer): Promise<boolean>;

    getCursorByCoordinate(mouseX: number, mouseY: number): TMCursorInfo;

    changeSize(width: number, height: number): void;

    changeTextAlign(align: 'left' | 'right' | 'center'): void;

    changeParagraphSpacing(spacing: number): void;

    applyStyle(style: Partial<TMTextStyle>): void;

    destroy(): void;
}
