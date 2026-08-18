'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import * as XLSX from '@e965/xlsx';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { logAction } from '@/lib/audit-log';

const VALID_ROLES = ['EMPLOYEE', 'SUPERVISOR', 'HR', 'SUPER_ADMIN'] as const;
type ImportRole = (typeof VALID_ROLES)[number];

export type ImportSummary = {
  createdCount: number;
  updatedCount: number;
  errors: { row: number; employeeNo: string; message: string }[];
};

const EMPTY_SUMMARY: ImportSummary = { createdCount: 0, updatedCount: 0, errors: [] };

function normalizeRole(input: string): ImportRole | null {
  const key = input.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (VALID_ROLES as readonly string[]).includes(key) ? (key as ImportRole) : null;
}

// Sheet headers arrive as literal cell text — match case/spacing-insensitively
// rather than requiring an exact header string.
function getCell(row: Record<string, unknown>, ...aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const match = keys.find((k) => k.trim().toLowerCase() === alias.toLowerCase());
    if (match) return String(row[match] ?? '').trim();
  }
  return '';
}

type ImportCandidate = {
  rowNum: number;
  employeeNo: string;
  name: string;
  role: ImportRole;
  orgRole: string | null;
  email: string;
  managerEmployeeNo: string | null;
};

// One-time roster import to bootstrap this project's own employee
// directory (deliberately not synced with the GlowUp LMS). Imported users
// get no password — they sign in exclusively via Entra ID SSO, matched by
// email on first login. Manager Employee No is resolved against a combined
// existing+new-in-this-sheet id map so row order in the sheet never
// matters, but is *written* in a second DB pass (after every row exists)
// since a manager row can't be referenced by foreign key before it exists.
export async function importEmployeesFromExcel(_prevState: ImportSummary, formData: FormData): Promise<ImportSummary> {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller.role)) {
    return { ...EMPTY_SUMMARY, errors: [{ row: 0, employeeNo: '', message: 'Not authorized.' }] };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ...EMPTY_SUMMARY, errors: [{ row: 0, employeeNo: '', message: 'No file selected.' }] };
  }

  let rows: Record<string, unknown>[];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } catch (err) {
    console.error('importEmployeesFromExcel: failed to parse file', err);
    return { ...EMPTY_SUMMARY, errors: [{ row: 0, employeeNo: '', message: 'Could not read this file as an Excel spreadsheet (.xlsx).' }] };
  }

  const errors: ImportSummary['errors'] = [];
  const candidates: ImportCandidate[] = [];
  const seenInSheet = new Set<string>();

  rows.forEach((row, i) => {
    const rowNum = i + 2; // header is row 1
    const employeeNo = getCell(row, 'Employee No', 'Employee Number');
    const name = getCell(row, 'Name');
    const roleRaw = getCell(row, 'Role');
    const orgRole = getCell(row, 'Org Role', 'Organisational Role', 'Grade') || null;
    const email = getCell(row, 'Email').toLowerCase();
    const managerEmployeeNo = getCell(row, 'Manager Employee No', 'Manager Employee Number') || null;

    if (!employeeNo || !name || !roleRaw || !email) {
      errors.push({ row: rowNum, employeeNo, message: 'Missing required field (Employee No, Name, Role, or Email).' });
      return;
    }
    if (seenInSheet.has(employeeNo)) {
      errors.push({ row: rowNum, employeeNo, message: `Duplicate Employee No "${employeeNo}" elsewhere in this sheet.` });
      return;
    }
    const role = normalizeRole(roleRaw);
    if (!role) {
      errors.push({ row: rowNum, employeeNo, message: `Unrecognized Role "${roleRaw}" — expected Employee, Supervisor, HR, or Super Admin.` });
      return;
    }
    if (managerEmployeeNo === employeeNo) {
      errors.push({ row: rowNum, employeeNo, message: "Manager Employee No cannot be the same as this row's own Employee No." });
      return;
    }

    seenInSheet.add(employeeNo);
    candidates.push({ rowNum, employeeNo, name, role, orgRole, email, managerEmployeeNo });
  });

  if (candidates.length === 0) return { ...EMPTY_SUMMARY, errors };

  const existing = await prisma.user.findMany({ select: { id: true, employeeNo: true } });
  const existingIds = new Set(existing.map((u) => u.id));
  const idByEmployeeNo = new Map<string, string>();
  for (const u of existing) idByEmployeeNo.set(u.employeeNo, u.id);
  for (const c of candidates) if (!idByEmployeeNo.has(c.employeeNo)) idByEmployeeNo.set(c.employeeNo, randomUUID());

  let createdCount = 0;
  let updatedCount = 0;
  const failed = new Set<string>();

  // Pass 1: write every row's own fields (no managerId yet — the
  // referenced manager row may not exist until this pass finishes).
  for (const c of candidates) {
    const id = idByEmployeeNo.get(c.employeeNo)!;
    const wasExisting = existingIds.has(id);
    try {
      await prisma.user.upsert({
        where: { employeeNo: c.employeeNo },
        update: { name: c.name, role: c.role, orgRole: c.orgRole, email: c.email },
        create: { id, employeeNo: c.employeeNo, name: c.name, role: c.role, orgRole: c.orgRole, email: c.email },
      });
      if (wasExisting) updatedCount++;
      else createdCount++;
    } catch (err) {
      console.error('importEmployeesFromExcel: row failed', c.rowNum, err);
      failed.add(c.employeeNo);
      errors.push({ row: c.rowNum, employeeNo: c.employeeNo, message: 'Could not save this row — likely a duplicate email.' });
    }
  }

  // Pass 2: now that every row exists, resolve and set managerId. The
  // sheet is authoritative on every upload — a blank or unresolvable
  // Manager Employee No clears any previously-set managerId.
  for (const c of candidates) {
    if (failed.has(c.employeeNo)) continue;
    let managerId: string | null = null;
    if (c.managerEmployeeNo) {
      managerId = idByEmployeeNo.get(c.managerEmployeeNo) ?? null;
      if (!managerId) {
        errors.push({ row: c.rowNum, employeeNo: c.employeeNo, message: `Manager Employee No "${c.managerEmployeeNo}" not found — saved without a manager assigned.` });
      }
    }
    try {
      await prisma.user.update({ where: { employeeNo: c.employeeNo }, data: { managerId } });
    } catch (err) {
      console.error('importEmployeesFromExcel: manager link failed', c.rowNum, err);
      errors.push({ row: c.rowNum, employeeNo: c.employeeNo, message: 'Saved, but could not link the manager.' });
    }
  }

  revalidatePath('/admin/users');
  revalidatePath('/supervisor/team');

  await logAction({
    actorId: caller.id,
    summary: `${caller.name} imported roster: created ${createdCount}, updated ${updatedCount}${errors.length > 0 ? ` (${errors.length} row error${errors.length === 1 ? '' : 's'})` : ''}`,
    targetType: 'User',
  });

  return { createdCount, updatedCount, errors };
}
