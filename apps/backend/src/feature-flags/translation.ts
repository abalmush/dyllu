// Medusa's own built-in "translation" flag registers too late to affect
// defineConfig()'s module resolution (initializeContainer scans the project
// root's feature-flags/ dir before evaluating medusa-config.ts, but only
// registers @medusajs/medusa's bundled flags after) — mirroring the flag
// here makes MEDUSA_FF_TRANSLATION actually enable the module.
const TranslationFeatureFlag = {
  key: "translation",
  default_val: false,
  env_key: "MEDUSA_FF_TRANSLATION",
};

export default TranslationFeatureFlag;
