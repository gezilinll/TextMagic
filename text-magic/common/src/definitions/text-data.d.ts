export interface TMTextMetrics {
    width: number;
    height: number;
    rows: TMRowMetrics[];
    allCharacter: TMCharacterMetrics[];
}
export interface TMRowMetrics {
    width: number;
    height: number;
    contentHeight: number;
    top: number;
    contentTop: number;
    bottom: number;
    contentBottom: number;
    startIndex: number;
    endIndex: number;
}
export interface TMCharacterMetrics {
    char: string;
    isEmoji: boolean;
    isSurrogatePair: boolean;
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
    letterSpacing?: number;
    lineHeight?: number;
    decoration?: TMTextDecorationStyle;
    stroke?: TMTextStrokeStyle;
    shadow?: TMTextShadowStyle;
    blur?: TMTextBlurStyle;
    highlight?: TMTextHighlightStyle;
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
export interface TMTextHighlightStyle {
    color: string;
    type: 'fill' | 'oval' | 'x';
}
export interface TMTextDecorationStyle {
    line: 'underline' | 'line-through';
    color: string;
    style: 'solid' | 'wavy';
    thickness: number;
}

export type EmojiListStyle = string;
export type ListStyle = 'disc' | 'decimal' | 'circle' | EmojiListStyle | undefined;

export interface TMTextData {
    width: number;
    height: number;
    textAlign: 'left' | 'right' | 'center';
    paragraphSpacing: number;
    listStyle?: ListStyle;
    contents: string[];
    styles: TMTextStyle[];
}
