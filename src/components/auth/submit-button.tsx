import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  pending,
  idle,
  busy,
}: {
  pending: boolean;
  idle: string;
  busy: string;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      className="group/cta w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {busy}
        </>
      ) : (
        <>
          {idle}
          <ArrowRight
            className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
            aria-hidden
          />
        </>
      )}
    </Button>
  );
}
