import { TMRenderer } from './text-renderer';

export interface TMInputOptions {
    width: number;
    height: number;
    fontSize: number;
    fontColor: string;
    fontFamily: string;
    controlFocusBlur: boolean;
}

export interface TMTextStyle {
    fontSize: number;
    fontColor: string;
    fontFamily: string;
    fontStyle: string;
}

export interface TMInput {
    init(renderer: TMRenderer): Promise<boolean>;

    applyStyle(style: Partial<TMTextStyle>);

    destroy();
}
