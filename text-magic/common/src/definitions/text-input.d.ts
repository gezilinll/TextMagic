import { TMRenderer } from './text-renderer';

export interface TMInputOptions {
    width: number;
    height: number;
    fontSize: number;
    fontColor: string;
    fontFamily: string;
    autoBlur: boolean;
}

export interface TMSelectRange {
    start: TMCursorInfo;
    end: TMCursorInfo;
    color: string;
    opacity: number;
}

export interface TMTextStyle {
    fontSize: number;
    fontColor: string;
    fontFamily: string;
    fontStyle: string;
}

export interface TMCursorInfo {
    characterIndex: number;
    position: 'after';
}

export interface TMInput {
    init(renderer: TMRenderer): Promise<boolean>;

    getCursorByCoordinate(mouseX: number, mouseY: number): TMCursorInfo;

    applyStyle(style: Partial<TMTextStyle>);

    destroy();
}
