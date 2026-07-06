import { useEffect } from "react";
import type { Decorator, Preview } from "@storybook/react-vite";
import { PasskeyWalletProvider } from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";
import "./preview.css";
import { TESTNET_CONFIG } from "./testnet";

function ThemeSync({ theme }: { theme: string }) {
  // DOM mutation belongs in an effect, not the render phase.
  useEffect(() => {
    document.documentElement.setAttribute("data-sembol-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  return null;
}

const withProviderAndTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme as string) ?? "light";
  return (
    <PasskeyWalletProvider config={TESTNET_CONFIG}>
      <ThemeSync theme={theme} />
      <div className="sembol-story-canvas" data-sembol-theme={theme}>
        <Story />
      </div>
    </PasskeyWalletProvider>
  );
};

const preview: Preview = {
  decorators: [withProviderAndTheme],
  globalTypes: {
    theme: {
      description: "Sembol theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  parameters: {
    layout: "centered",
    controls: { expanded: true },
    docs: {
      toc: true,
    },
    options: {
      storySort: {
        order: [
          "Introduction",
          "Getting Started",
          "Components",
          "Hooks",
          "Live Playground",
          "Browser Compatibility",
          "Theming",
        ],
      },
    },
  },
};

export default preview;
