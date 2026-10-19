import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import useServerAction from "@/hooks/use-server-action";
import { sendResetPasswordRequestAction } from "@/actions/account/password";

export const ForgotPasswordView: React.FC<{
  onBackClick: () => void;
}> = ({ onBackClick }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { call: sendReset, loading } = useServerAction(
    sendResetPasswordRequestAction,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await sendReset(email);
    if (data !== null) {
      setSent(true);
    }
  };
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
                placeholder="you@company.com"
                className="pl-9 h-10 autofill:bg-transparent"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
              </>
            ) : (
              "Send reset link"
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
