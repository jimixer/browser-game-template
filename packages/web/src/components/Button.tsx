import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

/** ボタンの種類。主は画面の主な操作、追加は枠へ要素を足す操作 */
export type ButtonKind = "primary" | "secondary" | "danger" | "add";

const kindClass: Record<ButtonKind, string> = {
  primary: "border-accent bg-accent text-accent-text",
  secondary: "border-line bg-surface text-fg",
  danger: "border-danger bg-surface text-danger",
  add: "border-dashed border-line bg-transparent text-fg-muted",
};

/**
 * ボタンとボタンの見た目のリンクに共通のクラス。
 * `small` は行の中に並べる小さな操作(並べ替え、行の削除など)に使う
 */
function buttonClass(kind: ButtonKind = "secondary", className = "", small = false): string {
  const size = small ? "px-2 py-1" : "px-3 py-2";
  return `inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-card border text-sm font-bold no-underline disabled:opacity-50 ${size} ${kindClass[kind]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind; small?: boolean };

export default function Button({ kind, small, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(kind, className, small)} {...rest} />;
}

/** ボタンの見た目をしたリンク。`href` を渡すとサイトの外へ新しいタブで開く */
export function ButtonLink({
  to,
  href,
  state,
  kind,
  className,
  children,
}: { kind?: ButtonKind; className?: string; children: ReactNode } & (
  | { to: string; href?: never; state?: unknown }
  | { href: string; to?: never; state?: never }
)) {
  if (href !== undefined) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={buttonClass(kind, className)}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} state={state} className={buttonClass(kind, className)}>
      {children}
    </Link>
  );
}
