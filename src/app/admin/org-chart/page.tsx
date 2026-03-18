"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import OrgTreeNode from "@/components/admin/OrgTreeNode";

export default function OrgChartPage() {
  const employees = useQuery(api.employees.getAllEmployees, {});

  if (employees === undefined) {
    return (
      <div className="container">
        <p style={{ color: "var(--ink-muted)" }}>Loading...</p>
      </div>
    );
  }

  const activeEmployees = employees.filter((e) => e.isActive);
  const roots = activeEmployees.filter(
    (e) => !e.managerId
  );

  return (
    <div className="container">
      <h1
        style={{
          fontFamily: "var(--font-fraunces), 'Fraunces', serif",
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        Organization Chart
      </h1>

      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={2}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="zoom-controls">
              <button onClick={() => zoomIn()}>+</button>
              <button onClick={() => zoomOut()}>-</button>
              <button onClick={() => resetTransform()}>Reset</button>
            </div>
            <div
              className="card"
              style={{
                overflow: "hidden",
                minHeight: 400,
              }}
            >
              <TransformComponent
                wrapperStyle={{ width: "100%", minHeight: 400 }}
                contentStyle={{ width: "100%", minHeight: 400 }}
              >
                <div className="org-tree">
                  <div className="org-children" style={{ gap: 32 }}>
                    {roots.map((root) => (
                      <OrgTreeNode
                        key={root._id}
                        employee={root}
                        allEmployees={activeEmployees}
                        level={0}
                      />
                    ))}
                  </div>
                  {roots.length === 0 && (
                    <p
                      style={{
                        color: "var(--ink-muted)",
                        padding: 40,
                        textAlign: "center",
                      }}
                    >
                      No employees found. Add employees to see the org chart.
                    </p>
                  )}
                </div>
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
