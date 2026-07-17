declare module 'mammoth/mammoth.browser.js' {
  export type MammothResult = { value: string; messages: Array<{ type: string; message: string }> };
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
}
