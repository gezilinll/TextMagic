<template>
    <div class="app-container" ref="root"></div>
</template>

<script setup lang="ts">
import { MagicInput } from 'text-magic-input';
import { onMounted, Ref, ref } from 'vue';

const root: Ref<HTMLDivElement | null> = ref(null);

onMounted(() => {
    const input = new MagicInput();
    root.value!.appendChild(input.element);
    input.focus();
});
</script>

<style scoped>
.app-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    margin: 0px;
    overflow: hidden;
    background-color: rgb(222, 222, 222);
}
</style>
