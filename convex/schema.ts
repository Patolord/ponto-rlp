import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Daily attendance record (one per employee per day)
  dailyAttendance: defineTable({
    date: v.string(), // "2026-01-14" format
    rhidEmployeeId: v.number(), // Employee ID from RHID
    employeeName: v.string(),
    worksiteId: v.optional(v.number()),
    worksiteName: v.optional(v.string()),
    firstCheckIn: v.optional(v.string()), // ISO datetime string
    lastCheckOut: v.optional(v.string()), // ISO datetime string
    status: v.string(), // "present" | "absent"
  })
    .index("by_date", ["date"])
    .index("by_employee", ["rhidEmployeeId"])
    .index("by_employee_and_date", ["rhidEmployeeId", "date"])
    .index("by_worksite_and_date", ["worksiteId", "date"]),

  // App settings (key-value store)
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
