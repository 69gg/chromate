import { z } from "zod/v4";

export const listTabsSchema = z.object({
  includeInternal: z.boolean().optional().default(false)
});

export const selectTabSchema = z.object({
  tabId: z.string().min(1),
  activate: z.boolean().optional().default(true)
});

export const screenshotSchema = z.object({
  overlay: z.enum(["grid", "none"]).optional().default("grid"),
  crosshair: z
    .object({
      x: z.number(),
      y: z.number()
    })
    .optional()
});

export const clickSchema = z.object({
  x: z.number(),
  y: z.number(),
  button: z.enum(["left", "right", "middle"]).optional().default("left"),
  clickCount: z.union([z.literal(1), z.literal(2)]).optional().default(1),
  wait: z.enum(["auto", "none"]).optional().default("auto"),
  returnScreenshot: z.boolean().optional().default(true)
});

export const scrollSchema = z.object({
  deltaX: z.number().optional().default(0),
  deltaY: z.number(),
  x: z.number().optional(),
  y: z.number().optional()
});

export const typeTextSchema = z.object({
  text: z.string()
});

export const pressKeySchema = z.object({
  key: z.string().min(1)
});

export const waitSchema = z.object({
  text: z.string().optional(),
  timeoutMs: z.number().int().positive().optional()
});

export const emptySchema = z.object({});
