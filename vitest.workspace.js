import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
    './text-magic/common/vite.config.mts',
    './text-magic/vite.config.mts',
    './text-magic/input/vite.config.mts',
]);
