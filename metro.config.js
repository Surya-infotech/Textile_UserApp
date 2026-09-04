const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** Metro sometimes fails to resolve `./utils/resolveSources` → `resolveSources.tsx` inside expo-image (main = src/index.ts). */
const expoImageResolveSources = path.join(
    path.dirname(require.resolve('expo-image/package.json')),
    'src/utils/resolveSources.tsx'
);

const config = getDefaultConfig(__dirname);

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    const origin = (context.originModulePath || '').replace(/\\/g, '/');
    const targetsResolveSources =
        moduleName === './utils/resolveSources' ||
        moduleName.endsWith('/utils/resolveSources');

    if (targetsResolveSources && origin.includes('/expo-image/')) {
        return { type: 'sourceFile', filePath: expoImageResolveSources };
    }

    if (typeof upstreamResolveRequest === 'function') {
        return upstreamResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;