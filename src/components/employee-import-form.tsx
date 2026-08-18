'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { importEmployeesFromExcel, type ImportSummary } from '@/app/(dashboard)/admin/import/actions';

const initialState: ImportSummary = { createdCount: 0, updatedCount: 0, errors: [] };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? 'Importing…' : 'Import'}
    </button>
  );
}

export function EmployeeImportForm() {
  const [state, formAction] = useFormState(importEmployeesFromExcel, initialState);
  const hasResult = state.createdCount > 0 || state.updatedCount > 0 || state.errors.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-md">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-mono text-xs uppercase tracking-wide text-ink/50">Excel file (.xlsx)</span>
        <input name="file" type="file" accept=".xlsx,.xls" required className="rounded-lg border border-black/10 px-3 py-2" />
      </label>
      <SubmitButton />
      {hasResult && (
        <div className="rounded-lg border border-black/10 bg-paper p-3 text-sm">
          <p className="font-medium">{state.createdCount} created, {state.updatedCount} updated</p>
          {state.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-red-700">
              {state.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}
                  {e.employeeNo ? ` (Employee No ${e.employeeNo})` : ''}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
