"use client";

// import { useUpgradeSubscriptionModal } from "@/components/modals/upgrade-subscription-modal/use-upgrade-subscription-modal";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type ServerActionStatus =
  | "ok"
  | "error"
  | "require_subscription_upgrade";

export type ServerActionMessageDetail = {
  title?: string;
  description?: string;
};

export type ServerActionResponse<
  TData = any,
  TError = ServerActionMessageDetail,
> = {
  status: ServerActionStatus;
  data?: TData | null;
  message?: TError | null;
  requireRefresh?: boolean; // if true, the client should refresh data after this action
};

export type ServerActionFn<TArgs extends any[] = any[], TResult = any> = (
  ...args: TArgs
) => Promise<ServerActionResponse<TResult>>;

// status : ok -> message is shown as success toast
// status : error -> message is shown as error toast
// status : require_subscription_upgrade -> message is shown title and description of the subscriptions modal

export type UseServerActionReturn<F extends ServerActionFn> = {
  call: (
    ...args: Parameters<F>
  ) => Promise<Awaited<ReturnType<F>>["data"] | null>;
  loading: boolean;
  result: Awaited<ReturnType<F>>["data"] | null;
};

export function useServerAction<F extends ServerActionFn>(
  action: F,
  defaultLoading?: boolean,
): UseServerActionReturn<F> {
  const [loading, setLoading] = useState(!!defaultLoading);
  const [result, setResult] = useState<Awaited<ReturnType<F>>["data"] | null>(
    null,
  );
  const router = useRouter();
  // const { openDialog: openUpgradeModal } = useUpgradeSubscriptionModal();
  const call = useCallback(
    async (...args: Parameters<F>) => {
      setLoading(true);
      try {
        const res = (await action(...args)) as Awaited<ReturnType<F>>;
        if (res.requireRefresh) {
          router.refresh();
        }
        if (res.status === "error") {
          toast.error(res.message?.title || "An error occurred", {
            description: res.message?.description,
          });
          setResult(null);
          return null;
        }

        if (res.status === "require_subscription_upgrade") {
          // openUpgradeModal(
          //   res.message
          //     ? {
          //         title: res.message?.title,
          //         description: res.message?.description,
          //       }
          //     : undefined,
          // );
          setResult(null);
          return null;
        }
        if (res.message?.title) {
          toast.success(res.message.title, {
            description: res.message.description,
          });
        }

        setResult(res.data);

        return res.data;
      } finally {
        setLoading(false);
      }
    },
    [
      action,
      // openUpgradeModal,
      router,
    ],
  );

  return { call, loading, result };
}

export default useServerAction;
