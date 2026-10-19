import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

export const MagicLinkView: React.FC<{
  setLoading: (loading: boolean) => void;
  loading: boolean;
  onBackClick: () => void;
  claimAnonymousAccountId?: string;
  initialEmail?: string;
  emailDisabled?: boolean;
  callbackUrl?: string;
}> = ({
  setLoading,
  loading,
  onBackClick,
  claimAnonymousAccountId,
  initialEmail = "",
  emailDisabled = false,
  callbackUrl,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl:
        callbackUrl ||
        (claimAnonymousAccountId
          ? `/api/claim?accountId=${claimAnonymousAccountId}`
          : "/app"),
    });
    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="space-y-4 mt-4">
      {sent && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-semibold">Check your inbox</h2>
          <p className="text-sm text-muted-foreground">
            We sent instructions to reset your password to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            If you don’t see it, check your spam folder or try again.
          </p>
          <Button
            type="button"
            variant="default"
            className="w-full h-10"
            onClick={onBackClick}
          >
            Back to sign in
          </Button>
        </div>
      )}
      {!sent && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-muted-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 " />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={emailDisabled}
                placeholder="you@company.com"
                className="pl-9 h-10 bg-white/10 autofill:bg-transparent "
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            onClick={handleSendMagicLink}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
              </>
            ) : (
              "Send magic link"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            <button
              type="button"
              onClick={onBackClick}
              className="cursor-pointer ml-1 text-primary hover:underline font-medium"
            >
              Back to sign in
            </button>
          </p>
        </>
      )}
    </div>
  );
};
