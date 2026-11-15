import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored Claude skills and local screenshot tooling
    ".claude/**",
    ".agents/**",
    ".playwright-cli/**",
    ".shots/**",
  ]),
  // capsule-stays-on-device: Time capsule content never leaves the device, so
  // nothing that builds or shows outgoing data may import it.
  {
    files: ["src/lib/packet.ts", "src/components/PacketContent.tsx", "src/store/useAppStore.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/capsule", "**/capsule/**", "**/useCapsuleStore"],
              message: "Time capsule content never leaves the device: it cannot reach packets or consent.",
            },
            {
              group: ["**/assistant", "**/assistant/**", "**/useAssistantStore"],
              message: "Assistant conversations are never saved or sent: they cannot reach packets or consent.",
            },
            {
              group: ["**/mood", "**/mood/**", "**/useMoodStore"],
              message: "The mood check-in stays on this device: it cannot reach packets or consent.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
