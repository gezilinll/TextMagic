export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TMTextRow {
    y: number;
    width: number;
    height: number;
    originHeight: number;
    maxDescent: number;
    fragments: (TMTextFragment & { font: string; bound: Rect })[];
}

export interface TMTextFragment {
    content: string;
    color: string;
    fontSize: number;
    fontStyle: string;
}

export interface TMTextData {
    width: number;
    height: number;
    fragments: TMTextFragment[];
}

export interface TMTextMetrics {
    width: number;
    height: number;
    rows: TMTextRow[];
    characterBounds: Rect[];
}
