<template>
    <div class="app-container">
        <div class="input-container" ref="root"></div>

        <div class="input-group">
            <button @click="blurInput">Make Input Blur</button>
        </div>

        <div class="input-group">
            <label for="fontSize">Font Size (px): </label>
            <input
                v-model.number="fontSize"
                type="number"
                id="fontSize"
                name="fontSize"
                min="1"
                max="100"
            />
        </div>
        <div class="input-group">
            <label for="colorR">Font Color (R):</label>
            <input
                v-model.number="fontColorR"
                type="number"
                id="colorR"
                name="colorR"
                min="0"
                max="255"
            />
        </div>
        <div class="input-group">
            <label for="colorG">Font Color (G):</label>
            <input
                v-model.number="fontColorG"
                type="number"
                id="colorG"
                name="colorG"
                min="0"
                max="255"
            />
        </div>
        <div class="input-group">
            <label for="colorB">Font Color (B):</label>
            <input
                v-model.number="fontColorB"
                type="number"
                id="colorB"
                name="colorB"
                min="0"
                max="255"
            />
        </div>
        <div class="input-group">
            <label>Font Style: </label>
            <br />
            <button @click="applyStyle({ fontStyle: 'normal' })">normal</button>
            <button @click="applyStyle({ fontStyle: 'italic' })">italic</button>
        </div>
        <div class="input-group">
            <label>Font Weight: </label>
            <br />
            <button @click="applyStyle({ fontWeight: 'normal' })">normal</button>
            <button @click="applyStyle({ fontWeight: 'bold' })">bold</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { TMTextStyle } from '@text-magic/common';
import { getDefaultFont } from '@text-magic/renderer';
import { MagicInput } from 'text-magic-input';
import { onMounted, Ref, ref, watch } from 'vue';

const fontSize = ref(36);
watch(
    () => fontSize.value,
    () => {
        applyStyle({ fontSize: fontSize.value });
    }
);

const fontColorR = ref(0);
const fontColorG = ref(0);
const fontColorB = ref(0);
watch(
    () => [fontColorR.value, fontColorG.value, fontColorB.value],
    () => {
        applyStyle({ color: rgbToHex(fontColorR.value, fontColorG.value, fontColorB.value) });
    }
);

function preventDefault(e: Event) {
    e.preventDefault();
}
function disableScroll() {
    document.addEventListener('wheel', preventDefault, { passive: false });
}

function blurInput() {
    input.blur();
}

function rgbToHex(r: number, g: number, b: number): string {
    return (
        '#' +
        [r, g, b]
            .map((x) => {
                const hex = x.toString(16);
                return hex.length === 1 ? `0${hex}` : hex;
            })
            .join('')
    );
}

function applyStyle(style: Partial<TMTextStyle>) {
    input.applyStyle(style);
}

const root: Ref<HTMLDivElement | null> = ref(null);
const input = new MagicInput({
    width: 280,
    height: 200,
    fontColor: rgbToHex(fontColorR.value, fontColorG.value, fontColorB.value),
    fontSize: fontSize.value,
    fontFamily: 'Roboto',
});

onMounted(async () => {
    disableScroll();

    await input.init();

    const defaultFont = await getDefaultFont();
    input.registerFont(defaultFont);

    root.value!.appendChild(input.element);
    input.focus();

    root.value!.style.cursor = 'text';
});
</script>

<style scoped>
html,
body {
    margin: 0px;
    padding: 0;
    overflow: hidden;
    -webkit-user-select: none;
}

.app-container {
    position: absolute;
    width: 100vw;
    height: 100vh;
    margin: 0px;
    overflow: hidden;
    padding: 0;
    background-color: rgb(222, 222, 222);
}

.input-container {
    position: absolute;
    left: 220px;
    right: 220px;
    top: 16px;
    bottom: 16px;
    overflow: hidden;
    background-color: rgb(255, 255, 255);
}

.input-group {
    margin-top: 16px;
    margin-bottom: 10px;
    margin-left: 6px;
}
</style>
