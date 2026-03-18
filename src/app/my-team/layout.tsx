import { RoleGate } from "@/components/auth/RoleGate";
import { ReactNode } from "react";

export default function MyTeamLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowed={["super_admin", "hr_admin", "manager"]}>
      {children}
    </RoleGate>
  );
}
