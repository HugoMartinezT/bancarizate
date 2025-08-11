/// <reference types="vite/client" />

// Declaración para archivos TypeScript normales
declare module "*.ts" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Soporte para importación de alias
declare module "@/types/types" {
  export * from "./types/types";
}