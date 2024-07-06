export function extractEmojisWithDetails(text: string) {
    const emojiRegex = /\p{Emoji}/gu;
    let match;
    const emojis: Map<number, boolean> = new Map();

    while ((match = emojiRegex.exec(text)) !== null) {
        const emoji = match[0];
        const emojiStart = match.index;
        const isSurrogatePair = emoji.length > 1;
        emojis.set(emojiStart, isSurrogatePair);
    }

    return emojis;
}

export function getSurrogatePairEmojiLength(text: string) {
    const emojiRegex = /\p{Emoji}/gu;
    let match;
    let result = 0;

    while ((match = emojiRegex.exec(text)) !== null) {
        const emoji = match[0];
        const isSurrogatePair = emoji.length > 1;
        if (isSurrogatePair) {
            result++;
        }
    }

    return result;
}
