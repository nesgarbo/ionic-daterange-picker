import { defineConfig } from 'vitest/config';

// Only the pure date/selection logic is unit tested here; the components are exercised in the
// consuming app. Keeping the tests DOM-free means no Angular TestBed and no jsdom dependency.
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node'
    }
});
