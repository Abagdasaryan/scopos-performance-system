"use client";

import { useParams } from "next/navigation";
import EvaluationForm from "@/components/forms/EvaluationForm";

export default function EvaluationPage() {
  const params = useParams();
  const id = params.id as string;
  return <EvaluationForm evaluationId={id} />;
}
