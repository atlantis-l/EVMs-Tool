/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Event {
  keyPath: string[];
}

interface BaseInfo {
  nonce?: number;
  chainId?: number;
  address?: string;
  privateKey?: string;
  balance?: string;
}