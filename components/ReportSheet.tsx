import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sheet } from "@/components/Sheet";
import { T, Field, Btn, ErrorNote } from "@/components/ui";
import { errorMessage } from "@/lib/util";

export function ReportSheet({
  visible,
  onClose,
  targetType,
  targetId,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: "therapist" | "hotel" | "message";
  targetId: string;
}) {
  const report = useMutation(api.feedback.report);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await report({ targetType, targetId, reason });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Report">
      {done ? (
        <>
          <T>Thanks. Our team reviews every report. Accounts with several reports are paused straight away.</T>
          <Btn label="Done" tone="dark" onPress={onClose} />
        </>
      ) : (
        <>
          <T v="label">Tell us what happened. Reports are private.</T>
          <Field label="Reason" value={reason} onChangeText={setReason} multiline style={{ minHeight: 110 }} maxLength={500} />
          <ErrorNote text={error} />
          <Btn label="Send report" tone="dark" loading={busy} onPress={submit} />
        </>
      )}
    </Sheet>
  );
}
