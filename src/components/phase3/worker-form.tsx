"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { type Phase3ActionState } from "@/lib/phase3/validation";

type Option = { id: string; name: string };
type WorkerAction = (
  state: Phase3ActionState,
  formData: FormData,
) => Promise<Phase3ActionState>;

export type WorkerFormValues = {
  address: string;
  alternatePhone: string;
  assignmentStartsOn: string;
  cnicNumber: string;
  employmentStartsOn: string;
  employmentStatus: "ACTIVE" | "SUSPENDED" | "LEFT_COMPANY";
  foodDeduction: string;
  hourlyRate: string;
  legalName: string;
  nationality: string;
  notes: string;
  passportNumber: string;
  phoneNumber: string;
  projectId: string;
  rateStartsOn: string;
  skillLevelId: string;
  tradeId: string;
  workPermitExpiryDate: string;
  workPermitIssueDate: string;
  workPermitNumber: string;
};

const initialState: Phase3ActionState = { status: "idle", message: "" };

function FieldError({
  field,
  state,
}: {
  field: string;
  state: Phase3ActionState;
}) {
  const error = state.errors?.[field]?.[0];
  return error ? <p className="text-xs text-red-700">{error}</p> : null;
}

export function WorkerForm({
  action,
  mode,
  projects,
  skills,
  trades,
  values,
}: {
  action: WorkerAction;
  mode: "create" | "edit";
  projects: Option[];
  skills: Option[];
  trades: Option[];
  values: WorkerFormValues;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const create = mode === "create";

  return (
    <form action={formAction} className="space-y-8">
      <section className="border border-stone-300 bg-white">
        <div className="border-b border-stone-200 p-5">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Permanent profile
          </p>
          <h2 className="mt-1 font-heading text-2xl font-semibold uppercase">
            Identity and contact
          </h2>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="legalName">Legal Name</Label>
            <Input
              id="legalName"
              name="legalName"
              defaultValue={values.legalName}
              required
              maxLength={160}
              autoComplete="off"
              className="h-11 rounded-none"
            />
            <FieldError field="legalName" state={state} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              defaultValue={values.phoneNumber}
              required
              maxLength={40}
              autoComplete="off"
              className="h-11 rounded-none"
            />
            <FieldError field="phoneNumber" state={state} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alternatePhone">Alternate Phone (Optional)</Label>
            <Input
              id="alternatePhone"
              name="alternatePhone"
              type="tel"
              defaultValue={values.alternatePhone}
              maxLength={40}
              autoComplete="off"
              className="h-11 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality (Optional)</Label>
            <Input
              id="nationality"
              name="nationality"
              defaultValue={values.nationality}
              maxLength={80}
              className="h-11 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              name="address"
              defaultValue={values.address}
              maxLength={500}
              className="h-11 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnicNumber">CNIC Number</Label>
            <Input
              id="cnicNumber"
              name="cnicNumber"
              defaultValue={values.cnicNumber}
              maxLength={40}
              spellCheck={false}
              className="h-11 rounded-none"
            />
            <FieldError field="cnicNumber" state={state} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passportNumber">Passport Number</Label>
            <Input
              id="passportNumber"
              name="passportNumber"
              defaultValue={values.passportNumber}
              maxLength={40}
              spellCheck={false}
              className="h-11 rounded-none"
            />
            <p className="text-xs text-stone-500">
              At least one CNIC or passport number is required.
            </p>
          </div>
        </div>
      </section>

      <section className="border border-stone-300 bg-white">
        <div className="border-b border-stone-200 p-5">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Work authorization
          </p>
          <h2 className="mt-1 font-heading text-2xl font-semibold uppercase">
            Permit and classification
          </h2>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="workPermitNumber">
              Work Permit Number (Optional)
            </Label>
            <Input
              id="workPermitNumber"
              name="workPermitNumber"
              defaultValue={values.workPermitNumber}
              maxLength={60}
              spellCheck={false}
              className="h-11 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workPermitIssueDate">Permit Issue Date</Label>
            <Input
              id="workPermitIssueDate"
              name="workPermitIssueDate"
              type="date"
              defaultValue={values.workPermitIssueDate}
              className="h-11 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workPermitExpiryDate">Permit Expiry Date</Label>
            <Input
              id="workPermitExpiryDate"
              name="workPermitExpiryDate"
              type="date"
              defaultValue={values.workPermitExpiryDate}
              className="h-11 rounded-none"
            />
            <FieldError field="workPermitExpiryDate" state={state} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tradeId">Trade</Label>
            <select
              id="tradeId"
              name="tradeId"
              defaultValue={values.tradeId}
              required
              className="h-11 w-full border border-stone-300 bg-white px-3 text-sm"
            >
              <option value="">Select trade</option>
              {trades.map((trade) => (
                <option key={trade.id} value={trade.id}>
                  {trade.name}
                </option>
              ))}
            </select>
            <FieldError field="tradeId" state={state} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skillLevelId">Skill Level</Label>
            <select
              id="skillLevelId"
              name="skillLevelId"
              defaultValue={values.skillLevelId}
              required
              className="h-11 w-full border border-stone-300 bg-white px-3 text-sm"
            >
              <option value="">Select skill level</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
            <FieldError field="skillLevelId" state={state} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="foodDeduction">Monthly Food Deduction (MYR)</Label>
            <Input
              id="foodDeduction"
              name="foodDeduction"
              inputMode="decimal"
              defaultValue={values.foodDeduction}
              required
              className="h-11 rounded-none"
            />
            <FieldError field="foodDeduction" state={state} />
          </div>
        </div>
      </section>

      {create ? (
        <section className="border border-stone-300 bg-white">
          <div className="border-b border-stone-200 p-5">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Initial history
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold uppercase">
              Employment, rate, and assignment
            </h2>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employmentStatus">Employment Status</Label>
              <select
                id="employmentStatus"
                name="employmentStatus"
                defaultValue={values.employmentStatus}
                required
                className="h-11 w-full border border-stone-300 bg-white px-3 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="LEFT_COMPANY">Left Company</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentStartsOn">Employment Start Date</Label>
              <Input
                id="employmentStartsOn"
                name="employmentStartsOn"
                type="date"
                defaultValue={values.employmentStartsOn}
                required
                className="h-11 rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate (MYR)</Label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                inputMode="decimal"
                defaultValue={values.hourlyRate}
                required
                className="h-11 rounded-none"
              />
              <FieldError field="hourlyRate" state={state} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateStartsOn">Rate Effective Date</Label>
              <Input
                id="rateStartsOn"
                name="rateStartsOn"
                type="date"
                defaultValue={values.rateStartsOn}
                required
                className="h-11 rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Initial Project (Optional)</Label>
              <select
                id="projectId"
                name="projectId"
                defaultValue={values.projectId}
                className="h-11 w-full border border-stone-300 bg-white px-3 text-sm"
              >
                <option value="">Awaiting assignment</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignmentStartsOn">
                Assignment Effective Date
              </Label>
              <Input
                id="assignmentStartsOn"
                name="assignmentStartsOn"
                type="date"
                defaultValue={values.assignmentStartsOn}
                required
                className="h-11 rounded-none"
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="border border-stone-300 bg-white p-5">
        <Label htmlFor="notes">Operational Notes (Optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={values.notes}
          maxLength={2000}
          className="mt-2 min-h-28 rounded-none"
        />
      </section>

      {state.duplicateWorkerId ? (
        <section className="border border-amber-300 bg-amber-50 p-5">
          <p className="font-semibold text-amber-950">
            Possible duplicate: {state.duplicateWorkerName}
          </p>
          <Link
            href={`/ceo/workers/${state.duplicateWorkerId}`}
            target="_blank"
            className="mt-2 inline-flex text-sm font-semibold text-amber-900 underline"
          >
            Open existing worker in a new tab
          </Link>
          <label className="mt-4 flex items-start gap-3 text-sm text-amber-950">
            <input
              type="checkbox"
              name="confirmDuplicate"
              value="yes"
              required
              className="mt-0.5 size-4"
            />
            I reviewed the existing record and still want to save this separate
            worker.
          </label>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending}
          className="rounded-none bg-stone-950 px-6 text-white"
        >
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? "Saving…" : create ? "Create Worker" : "Save Worker"}
        </Button>
        <Link
          href={create ? "/ceo/workers" : ".."}
          className="text-sm font-semibold text-stone-600 hover:text-stone-950"
        >
          Cancel
        </Link>
        {state.message ? (
          <p
            aria-live="polite"
            className={
              state.status === "error"
                ? "text-sm text-red-700"
                : "text-sm text-emerald-700"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
