import { RoleGate } from "@/components/auth/RoleGate";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowed={["super_admin", "hr_admin"]}>
      {children}
    </RoleGate>
  );
}
