"use client";

interface FormHeaderProps {
  title: string;
  subtitle: string;
}

export default function FormHeader({ title, subtitle }: FormHeaderProps) {
  return (
    <div className="form-header">
      <div className="header-row">
        <div>
          <h1>{title}</h1>
          <div className="subtitle">{subtitle}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scopos-icon.png" alt="SCOPOS" className="logo" />
      </div>
    </div>
  );
}
