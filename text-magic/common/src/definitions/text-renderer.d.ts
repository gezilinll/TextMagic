import { TMTextData, TMTextMetrics } from './text-data';

export interface TMFontInfo {
    data: ArrayBuffer;
    family: string;
}

export interface TMRenderer {
    init(): Promise<boolean>;

    registerFont(font: TMFontInfo);

    getContainer(): HTMLDivElement;

    measure(data: TMTextData): TMTextMetrics;

    render(width: number, height: number);

    isUseDevicePixelRatio(): boolean;

    notifyDevicePixelRatioChanged();

    destroy();
}
