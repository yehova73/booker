"use client";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { CreateAccountView } from "./create-account-view";
import { ForgotPasswordView } from "./forgot-password-view";
import { MagicLinkView } from "./magic-link-view";
import { SignInView } from "./sign-in-view";
import { useAuthModal } from "./use-auth-modal";
import Link from "next/link";
import { SocialAuthButtons } from "./social-auth-buttons";

type Mode = "signin" | "signup" | "forgot-password" | "magic-link";

export function AuthModal() {
  const {
    open,
    closeDialog,
    mode: initialMode,
    cbUrl,
    openDialog,
  } = useAuthModal();
  const params = useSearchParams();
  const actionParam = params.get("action");
  const callbackUrl = cbUrl || "/dashboard";
  const [mode, setMode] = useState<Mode>(initialMode || "signin");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (actionParam === "login") {
      openDialog("signin", "/dashboard");
    }
  }, [actionParam, openDialog]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      timeout = setTimeout(() => setMode(initialMode || "signin"), 0);
    } else {
      timeout = setTimeout(() => {
        setMode("signin");
      }, 300);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [initialMode, open]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && closeDialog()}>
      <DialogContent className="sm:max-w-md border border-white/10 p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {mode === "signup" && "Create your account"}
              {mode === "signin" && "Welcome back"}
              {mode === "magic-link" && "Sign in with magic link"}
              {mode === "forgot-password" && "Forgot your password?"}
            </DialogTitle>
            <DialogDescription>
              {mode === "signup" && "Free forever, no card required."}
              {mode === "signin" &&
                "Sign in to sync your workspaces across devices."}
              {mode === "magic-link" &&
                "Enter your email and we'll send you a magic link to sign in."}
              {mode === "forgot-password" &&
                "Enter your email and we'll send you instructions to reset your password."}
            </DialogDescription>
          </DialogHeader>
          {(mode === "signin" || mode === "signup") && (
            <>
              <div className="mt-5 grid grid-cols-1 gap-2">
                <SocialAuthButtons callbackUrl={callbackUrl} />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-border  backdrop-blur-sm"
                  onClick={() => setMode("magic-link")}
                  disabled={loading}
                >
                  <Mail />
                  Magic Link
                </Button>
                {/* <Button
              type="button"
              variant="outline"
              className="h-10 border-border "
              onClick={() => handleSocial("GitHub")}
              disabled={loading}
            >
               <Github className="h-4 w-4" /> 
              GitHub
            </Button> */}
              </div>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  or
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
            </>
          )}

          {mode === "signin" && (
            <SignInView
              setLoading={setLoading}
              loading={loading}
              onForgotPasswordClick={() => setMode("forgot-password")}
              onCreateAccountClick={() => setMode("signup")}
              callbackUrl={callbackUrl}
            />
          )}

          {mode === "signup" && (
            <CreateAccountView
              setLoading={setLoading}
              loading={loading}
              onCreateAccountClick={() => setMode("signin")}
              onSuccess={() => closeDialog()}
              callbackUrl={callbackUrl}
            />
          )}

          {mode === "magic-link" && (
            <MagicLinkView
              setLoading={setLoading}
              loading={loading}
              onBackClick={() => setMode("signin")}
              callbackUrl={callbackUrl}
            />
          )}

          {mode === "forgot-password" && (
            <ForgotPasswordView onBackClick={() => setMode("signin")} />
          )}
        </div>

        <div className="border-t  px-6 py-3">
          <p className="text-[11px] text-muted-foreground text-center">
            By continuing you agree to our{" "}
            <Link
              href="/policies/terms"
              className="underline hover:text-foreground"
              onClick={closeDialog}
            >
              Terms
            </Link>{" "}
            &{" "}
            <Link
              href="/policies/privacy"
              className="underline hover:text-foreground"
              onClick={closeDialog}
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
