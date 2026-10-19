import React from "react";

export const DashboardPageHeader: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  pre?: React.ReactNode;
  isModal?: boolean;
  className?: string;
}> = ({ pre, title, isModal, actions, description, className }) => {
  return (
    <div
      className={`flex space-x-2 items-center justify-between ${className || ""}`}
    >
      {pre}
      <div className="grow">
        <h1
          className={`text-2xl font-semibold text-foreground truncate  ${isModal ? "text-lg" : ""}`}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description} </p>
        )}
      </div>
      {actions}
    </div>
  );
};
