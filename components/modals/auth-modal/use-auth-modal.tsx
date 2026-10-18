"use client";

import * as React from "react";

type State = {
  open: boolean;
  mode: "signin" | "signup";
  cbUrl?: string;
};

type Action =
  | {
      type: "SHOW_DIALOG";
      mode: "signin" | "signup";
      cbUrl?: string;
    }
  | { type: "CLOSE_DIALOG" };

const actionTypes = {
  SHOW_DIALOG: "SHOW_DIALOG",
  CLOSE_DIALOG: "CLOSE_DIALOG",
} as const;

const listeners: Array<(state: State) => void> = [];
let memoryState: State = {
  open: false,
  mode: "signin",
};

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case actionTypes.SHOW_DIALOG:
      return {
        open: true,
        mode: action.mode,
        cbUrl: action.cbUrl,
      };
    case actionTypes.CLOSE_DIALOG:
      return { ...state, open: false, cbUrl: undefined };
  }
}

export function useAuthModal() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const openDialog = (mode: "signin" | "signup", cbUrl?: string) =>
    dispatch({ type: actionTypes.SHOW_DIALOG, mode, cbUrl });

  const closeDialog = () => dispatch({ type: actionTypes.CLOSE_DIALOG });

  return { ...state, openDialog, closeDialog };
}
