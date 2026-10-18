"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthModal } from "./use-auth-modal";

export const SignInView: React.FC<{
  setLoading: (loading: boolean) => void;
  loading: boolean;
  onForgotPasswordClick: () => void;
  onCreateAccountClick: () => void;
  initialEmail?: string;
  emailDisabled?: boolean;
  onSuccess?: () => void | Promise<void>;
  showCreateAccountLink?: boolean;
  callbackUrl?: string;
}> = ({
  setLoading,
  loading,
  onForgotPasswordClick,
  onCreateAccountClick,
  initialEmail = "",
  emailDisabled = false,
  onSuccess,
  showCreateAccountLink = true,
  callbackUrl = "/app",
}) => {
  const { closeDialog } = useAuthModal();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  async function handleLoginWithCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    if (res?.ok) {
      toast.success("Signed in successfully");
      closeDialog();
      if (onSuccess) {
        await onSuccess();
      } else {
        window.location.assign(callbackUrl);
      }
    } else {
      toast.error(res?.error || "Failed to sign in");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
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
            className="pl-9 h-10 autofill:bg-transparent"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs text-muted-foreground">
            Password
          </Label>
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="cursor-pointer text-xs text-primary hover:underline"
          >
            Forgot?
          </button>
        </div>
        <div className="relative">
          <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 " />
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-9 h-10 bg-white/10 autofill:bg-transparent"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        onClick={handleLoginWithCredentials}
        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      {showCreateAccountLink && (
        <p className="text-xs text-center text-muted-foreground">
          New to [placeholder title]?
          <button
            type="button"
            onClick={onCreateAccountClick}
            className="cursor-pointer ml-1 text-primary hover:underline font-medium"
          >
            Create one
          </button>
        </p>
      )}
    </div>
  );
};
