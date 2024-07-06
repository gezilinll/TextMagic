import { TMTextData, TMTextMetrics } from './text-data';

export interface TMFontInfo {
    data: ArrayBuffer;
    family: string;
}

export interface TMRenderer {
    init(): Promise<boolean>;

    setEmojiFont(font: TMFontInfo);

    registerFont(font: TMFontInfo);

    getRootContainer(): HTMLDivElement;

    getTextContainer(): HTMLDivElement;

    measure(data: TMTextData): TMTextMetrics;

    render(width: number, height: number);

    isUseDevicePixelRatio(): boolean;

    destroy();
}
