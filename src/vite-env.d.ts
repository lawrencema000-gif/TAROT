/// <reference types="vite/client" />

// The two halves of a split locale `app` bundle (routeNamespacePlugin in
// vite.config.ts): `?boot` is what every locale boots with, `?route=quizzes`
// the strings only the quiz route reads. Under Vitest (no plugin) both
// resolve to the whole file.
declare module '*.json?boot' {
  const value: Record<string, unknown>;
  export default value;
}
declare module '*.json?route=quizzes' {
  const value: Record<string, unknown>;
  export default value;
}
