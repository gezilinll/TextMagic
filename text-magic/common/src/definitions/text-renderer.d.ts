import { TMTextData, TMTextMetrics } from './text-data';

export interface TMFontInfo {
    data: ArrayBuffer;
    family: string;
}

export interface TMRenderer {
    init(): Promise<boolean>;

    registerFont(font: TMFontInfo);

    getContainer(): HTMLDivElement;

    getPositionForCursor(mouseX: number, mouseY: number): number;

    measure(data: TMTextData): TMTextMetrics;

    render();

    isUseDevicePixelRatio(): boolean;

    notifyDevicePixelRatioChanged();
}
