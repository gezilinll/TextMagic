export interface TMTextMetrics {
    width: number;
    height: number;
    allCharacter: TMCharacterMetrics[];
}
export interface TMCharacterMetrics {
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fakeBold: boolean;
    fakeItalic: boolean;
    isNewLine: boolean;
}

export interface TMTextStyle {
    id: string;
    color: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: 'normal' | 'italic';
    fontWeight: 'normal' | 'bold';
}

export interface TMTextData {
    width: number;
    height: number;
    content: string;
    style: TMTextStyle;
}
