"use client";

interface ActionsBarProps {
  evaluationId: any;
  onPrint: () => void;
}

export default function ActionsBar({ onPrint }: ActionsBarProps) {
  return (
    <div className="actions-bar no-print">
      <button className="btn btn-primary" onClick={onPrint}>
        Print Evaluation
      </button>
    </div>
  );
}
