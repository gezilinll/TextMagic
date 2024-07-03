<template>
    <div class="app-container">
        <div class="input-container" ref="root">
            <label
                style="
                    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
                    font-size: 18px;
                    margin-top: 16px;
                "
                ref="loadingElement"
                >{{ loading }}</label
            >
        </div>

        <div class="input-group-left">
            <button @click="blurInput">Make Input Blur</button>
        </div>

        <div class="input-group-left">
            <label for="fontSize">Font Size (px): </label>
            <input
                v-model.number="fontSize"
                type="number"
                id="fontSize"
                name="fontSize"
                min="1"
                max="100"
                style="margin-left: 8px"
            />
        </div>
        <div class="input-group-left">
            <label for="colorR">Font Color (R):</label>
            <input
                v-model.number="fontColorR"
                type="number"
                id="colorR"
                name="colorR"
                min="0"
                max="255"
                style="margin-left: 8px"
            />
        </div>
        <div class="input-group-left">
            <label for="colorG">Font Color (G):</label>
            <input
                v-model.number="fontColorG"
                type="number"
                id="colorG"
                name="colorG"
                min="0"
                max="255"
                style="margin-left: 8px"
            />
        </div>
        <div class="input-group-left">
            <label for="colorB">Font Color (B):</label>
            <input
                v-model.number="fontColorB"
                type="number"
                id="colorB"
                name="colorB"
                min="0"
                max="255"
                style="margin-left: 8px"
            />
        </div>
        <div class="input-group-left">
            <label for="colorB">Letter Spacing:</label>
            <input
                v-model.number="letterSpacing"
                type="number"
                id="letterSpacing"
                name="letterSpacing"
                min="-20"
                max="20"
                style="margin-left: 8px"
            />
        </div>
        <div class="input-group-left">
            <label for="colorB">Line Height(%):</label>
            <input
                v-model.number="lineHeight"
                type="number"
                id="lineHeight"
                name="lineHeight"
                min="100"
                max="300"
                style="margin-left: 8px"
            />
        </div>
        <div class="input-group-left">
            <label for="colorB">Paragraph Spacing:</label>
            <input
                v-model.number="paragraphSpacing"
                type="number"
                id="lineHeight"
                name="lineHeight"
                min="0"
                max="50"
                style="margin-left: 8px"
            />
        </div>
        <div class="input-group-left">
            <label>Font Style: </label>
            <br />
            <button @click="applyStyle({ fontStyle: 'normal' })">normal</button>
            <button @click="applyStyle({ fontStyle: 'italic' })" style="margin-left: 8px">
                italic
            </button>
        </div>
        <div class="input-group-left">
            <label>Font Weight: </label>
            <br />
            <button @click="applyStyle({ fontWeight: 'normal' })">normal</button>
            <button @click="applyStyle({ fontWeight: 'bold' })" style="margin-left: 8px">
                bold
            </button>
        </div>
        <div class="input-group-left">
            <label>Text Decoration: </label>
            <br />
            <button @click="applyStyle({ decoration: undefined })">none</button>
            <br />
            <button
                @click="
                    applyStyle({
                        decoration: {
                            line: 'underline',
                            color: 'rgb(0, 0, 255)',
                            style: 'wavy',
                            thickness: 2,
                        },
                    })
                "
                style="margin-top: 2px"
            >
                underline-wavy
            </button>
            <br />
            <button
                @click="
                    applyStyle({
                        decoration: {
                            line: 'underline',
                            color: 'rgb(0, 0, 255)',
                            style: 'solid',
                            thickness: 2,
                        },
                    })
                "
            >
                underline-solid
            </button>
        </div>
        <div class="input-group-left">
            <label>Text Decoration: </label>
            <br />
            <button @click="applyStyle({ decoration: undefined })">none</button>
            <br />
            <button
                @click="
                    applyStyle({
                        decoration: {
                            line: 'line-through',
                            color: 'rgb(0, 0, 255)',
                            style: 'wavy',
                            thickness: 2,
                        },
                    })
                "
                style="margin-top: 2px"
            >
                line-through-wavy
            </button>
            <br />
            <button
                @click="
                    applyStyle({
                        decoration: {
                            line: 'line-through',
                            color: 'rgb(0, 0, 255)',
                            style: 'solid',
                            thickness: 2,
                        },
                    })
                "
                style="margin-top: 2px"
            >
                line-through-solid
            </button>
        </div>

        <div class="input-group-right" style="margin-top: 30px">
            <label>Text Align: </label>
            <br />
            <button @click="input.changeTextAlign('left')" style="width: 110px">left</button>
            <br />
            <button @click="input.changeTextAlign('center')" style="margin-top: 2px; width: 110px">
                center
            </button>
            <br />
            <button @click="input.changeTextAlign('right')" style="margin-top: 2px; width: 110px">
                right
            </button>
        </div>
        <div class="input-group-right" style="margin-top: 140px">
            <label>Text Stroke: </label>
            <br />
            <button @click="applyStyle({ stroke: undefined })">none</button>
            <button
                @click="applyStyle({ stroke: { type: 'center', width: 4, color: '#ff0000' } })"
                style="margin-left: 8px"
            >
                center
            </button>
        </div>
        <div class="input-group-right" style="margin-top: 200px">
            <label>Text Shadow: </label>
            <br />
            <button @click="applyStyle({ shadow: undefined })">none</button>
            <button
                @click="applyStyle({ shadow: { color: 'rgb(66, 255, 0)', blurRadius: 5 } })"
                style="margin-left: 5px"
            >
                enable
            </button>
        </div>
        <div class="input-group-right" style="margin-top: 260px">
            <label>Text Blur: </label>
            <br />
            <button @click="applyStyle({ blur: undefined })">none</button>
            <button @click="applyStyle({ blur: { radius: 5 } })" style="margin-left: 5px">
                enable
            </button>
        </div>
        <div class="input-group-right" style="margin-top: 320px">
            <label>Text Highlight: </label>
            <br />
            <button @click="applyStyle({ highlight: undefined })">none</button>
            <button
                @click="
                    applyStyle({
                        highlight: {
                            color: '#DAFF00',
                        },
                    })
                "
                style="margin-left: 5px"
            >
                enable
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { TMTextStyle } from '@text-magic/common';
import { DEFAULT_FONT_FAMILY, getDefaultFont } from '@text-magic/renderer';
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

const letterSpacing = ref(0);
watch(
    () => letterSpacing.value,
    () => {
        applyStyle({ letterSpacing: letterSpacing.value });
    }
);

const lineHeight = ref(100);
watch(
    () => lineHeight.value,
    () => {
        applyStyle({ lineHeight: lineHeight.value / 100.0 });
    }
);

const paragraphSpacing = ref(0);
watch(
    () => paragraphSpacing.value,
    () => {
        input.changeParagraphSpacing(paragraphSpacing.value);
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
    width: 300,
    height: 200,
    fontColor: rgbToHex(fontColorR.value, fontColorG.value, fontColorB.value),
    fontSize: fontSize.value,
    fontFamily: DEFAULT_FONT_FAMILY,
    textAlign: 'left',
    paragraphSpacing: 0,
});

const loadingElement: Ref<HTMLLabelElement | null> = ref(null);
const loading = ref('loading...');
let animationId = -1;
let progress = 0;
const updateLoading = () => {
    loading.value = 'Retrieving remote resources such as fonts' + '...' + progress.toFixed(2) + '%';
    progress = Math.min(99.9, progress + (progress <= 70 ? 0.1 : 0.01));
    animationId = requestAnimationFrame(() => {
        updateLoading();
    });
};
updateLoading();
onMounted(async () => {
    disableScroll();

    await input.init();
    const defaultFont = await getDefaultFont();
    input.registerFont(defaultFont);

    cancelAnimationFrame(animationId);
    root.value!.removeChild(loadingElement.value!);

    const bound = root.value!.getBoundingClientRect();
    input.changeSize(bound.width, bound.height);

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

.input-group-left {
    margin-top: 16px;
    margin-bottom: 10px;
    margin-left: 6px;
}

.input-group-right {
    position: absolute;
    top: 0px;
    right: 80px;
    margin-top: 16px;
    margin-bottom: 10px;
}
</style>
