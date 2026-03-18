import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const sendInvite = action({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, { employeeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const employee = await ctx.runQuery(api.employees.getEmployee, { id: employeeId });
    if (!employee) throw new Error("Employee not found");
    if (!employee.email) throw new Error("Employee has no email");
    if (employee.inviteStatus === "accepted") throw new Error("Employee already has an account");

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY not configured");

    const response = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: employee.email,
        redirect_url: process.env.SITE_URL ? `${process.env.SITE_URL}/sign-in` : undefined,
        notify: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send invite: ${error.errors?.[0]?.message || response.statusText}`);
    }

    await ctx.runMutation(api.employees.updateEmployee, {
      id: employeeId,
      inviteStatus: "pending",
    });

    return { success: true };
  },
});

export const deactivateWithClerk = action({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, { employeeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const employee = await ctx.runQuery(api.employees.getEmployee, { id: employeeId });
    if (!employee) throw new Error("Employee not found");

    await ctx.runMutation(api.employees.deactivateEmployee, { id: employeeId });

    if (employee.clerkUserId) {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (clerkSecretKey) {
        await fetch(`https://api.clerk.com/v1/users/${employee.clerkUserId}/ban`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${clerkSecretKey}`,
          },
        });
      }
    }

    return { success: true };
  },
});
