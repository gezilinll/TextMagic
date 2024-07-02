export interface TMTextMetrics {
    width: number;
    height: number;
    rows: TMRowMetrics[];
    allCharacter: TMCharacterMetrics[];
}
export interface TMRowMetrics {
    width: number;
    height: number;
    top: number;
    bottom: number;
}
export interface TMCharacterMetrics {
    char: string;
    x: number;
    y: number;
    width: number;
    height: number;
    whichRow: number;
    whichContent: number;
    indexOfContent: number;
    style: TMTextStyle;
}

export interface TMTextStyle {
    color: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: 'normal' | 'italic';
    fontWeight: 'normal' | 'bold';
    stroke?: TMTextStrokeStyle;
    shadow?: TMTextShadowStyle;
    blur?: TMTextBlurStyle;
}
export interface TMTextStrokeStyle {
    color: string;
    width: number;
    type: 'inner' | 'outer' | 'center';
}
export interface TMTextShadowStyle {
    color: string;
    blurRadius: number;
}
export interface TMTextBlurStyle {
    radius: number;
}

export interface TMTextData {
    width: number;
    height: number;
    contents: string[];
    styles: TMTextStyle[];
}
