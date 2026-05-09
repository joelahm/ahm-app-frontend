"use client";

import type { ReactNode } from "react";

import { createContext, useCallback, useContext, useState } from "react";

interface TaskActivityRefreshContextValue {
  bump: () => void;
  version: number;
}

const TaskActivityRefreshContext =
  createContext<TaskActivityRefreshContextValue>({
    bump: () => {},
    version: 0,
  });

export const TaskActivityRefreshProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return (
    <TaskActivityRefreshContext.Provider value={{ bump, version }}>
      {children}
    </TaskActivityRefreshContext.Provider>
  );
};

export const useTaskActivityRefresh = () =>
  useContext(TaskActivityRefreshContext);
