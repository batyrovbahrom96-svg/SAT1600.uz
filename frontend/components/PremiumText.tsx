import { type CSSProperties, type ElementType, type ReactNode } from "react";

type PremiumTextVariant =
  | "hero"
  | "proof"
  | "video"
  | "route"
  | "founder"
  | "testimonial"
  | "platform"
  | "diagnostic"
  | "study"
  | "parent"
  | "faq"
  | "contact";

type PremiumTextProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id?: string;
  variant?: PremiumTextVariant;
};

export function PremiumText({
  as: Component = "span",
  children,
  className = "",
  id,
  variant = "hero"
}: PremiumTextProps) {
  if (typeof children !== "string") {
    return (
      <Component id={id} className={`premium-text premium-text--${variant} ${className}`.trim()}>
        {children}
      </Component>
    );
  }

  const words = children.split(/(\s+)/);

  return (
    <Component id={id} className={`premium-text premium-text--${variant} ${className}`.trim()}>
      {words.map((word, index) => {
        if (/^\s+$/.test(word)) return word;

        return (
          <span
            className="premium-text__word"
            key={`${word}-${index}`}
            style={{ "--word-index": index } as CSSProperties & Record<"--word-index", number>}
          >
            {word}
          </span>
        );
      })}
    </Component>
  );
}
