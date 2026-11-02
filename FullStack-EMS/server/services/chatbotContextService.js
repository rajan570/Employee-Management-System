import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import LeaveApplication from "../models/LeaveApplication.js";
import Payslip from "../models/Payslip.js";

// ─── Employee Context Functions ─────────────────────────────────────────────

/**
 * Get basic employee profile by userId (from JWT)
 */
export async function getEmployeeProfile(userId) {
    return await Employee.findOne({ userId, isDeleted: false }).lean();
}

/**
 * Get attendance summary for the current month for a given employee
 */
export async function getEmployeeAttendanceSummary(employeeId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const records = await Attendance.find({
        employeeId,
        date: { $gte: startOfMonth, $lt: endOfMonth },
    })
        .sort({ date: -1 })
        .lean();

    const present = records.filter((r) => r.status === "PRESENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const totalDays = records.length;

    const monthName = now.toLocaleString("default", { month: "long" });

    return {
        month: `${monthName} ${now.getFullYear()}`,
        totalRecordedDays: totalDays,
        present,
        late,
        absent,
        recentRecords: records.slice(0, 5).map((r) => ({
            date: new Date(r.date).toLocaleDateString(),
            status: r.status,
            checkIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : "N/A",
            checkOut: r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : "N/A",
            workingHours: r.workingHours ?? "N/A",
            dayType: r.dayType ?? "N/A",
        })),
    };
}

/**
 * Get leave summary for the employee
 */
export async function getEmployeeLeaveSummary(employeeId) {
    const leaves = await LeaveApplication.find({ employeeId })
        .sort({ createdAt: -1 })
        .lean();

    const pending = leaves.filter((l) => l.status === "PENDING");
    const approved = leaves.filter((l) => l.status === "APPROVED");
    const rejected = leaves.filter((l) => l.status === "REJECTED");

    // Count approved days per type
    const approvedDaysByType = { SICK: 0, CASUAL: 0, ANNUAL: 0 };
    approved.forEach((l) => {
        const days =
            Math.ceil(
                (new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)
            ) + 1;
        approvedDaysByType[l.type] = (approvedDaysByType[l.type] || 0) + days;
    });

    const recent = leaves.slice(0, 5).map((l) => ({
        type: l.type,
        status: l.status,
        startDate: new Date(l.startDate).toLocaleDateString(),
        endDate: new Date(l.endDate).toLocaleDateString(),
        reason: l.reason,
    }));

    return {
        totalApplications: leaves.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        approvedDaysByType,
        recentApplications: recent,
    };
}

/**
 * Get the latest payslip for an employee
 */
export async function getEmployeeLatestPayslip(employeeId) {
    const payslip = await Payslip.findOne({ employeeId })
        .sort({ createdAt: -1 })
        .lean();

    if (!payslip) return null;

    const monthNames = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December",
    ];

    return {
        month: monthNames[payslip.month - 1] || payslip.month,
        year: payslip.year,
        basicSalary: payslip.basicSalary,
        allowances: payslip.allowances,
        deductions: payslip.deductions,
        netSalary: payslip.netSalary,
    };
}

// ─── Admin Context Functions ─────────────────────────────────────────────────

/**
 * Get organization-wide workforce summary (admin only)
 */
export async function getAdminWorkforceSummary() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const [
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        todayAttendance,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
    ] = await Promise.all([
        Employee.countDocuments({ isDeleted: false }),
        Employee.countDocuments({ isDeleted: false, employmentStatus: "ACTIVE" }),
        Employee.countDocuments({ isDeleted: false, employmentStatus: "INACTIVE" }),
        Attendance.countDocuments({ date: { $gte: startOfToday, $lt: endOfToday } }),
        LeaveApplication.countDocuments({ status: "PENDING" }),
        LeaveApplication.countDocuments({ status: "APPROVED" }),
        LeaveApplication.countDocuments({ status: "REJECTED" }),
    ]);

    return {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        todayAttendance,
        leaveRequests: { pending: pendingLeaves, approved: approvedLeaves, rejected: rejectedLeaves },
    };
}

// ─── Context Formatter ────────────────────────────────────────────────────────

/**
 * Build a text block from employee context data to inject into the AI prompt.
 * Sanitizes any undefined or sensitive fields.
 */
export function formatEmployeeContext(profile, attendance, leaves, payslip) {
    const lines = [];

    if (profile) {
        lines.push(`Employee: ${profile.firstName} ${profile.lastName}`);
        lines.push(`Position: ${profile.position}`);
        lines.push(`Department: ${profile.department || "N/A"}`);
        lines.push(`Employment Status: ${profile.employmentStatus}`);
        lines.push(`Join Date: ${new Date(profile.joinDate).toLocaleDateString()}`);
    }

    if (attendance) {
        lines.push(`\nAttendance (${attendance.month}):`);
        lines.push(`  Present: ${attendance.present} days`);
        lines.push(`  Late: ${attendance.late} days`);
        lines.push(`  Absent: ${attendance.absent} days`);
        lines.push(`  Total Recorded: ${attendance.totalRecordedDays} days`);
        if (attendance.recentRecords?.length) {
            lines.push(`  Recent Records:`);
            attendance.recentRecords.forEach((r) => {
                lines.push(`    - ${r.date}: ${r.status} | In: ${r.checkIn} | Out: ${r.checkOut} | Hours: ${r.workingHours} | ${r.dayType}`);
            });
        }
    }

    if (leaves) {
        lines.push(`\nLeave Summary:`);
        lines.push(`  Total Applications: ${leaves.totalApplications}`);
        lines.push(`  Pending: ${leaves.pending}`);
        lines.push(`  Approved: ${leaves.approved}`);
        lines.push(`  Rejected: ${leaves.rejected}`);
        if (leaves.recentApplications?.length) {
            lines.push(`  Recent Applications:`);
            leaves.recentApplications.forEach((l) => {
                lines.push(`    - [${l.status}] ${l.type}: ${l.startDate} to ${l.endDate} — ${l.reason}`);
            });
        }
    }

    if (payslip) {
        lines.push(`\nLatest Payslip (${payslip.month} ${payslip.year}):`);
        lines.push(`  Basic Salary: ₹${payslip.basicSalary}`);
        lines.push(`  Allowances: ₹${payslip.allowances}`);
        lines.push(`  Deductions: ₹${payslip.deductions}`);
        lines.push(`  Net Salary: ₹${payslip.netSalary}`);
    }

    return lines.join("\n");
}

/**
 * Build a text block from admin context data
 */
export function formatAdminContext(workforce) {
    if (!workforce) return "";
    return [
        `Organization Workforce Summary:`,
        `  Total Employees: ${workforce.totalEmployees}`,
        `  Active Employees: ${workforce.activeEmployees}`,
        `  Inactive Employees: ${workforce.inactiveEmployees}`,
        `  Today's Attendance (checked in): ${workforce.todayAttendance}`,
        `  Leave Requests — Pending: ${workforce.leaveRequests.pending}, Approved: ${workforce.leaveRequests.approved}, Rejected: ${workforce.leaveRequests.rejected}`,
    ].join("\n");
}

// ─── Intent Detector ──────────────────────────────────────────────────────────

/**
 * Lightweight keyword-based intent detector.
 * Returns what data we should fetch based on the message content.
 * This avoids unnecessary DB queries for general HR questions.
 */
export function detectIntent(message) {
    const msg = message.toLowerCase();

    const needs = {
        attendance: false,
        leaves: false,
        payslip: false,
        profile: false,
        adminWorkforce: false,
    };

    if (/attend|check.?in|check.?out|present|absent|late|clock|working hours?/i.test(msg)) {
        needs.attendance = true;
        needs.profile = true;
    }
    if (/leave|holiday|vacation|sick|casual|annual|remaining leaves?|days? off|absent/i.test(msg)) {
        needs.leaves = true;
        needs.profile = true;
    }
    if (/pay(slip|roll)?|salary|net pay|allowance|deduction|earn/i.test(msg)) {
        needs.payslip = true;
        needs.profile = true;
    }
    if (/my (name|profile|position|department|role|join|status)|who am i/i.test(msg)) {
        needs.profile = true;
    }
    // Admin-specific intents
    if (/how many employees?|total employees?|active employees?|workforce|head.?count/i.test(msg)) {
        needs.adminWorkforce = true;
    }
    if (/pending leaves?|leave requests?|leave status|approval/i.test(msg)) {
        needs.adminWorkforce = true;
    }
    if (/attendance summary|today.?s attendance|who came/i.test(msg)) {
        needs.adminWorkforce = true;
    }

    return needs;
}
