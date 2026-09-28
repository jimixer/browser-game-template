import type { ButtonHTMLAttributes } from "react";

/** ボタンの種類。主は画面の主な操作 */
export type ButtonKind = "primary" | "secondary";

const kindClass: Record<ButtonKind, string> = {
  primary: "border-accent bg-accent text-accent-text",
  secondary: "border-line bg-surface text-fg",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind; small?: boolean };

/** `small` はヘッダーや行の中に並べる小さな操作に使う */
export default function Button({ kind = "secondary", small, className = "", type = "button", ...rest }: ButtonProps) {
  const size = small ? "px-2 py-1" : "px-3 py-2";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-card border text-sm font-bold ${size} ${kindClass[kind]} ${className}`}
      {...rest}
    />
  );
}
