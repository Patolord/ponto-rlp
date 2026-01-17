import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Type for attendance data coming from the frontend
export type AttendanceInput = {
  date: string;
  rhidEmployeeId: number;
  employeeName: string;
  worksiteId?: number;
  worksiteName?: string;
  firstCheckIn?: string;
  lastCheckOut?: string;
  status: "present" | "absent";
};

// Sync daily attendance records from RHID data
export const syncDailyAttendance = mutation({
  args: {
    records: v.array(
      v.object({
        date: v.string(),
        rhidEmployeeId: v.number(),
        employeeName: v.string(),
        worksiteId: v.optional(v.number()),
        worksiteName: v.optional(v.string()),
        firstCheckIn: v.optional(v.string()),
        lastCheckOut: v.optional(v.string()),
        status: v.string(),
      })
    ),
  },
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const record of args.records) {
      // Check if record already exists for this employee on this date
      const existing = await ctx.db
        .query("dailyAttendance")
        .withIndex("by_employee_and_date", (q) =>
          q.eq("rhidEmployeeId", record.rhidEmployeeId).eq("date", record.date)
        )
        .unique();

      if (existing) {
        // Update existing record
        await ctx.db.patch(existing._id, {
          employeeName: record.employeeName,
          worksiteId: record.worksiteId,
          worksiteName: record.worksiteName,
          firstCheckIn: record.firstCheckIn,
          lastCheckOut: record.lastCheckOut,
          status: record.status,
        });
        updated++;
      } else {
        // Insert new record
        await ctx.db.insert("dailyAttendance", {
          date: record.date,
          rhidEmployeeId: record.rhidEmployeeId,
          employeeName: record.employeeName,
          worksiteId: record.worksiteId,
          worksiteName: record.worksiteName,
          firstCheckIn: record.firstCheckIn,
          lastCheckOut: record.lastCheckOut,
          status: record.status,
        });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// Get attendance records for a date range
export const getAttendanceByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("dailyAttendance"),
      _creationTime: v.number(),
      date: v.string(),
      rhidEmployeeId: v.number(),
      employeeName: v.string(),
      worksiteId: v.optional(v.number()),
      worksiteName: v.optional(v.string()),
      firstCheckIn: v.optional(v.string()),
      lastCheckOut: v.optional(v.string()),
      status: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all records and filter by date range
    const records = await ctx.db
      .query("dailyAttendance")
      .withIndex("by_date")
      .collect();

    return records.filter(
      (r) => r.date >= args.startDate && r.date <= args.endDate
    );
  },
});

// Get man-days by employee (aggregate days worked per employee per worksite)
export const getManDaysByEmployee = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    employeeId: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      rhidEmployeeId: v.number(),
      employeeName: v.string(),
      totalDays: v.number(),
      worksiteBreakdown: v.array(
        v.object({
          worksiteId: v.optional(v.number()),
          worksiteName: v.optional(v.string()),
          days: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    let records = await ctx.db
      .query("dailyAttendance")
      .withIndex("by_date")
      .collect();

    // Filter by date range and status
    records = records.filter(
      (r) =>
        r.date >= args.startDate &&
        r.date <= args.endDate &&
        r.status === "present"
    );

    // Filter by employee if specified
    if (args.employeeId !== undefined) {
      records = records.filter((r) => r.rhidEmployeeId === args.employeeId);
    }

    // Aggregate by employee
    const employeeMap = new Map<
      number,
      {
        employeeName: string;
        totalDays: number;
        worksites: Map<number | undefined, { name?: string; days: number }>;
      }
    >();

    for (const record of records) {
      if (!employeeMap.has(record.rhidEmployeeId)) {
        employeeMap.set(record.rhidEmployeeId, {
          employeeName: record.employeeName,
          totalDays: 0,
          worksites: new Map(),
        });
      }

      const emp = employeeMap.get(record.rhidEmployeeId)!;
      emp.totalDays++;

      const wsKey = record.worksiteId;
      if (!emp.worksites.has(wsKey)) {
        emp.worksites.set(wsKey, { name: record.worksiteName, days: 0 });
      }
      emp.worksites.get(wsKey)!.days++;
    }

    return Array.from(employeeMap.entries()).map(([id, data]) => ({
      rhidEmployeeId: id,
      employeeName: data.employeeName,
      totalDays: data.totalDays,
      worksiteBreakdown: Array.from(data.worksites.entries()).map(
        ([wsId, wsData]) => ({
          worksiteId: wsId,
          worksiteName: wsData.name,
          days: wsData.days,
        })
      ),
    }));
  },
});

// Get man-days by worksite (aggregate days worked per worksite)
export const getManDaysByWorksite = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    worksiteId: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      worksiteId: v.optional(v.number()),
      worksiteName: v.optional(v.string()),
      totalManDays: v.number(),
      uniqueEmployees: v.number(),
      employeeBreakdown: v.array(
        v.object({
          rhidEmployeeId: v.number(),
          employeeName: v.string(),
          days: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    let records = await ctx.db
      .query("dailyAttendance")
      .withIndex("by_date")
      .collect();

    // Filter by date range and status
    records = records.filter(
      (r) =>
        r.date >= args.startDate &&
        r.date <= args.endDate &&
        r.status === "present" &&
        r.worksiteId !== undefined
    );

    // Filter by worksite if specified
    if (args.worksiteId !== undefined) {
      records = records.filter((r) => r.worksiteId === args.worksiteId);
    }

    // Aggregate by worksite
    const worksiteMap = new Map<
      number,
      {
        worksiteName?: string;
        employees: Map<number, { name: string; days: number }>;
      }
    >();

    for (const record of records) {
      if (record.worksiteId === undefined) continue;

      if (!worksiteMap.has(record.worksiteId)) {
        worksiteMap.set(record.worksiteId, {
          worksiteName: record.worksiteName,
          employees: new Map(),
        });
      }

      const ws = worksiteMap.get(record.worksiteId)!;
      if (!ws.employees.has(record.rhidEmployeeId)) {
        ws.employees.set(record.rhidEmployeeId, {
          name: record.employeeName,
          days: 0,
        });
      }
      ws.employees.get(record.rhidEmployeeId)!.days++;
    }

    return Array.from(worksiteMap.entries()).map(([id, data]) => {
      const employeeBreakdown = Array.from(data.employees.entries()).map(
        ([empId, empData]) => ({
          rhidEmployeeId: empId,
          employeeName: empData.name,
          days: empData.days,
        })
      );

      return {
        worksiteId: id,
        worksiteName: data.worksiteName,
        totalManDays: employeeBreakdown.reduce((sum, e) => sum + e.days, 0),
        uniqueEmployees: employeeBreakdown.length,
        employeeBreakdown,
      };
    });
  },
});

// Get unique dates that have attendance records
export const getRecordedDates = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const records = await ctx.db.query("dailyAttendance").collect();
    const dates = new Set(records.map((r) => r.date));
    return Array.from(dates).sort().reverse();
  },
});
