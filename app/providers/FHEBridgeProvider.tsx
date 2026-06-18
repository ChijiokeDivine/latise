"use client";

import { createContext, useContext } from "react";
import { useFHEBridge } from "@/app/lib/fheBridge";

const FHEBridgeContext = createContext<ReturnType<typeof useFHEBridge> | null>(
  null
);

export function FHEBridgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const bridge = useFHEBridge();

  return (
    <FHEBridgeContext.Provider value={bridge}>
      <bridge.FHEIframe />
      {children}
    </FHEBridgeContext.Provider>
  );
}

export function useFHEBridgeContext() {
  const context = useContext(FHEBridgeContext);
  if (!context) {
    throw new Error(
      "useFHEBridgeContext must be used within an FHEBridgeProvider"
    );
  }
  return context;
}
