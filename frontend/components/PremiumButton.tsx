import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

type PremiumButtonVariant = "primary" | "secondary" | "glass" | "compact";

type PremiumButtonProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  target?: string;
  rel?: string;
  type?: "button" | "submit" | "reset";
  variant?: PremiumButtonVariant;
};

export function PremiumButton({
  children,
  className = "",
  href,
  icon,
  onClick,
  rel,
  target,
  type = "button",
  variant = "primary"
}: PremiumButtonProps) {
  const classes = ["premium-button", `premium-button--${variant}`, className].filter(Boolean).join(" ");
  const content = (
    <>
      <span className="premium-button__glow" aria-hidden="true" />
      <span className="premium-button__shine" aria-hidden="true" />
      <span className="premium-button__label">{children}</span>
      {icon ? <span className="premium-button__icon">{icon}</span> : null}
    </>
  );

  if (href) {
    const sharedProps = {
      className: classes,
      onClick,
      rel,
      target
    };

    if (target || href.startsWith("http")) {
      return (
        <a {...sharedProps} href={href}>
          {content}
        </a>
      );
    }

    return (
      <Link {...sharedProps} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick} type={type}>
      {content}
    </button>
  );
}
