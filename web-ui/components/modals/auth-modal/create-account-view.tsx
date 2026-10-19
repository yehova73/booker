"use client";

import { createUserAction } from "@/actions/account/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useServerAction from "@/hooks/use-server-action";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

export const CreateAccountView: React.FC<{
  setLoading: (loading: boolean) => void;
  loading: boolean;
  onCreateAccountClick: () => void;
  initialEmail?: string;
  emailDisabled?: boolean;

  onSuccess?: () => void | Promise<void>;
  showSignInLink?: boolean;
  callbackUrl?: string;
}> = ({
  setLoading,
  loading,
  onCreateAccountClick,
  initialEmail = "",
  emailDisabled = false,
  onSuccess,
  showSignInLink = true,
  callbackUrl = "/app",
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { call, loading: loadingServerAction } =
    useServerAction(createUserAction);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    if (!name) {
      toast.error("Please enter your full name");
      setLoading(false);
      return;
    }

    if (!confirmPassword) {
      toast.error("Please confirm your password");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }
    try {
      const res = await call({ name, email, password });
      if (!res?.id) {
        return;
      }
      toast.success("Account created successfully");
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!signInResult?.ok) {
        toast.error(signInResult?.error || "Unable to sign in");
        return;
      }
      if (onSuccess) {
        await onSuccess();
      }
      window.location.assign(callbackUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs text-muted-foreground">
          Full name
        </Label>
        <div className="relative">
          <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 " />
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            className="pl-9 h-10 autofill:bg-transparent"
          />
        </div>
      </div>

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
        </div>
        <div className="relative">
          <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2  " />
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-9 h-10 autofill:bg-transparent"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="confirmPassword"
          className="text-xs text-muted-foreground"
        >
          Confirm password
        </Label>
        <div className="relative">
          <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-9 h-10 autofill:bg-transparent"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading || loadingServerAction}
        onClick={handleCreateAccount}
        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
      >
        {loading || loadingServerAction ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
          </>
        ) : (
          "Create free account"
        )}
      </Button>

      {showSignInLink && (
        <p className="text-xs text-center text-muted-foreground">
          Already have an account?
          <button
            type="button"
            onClick={onCreateAccountClick}
            className="cursor-pointer ml-1 text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      )}
    </div>
  );
};
