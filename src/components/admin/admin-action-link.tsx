import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const adminActionButtonClassName = cn(
  buttonVariants({ variant: "outline" }),
  "inline-flex items-center gap-1.5 border-team-b/50 bg-team-b/15 text-foreground shadow-none hover:border-team-b/65 hover:bg-team-b/25 hover:text-foreground",
);

/** Admin setup actions — visually distinct from manager primary CTAs (e.g. Pick team). */
export function AdminActionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(adminActionButtonClassName, className)}>
      {children}
    </Link>
  );
}
