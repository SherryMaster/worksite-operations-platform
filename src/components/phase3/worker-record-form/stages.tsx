import { Camera, RotateCcw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import type {
  DraftErrors,
  WorkerFormValues,
  WorkerOption,
} from "@/components/phase3/worker-record-form/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { workerPhotoAccept } from "@/lib/phase3/files";

function ErrorText({ error, id }: { error?: string; id: string }) {
  return error ? (
    <p id={id} className="text-xs font-medium text-red-700">
      {error}
    </p>
  ) : null;
}

export function PersonalStage({
  errors,
  setValues,
  values,
}: {
  errors: DraftErrors;
  setValues: React.Dispatch<React.SetStateAction<WorkerFormValues>>;
  values: WorkerFormValues;
}) {
  const update = (field: keyof WorkerFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  return (
    <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-6">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="legalName">Full name *</Label>
        <Input
          id="legalName"
          name="legalName"
          value={values.legalName}
          onChange={(event) => update("legalName", event.target.value)}
          maxLength={160}
          autoComplete="name"
          aria-invalid={Boolean(errors.legalName)}
          aria-describedby={errors.legalName ? "legalName-error" : undefined}
          className="h-11"
        />
        <ErrorText id="legalName-error" error={errors.legalName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone number *</Label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          value={values.phoneNumber}
          onChange={(event) => update("phoneNumber", event.target.value)}
          maxLength={40}
          autoComplete="tel"
          aria-invalid={Boolean(errors.phoneNumber)}
          aria-describedby={
            errors.phoneNumber ? "phoneNumber-error" : undefined
          }
          className="h-11"
        />
        <ErrorText id="phoneNumber-error" error={errors.phoneNumber} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nationality">Nationality *</Label>
        <Input
          id="nationality"
          name="nationality"
          value={values.nationality}
          onChange={(event) => update("nationality", event.target.value)}
          maxLength={80}
          autoComplete="country-name"
          aria-invalid={Boolean(errors.nationality)}
          aria-describedby={
            errors.nationality ? "nationality-error" : undefined
          }
          className="h-11"
        />
        <ErrorText id="nationality-error" error={errors.nationality} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="address">Address (optional)</Label>
        <Textarea
          id="address"
          name="address"
          value={values.address}
          onChange={(event) => update("address", event.target.value)}
          maxLength={500}
          autoComplete="street-address"
          className="min-h-24 resize-y"
        />
      </div>
    </div>
  );
}

export function WorkPayStage({
  errors,
  initialValues,
  mode,
  setValues,
  skills,
  trades,
  values,
}: {
  errors: DraftErrors;
  initialValues: WorkerFormValues;
  mode: "create" | "edit";
  setValues: React.Dispatch<React.SetStateAction<WorkerFormValues>>;
  skills: WorkerOption[];
  trades: WorkerOption[];
  values: WorkerFormValues;
}) {
  const update = (field: keyof WorkerFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const rateChanged =
    mode === "edit" && values.hourlyRate !== initialValues.hourlyRate;
  return (
    <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-6">
      <div className="space-y-2">
        <Label htmlFor="hourlyRate">Hourly pay rate (MYR) *</Label>
        <Input
          id="hourlyRate"
          name="hourlyRate"
          inputMode="decimal"
          value={values.hourlyRate}
          onChange={(event) => update("hourlyRate", event.target.value)}
          aria-invalid={Boolean(errors.hourlyRate)}
          aria-describedby={errors.hourlyRate ? "hourlyRate-error" : undefined}
          className="h-11"
        />
        <ErrorText id="hourlyRate-error" error={errors.hourlyRate} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tradeId">Trade *</Label>
        <select
          id="tradeId"
          name="tradeId"
          value={values.tradeId}
          onChange={(event) => update("tradeId", event.target.value)}
          aria-invalid={Boolean(errors.tradeId)}
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Select trade</option>
          {trades.map((trade) => (
            <option key={trade.id} value={trade.id}>
              {trade.name}
            </option>
          ))}
        </select>
        <ErrorText id="tradeId-error" error={errors.tradeId} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="skillLevelId">Skill level *</Label>
        <select
          id="skillLevelId"
          name="skillLevelId"
          value={values.skillLevelId}
          onChange={(event) => update("skillLevelId", event.target.value)}
          aria-invalid={Boolean(errors.skillLevelId)}
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Select skill level</option>
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        <ErrorText id="skillLevelId-error" error={errors.skillLevelId} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="foodDeduction">Monthly food deduction (MYR) *</Label>
        <Input
          id="foodDeduction"
          name="foodDeduction"
          inputMode="decimal"
          value={values.foodDeduction}
          onChange={(event) => update("foodDeduction", event.target.value)}
          aria-invalid={Boolean(errors.foodDeduction)}
          aria-describedby={
            errors.foodDeduction ? "foodDeduction-error" : undefined
          }
          className="h-11"
        />
        <ErrorText id="foodDeduction-error" error={errors.foodDeduction} />
      </div>
      {rateChanged ? (
        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:col-span-2">
          <Label htmlFor="rateEffectiveOn">Effective from *</Label>
          <Input
            id="rateEffectiveOn"
            name="rateEffectiveOn"
            type="date"
            value={values.rateEffectiveOn}
            onChange={(event) => update("rateEffectiveOn", event.target.value)}
            aria-invalid={Boolean(errors.rateEffectiveOn)}
            className="h-11 bg-white"
          />
          <ErrorText
            id="rateEffectiveOn-error"
            error={errors.rateEffectiveOn}
          />
          <p className="text-xs text-blue-800">
            The earlier hourly rate remains in effective-dated history.
          </p>
        </div>
      ) : (
        <input type="hidden" name="rateEffectiveOn" value="" />
      )}
    </div>
  );
}

export function PhotoStage({
  setValues,
  values,
  workerId,
}: {
  setValues: React.Dispatch<React.SetStateAction<WorkerFormValues>>;
  values: WorkerFormValues;
  workerId?: string;
}) {
  const currentPhoto =
    values.photoId && values.photoAction !== "remove" && workerId
      ? `/api/workers/${workerId}/documents/${values.photoId}`
      : null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mx-auto max-w-xl">
        <div className="relative grid min-h-72 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          {values.photoFile ? (
            <SelectedPhotoPreview
              key={`${values.photoFile.name}-${values.photoFile.size}-${values.photoFile.lastModified}`}
              file={values.photoFile}
            />
          ) : currentPhoto ? (
            <Image
              src={currentPhoto}
              alt="Worker photo preview"
              fill
              unoptimized
              className="object-contain"
            />
          ) : (
            <div>
              <Camera
                className="mx-auto size-8 text-slate-500"
                aria-hidden="true"
              />
              <p className="mt-4 font-semibold">Upload worker photo</p>
              <p className="mt-1 text-sm text-slate-500">
                Use the camera or choose an image
              </p>
            </div>
          )}
        </div>
        <Label htmlFor="photoFile" className="mt-4 block">
          Worker photo (optional)
        </Label>
        <input
          id="photoFile"
          name="photoFile"
          type="file"
          accept={workerPhotoAccept}
          capture="user"
          className="mt-2 block min-h-11 w-full rounded-lg border border-slate-200 p-2 text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setValues((current) => ({
              ...current,
              photoAction: file ? "replace" : current.photoId ? "keep" : "keep",
              photoFile: file,
            }));
          }}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {values.photoFile ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  photoAction: current.photoId ? "keep" : "keep",
                  photoFile: null,
                }))
              }
            >
              <RotateCcw aria-hidden="true" />
              Remove selected image
            </Button>
          ) : null}
          {values.photoId && values.photoAction !== "remove" ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  photoAction: "remove",
                  photoFile: null,
                }))
              }
            >
              <Trash2 aria-hidden="true" />
              Remove existing photo
            </Button>
          ) : null}
          {values.photoId && values.photoAction === "remove" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setValues((current) => ({ ...current, photoAction: "keep" }))
              }
            >
              Keep existing photo
            </Button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Optional. JPEG, PNG, WEBP, HEIC, or HEIF; maximum 10 MB.
        </p>
      </div>
    </div>
  );
}

function SelectedPhotoPreview({ file }: { file: File }) {
  const [objectUrl] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  return (
    <Image
      src={objectUrl}
      alt="Selected worker photo preview"
      fill
      unoptimized
      className="object-contain"
    />
  );
}
