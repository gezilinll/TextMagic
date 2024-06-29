export interface TMTextMetrics {
    width: number;
    height: number;
    allCharacter: TMCharacterMetrics[];
}
export interface TMCharacterMetrics {
    x: number;
    y: number;
    width: number;
    height: number;
    isNewLine: boolean;
}

export interface TMTextStyle {
    id: string;
    color: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
}

export interface TMTextData {
    width: number;
    height: number;
    content: string;
    style: TMTextStyle;
}
