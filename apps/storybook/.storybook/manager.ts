import { addons } from "storybook/manager-api";
import { create } from "storybook/theming/create";

addons.setConfig({
  theme: create({
    base: "dark",
    brandTitle: "◇ Sembol · passkey wallets for Stellar",
    brandUrl: "https://github.com/keyboord01/sembol",
    colorPrimary: "#f5b841",
    colorSecondary: "#c9931f",
    appBg: "#0a0d14",
    appContentBg: "#0e131d",
    appPreviewBg: "#ffffff",
    barBg: "#0a0d14",
    textColor: "#f4f2ec",
    textMutedColor: "#9aa3b7",
    barTextColor: "#9aa3b7",
    barSelectedColor: "#f5b841",
    barHoverColor: "#ffce63",
    appBorderColor: "#222b3c",
    appBorderRadius: 8,
    inputBg: "#10151f",
    inputBorder: "#222b3c",
    inputTextColor: "#f4f2ec",
    buttonBg: "#10151f",
    buttonBorder: "#222b3c",
    fontBase: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    fontCode: '"IBM Plex Mono", ui-monospace, monospace',
  }),
});
