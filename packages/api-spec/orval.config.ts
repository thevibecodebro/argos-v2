import path from "path";
import { defineConfig } from "orval";

const root = path.resolve(__dirname, "..", "..");
const apiClientSrc = path.resolve(root, "packages", "api-client", "src");
const apiZodSrc = path.resolve(root, "packages", "api-zod", "src");

export default defineConfig({
  client: {
    input: {
      target: "./openapi.json",
    },
    output: {
      workspace: apiClientSrc,
      target: "generated/api.ts",
      schemas: "generated/model",
      client: "fetch",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      prettier: false,
    },
  },
  zod: {
    input: {
      target: "./openapi.json",
    },
    output: {
      workspace: apiZodSrc,
      target: "generated/api",
      client: "zod",
      mode: "split",
      fileExtension: ".zod.ts",
      clean: true,
      prettier: false,
      override: {
        zod: {
          coerce: {
            param: ["boolean", "number", "string"],
            query: ["boolean", "number", "string"],
          },
        },
      },
    },
  },
});
