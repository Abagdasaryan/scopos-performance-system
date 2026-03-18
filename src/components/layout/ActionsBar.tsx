"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";

interface ActionsBarProps {
  evaluationId: any;
  status: string;
  onPrint: () => void;
}

export default function ActionsBar({
  evaluationId,
  status,
  onPrint,
}: ActionsBarProps) {
  const updateStatus = useMutation(api.evaluations.updateStatus);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!confirm("Submit this evaluation? It will be marked as submitted."))
      return;
    await updateStatus({ id: evaluationId, status: "submitted" });
  };

  const handleFinalize = async () => {
    if (
      !confirm(
        "Finalize this evaluation? This marks the review as complete."
      )
    )
      return;
    await updateStatus({ id: evaluationId, status: "finalized" });
  };

  const handleReopen = async () => {
    await updateStatus({ id: evaluationId, status: "draft" });
  };

  const statusLabel =
    status === "draft"
      ? "Draft"
      : status === "submitted"
        ? "Submitted"
        : status === "finalized"
          ? "Finalized"
          : status;

  const statusClass =
    status === "draft"
      ? "warn"
      : status === "submitted"
        ? "success"
        : status === "finalized"
          ? "success"
          : "";

  return (
    <div className="actions-bar no-print" style={{ flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
        <span className={`flag ${statusClass}`}>
          <span className="dot"></span>
          {statusLabel}
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
          All changes saved automatically
        </span>
      </div>

      <button
        className="btn btn-secondary"
        onClick={() => router.push("/evaluations")}
      >
        Back to List
      </button>

      {status === "draft" && (
        <button className="btn btn-primary" onClick={handleSubmit}>
          Submit Evaluation
        </button>
      )}

      {status === "submitted" && (
        <>
          <button className="btn btn-secondary" onClick={handleReopen}>
            Reopen as Draft
          </button>
          <button className="btn btn-primary" onClick={handleFinalize}>
            Finalize
          </button>
        </>
      )}

      {status === "finalized" && (
        <button className="btn btn-secondary" onClick={handleReopen}>
          Reopen as Draft
        </button>
      )}

      <button className="btn btn-secondary" onClick={onPrint}>
        Print Evaluation
      </button>
    </div>
  );
}
