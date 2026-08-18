import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { EmployeeImportForm } from '@/components/employee-import-form';

export const dynamic = 'force-dynamic';

export default async function ImportRosterPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isSuperAdmin(user.role)) redirect('/employee/goals');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-semibold">Import Roster</h1>
      <p className="text-sm text-ink/60 max-w-lg">
        One-time (or re-run whenever the roster changes) upload of the employee directory. Columns: Employee No,
        Name, Role (Employee / Supervisor / HR / Super Admin), Org Role (optional), Email, Manager Employee No.
        Re-uploading the same sheet updates existing people by Employee No rather than duplicating them.
      </p>
      <EmployeeImportForm />
    </div>
  );
}
