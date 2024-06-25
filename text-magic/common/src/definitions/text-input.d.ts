import { TMRenderer } from './text-renderer';

export interface TMInputOptions {
    width: number;
    height: number;
    fontSize: number;
    fontColor: string;
    fontFamily: string;
}

export interface TMInput {
    bindRenderer(renderer: TMRenderer);
}
