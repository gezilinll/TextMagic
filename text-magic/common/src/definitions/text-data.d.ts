export interface TMTextMetrics {
    width: number;
    height: number;
    allCharacter: TMCharacterMetrics[];
}
export interface TMCharacterMetrics {
    char: string;
    x: number;
    y: number;
    width: number;
    height: number;
    lineTop: number;
    lineHeight: number;
    whichContent: number;
    indexOfContent: number;
    style: TMTextStyle;
    isNewLine: boolean;
}

export interface TMTextStyle {
    color: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: 'normal' | 'italic';
    fontWeight: 'normal' | 'bold';
}

export interface TMTextData {
    width: number;
    height: number;
    contents: string[];
    styles: TMTextStyle[];
}
