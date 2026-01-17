import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Default settings values
const DEFAULTS: Record<string, string> = {
  dailyCost: "150", // R$150 per day default
  currency: "BRL",
};

// Get a setting by key
export const get = query({
  args: {
    key: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (setting) {
      return setting.value;
    }

    // Return default if no custom value set
    return DEFAULTS[args.key] ?? null;
  },
});

// Get all settings
export const getAll = query({
  args: {},
  returns: v.array(
    v.object({
      key: v.string(),
      value: v.string(),
    })
  ),
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").collect();

    // Merge with defaults
    const result: { key: string; value: string }[] = [];
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    // Add all defaults first
    for (const [key, value] of Object.entries(DEFAULTS)) {
      result.push({
        key,
        value: settingsMap.get(key) ?? value,
      });
    }

    // Add any custom settings not in defaults
    for (const setting of settings) {
      if (!(setting.key in DEFAULTS)) {
        result.push({
          key: setting.key,
          value: setting.value,
        });
      }
    }

    return result;
  },
});

// Set a setting
export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
      });
    }

    return null;
  },
});

// Delete a setting (resets to default)
export const remove = mutation({
  args: {
    key: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});

// Get the daily cost setting as a number
export const getDailyCost = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "dailyCost"))
      .unique();

    const value = setting?.value ?? DEFAULTS.dailyCost;
    return parseFloat(value) || 150;
  },
});
