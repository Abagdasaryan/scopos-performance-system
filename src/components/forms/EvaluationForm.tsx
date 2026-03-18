"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getRoleConfig } from "@/lib/roleConfig";
import FormHeader from "../layout/FormHeader";
import ActionsBar from "../layout/ActionsBar";
import EmployeeInfoSection from "../sections/EmployeeInfoSection";
import SkillsSection from "../sections/SkillsSection";
import ValuesSection from "../sections/ValuesSection";
import OperationalMetricsSection from "../sections/OperationalMetricsSection";
import AuthorityGateSection from "../sections/AuthorityGateSection";
import DeficiencySection from "../sections/DeficiencySection";
import PromotionSection from "../sections/PromotionSection";
import ExecutiveSummarySection from "../sections/ExecutiveSummarySection";
import DashboardSection from "../sections/DashboardSection";

interface EvaluationFormProps {
  evaluationId: string;
}

export default function EvaluationForm({ evaluationId }: EvaluationFormProps) {
  const data = useQuery(api.evaluations.getEvaluation, {
    id: evaluationId as any,
  });

  if (data === undefined) {
    return (
      <div className="container">
        <div className="card">
          <div className="card-body">Loading evaluation...</div>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="container">
        <div className="card">
          <div className="card-body">Evaluation not found.</div>
        </div>
      </div>
    );
  }

  const config = getRoleConfig(data.roleType);

  const sectionData = {
    roleType: data.roleType,
    empName: data.empName,
    empPosition: data.empPosition,
    reviewer: data.reviewer,
    reviewDate: data.reviewDate,
    reviewPeriod: data.reviewPeriod,
    empProject: data.empProject,
    skillRatings: data.skillRatings as Record<string, number | null>,
    valueRatings: data.valueRatings as Record<string, number | null>,
    operationalMetrics: data.operationalMetrics as Record<string, number | string | null>,
    authorityLevel: data.authorityLevel,
    deficiencyPlan: data.deficiencyPlan as
      | { gap: string; action: string; target: string; deadline: string }[]
      | undefined,
    managerNotes: data.managerNotes,
    status: data.status,
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container">
      <FormHeader title={config.title} subtitle={config.subtitle} />
      <EmployeeInfoSection
        evaluationId={data._id}
        data={sectionData}
        config={config}
      />
      <SkillsSection
        evaluationId={data._id}
        data={sectionData}
        config={config}
      />
      <ValuesSection
        evaluationId={data._id}
        data={sectionData}
        config={config}
      />
      <OperationalMetricsSection
        evaluationId={data._id}
        data={sectionData}
        config={config}
      />
      <AuthorityGateSection
        evaluationId={data._id}
        data={sectionData}
        config={config}
      />
      <DeficiencySection
        evaluationId={data._id}
        data={sectionData}
        config={config}
      />
      <PromotionSection
        evaluationId={data._id}
        data={sectionData}
        config={config}
      />
      <ExecutiveSummarySection
        evaluationId={data._id}
        data={sectionData}
        config={config}
      />
      <DashboardSection
        evaluationId={data._id}
        data={sectionData}
        config={config}
      />
      <ActionsBar evaluationId={data._id} onPrint={handlePrint} />
    </div>
  );
}
