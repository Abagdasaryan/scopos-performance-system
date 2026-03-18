"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ROLE_CONFIGS } from "@/lib/roleConfig";

export default function NewEvaluationPage() {
  const createEvaluation = useMutation(api.evaluations.createEvaluation);
  const router = useRouter();

  const handleCreate = async (roleType: string) => {
    const id = await createEvaluation({ roleType });
    router.push(`/evaluations/${id}`);
  };

  return (
    <div className="container">
      <h1 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 24, marginBottom: 24 }}>
        New Evaluation
      </h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>Select the role type for this evaluation:</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {Object.values(ROLE_CONFIGS).map((config) => (
          <button
            key={config.roleType}
            onClick={() => handleCreate(config.roleType)}
            className="card"
            style={{ cursor: "pointer", textAlign: "left", border: "2px solid var(--border-light)", transition: "all 0.2s" }}
          >
            <div className="card-body">
              <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', serif", fontSize: 20, marginBottom: 8 }}>
                {config.title}
              </h2>
              <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                {config.subtitle} — {config.skills.length} competencies, {config.values.length} values
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
