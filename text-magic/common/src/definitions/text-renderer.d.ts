import { TMTextData, TMTextMetrics } from './text-data';

export interface TMCharacterPosition {
    whichRow: number;
    indexOfRow: number;
    indexOfFullText: number;
}

export interface TMSelectRange {
    start: number;
    end: number;
    color: string;
    opacity: number;
}

export interface TMRenderer {
    getContainer(): HTMLDivElement;

    getPositionForCursor(mouseX: number, mouseY: number): TMCharacterPosition;

    measure(data: TMTextData): TMTextMetrics;

    render(selectRange?: TMSelectRange);
}
