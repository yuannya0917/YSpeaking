/// <reference types="vite/client" />
/// <reference path="./types/speech-recognition.d.ts" />

interface ImportMetaEnv {
    readonly VITE_QWEN_PROXY_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
