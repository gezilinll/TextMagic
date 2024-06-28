export interface TMCharacterMetrics {
    x: number;
    y: number;
    width: number;
    height: number;
    fragmentId: string;
    indexOfFragment: number;
}

export interface TMTextMetrics {
    width: number;
    height: number;
    rows: TMTextRow[];
    characterMetrics: TMCharacterMetrics[];
}
export interface TMTextRow {
    y: number;
    width: number;
    height: number;
    characterMetrics: TMCharacterMetrics[];
}

export interface TMTextFragment {
    id: string;
    content: string;
    color: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
}

export interface TMTextData {
    width: number;
    height: number;
    fragments: TMTextFragment[];
}
