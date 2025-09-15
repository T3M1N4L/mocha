import { CircleCheck, AlertCircle, Info, AlertTriangle } from "lucide-solid";
import { JSX } from "solid-js";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  type: ToastType;
  message: string;
}

interface ToastComponentProps {
  type: ToastType;
  message: string;
  class?: string;
}

const toastIcons = {
  success: CircleCheck,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastClasses = {
  success: "alert-success",
  error: "alert-error",
  info: "alert-info", 
  warning: "alert-warning",
};

export function Toast(props: ToastComponentProps): JSX.Element {
  const IconComponent = toastIcons[props.type];
  
  return (
    <div class={`alert ${toastClasses[props.type]} min-w-fit max-w-sm w-auto ${props.class || ''}`}>
      <IconComponent />
      <span class="whitespace-nowrap">{props.message}</span>
    </div>
  );
}

// Helper functions for creating toast notifications
export const createToast = (type: ToastType, message: string) => {
  return () => <Toast type={type} message={message} />;
};

export const createSuccessToast = (message: string) => 
  createToast("success", message);

export const createErrorToast = (message: string) => 
  createToast("error", message);

export const createInfoToast = (message: string) => 
  createToast("info", message);

export const createWarningToast = (message: string) => 
  createToast("warning", message);