import { TMTextData, TMTextMetrics } from './text-data';

export interface TMSelectRange {
    start: number;
    end: number;
    color: string;
    opacity: number;
}

export interface TMRenderer {
    getContainer(): HTMLDivElement;

    getPositionForCursor(mouseX: number, mouseY: number): number;

    measure(data: TMTextData): TMTextMetrics;

    render(selectRange?: TMSelectRange);

    isUseDevicePixelRatio(): boolean;

    notifyDevicePixelRatioChanged();
}
