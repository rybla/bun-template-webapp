import z from "zod";

export type MarkdownText = z.infer<typeof MarkdownText>;
export const MarkdownText = z.string().brand("MarkdownText");
