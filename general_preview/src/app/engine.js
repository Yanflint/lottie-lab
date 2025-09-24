
// src/app/engine.js
export function wantRlottie(){ return false; }
export function hasRlottieRuntime(){ return !!(window.RLottiePlayer || window.RLottie || window.createRlottieModule); }
export function pickEngine(){ return wantRlottie() && hasRlottieRuntime() ? 'rlottie' : 'lottie-web'; }
