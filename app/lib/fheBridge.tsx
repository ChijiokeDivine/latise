// fheBridge.tsx - Localized, safe hook implementation
"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export function useFHEBridge() {
  const [isReady, setIsReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Scoping counters and maps to the local instance lifecycle
  const requestIdCounter = useRef(0);
  const pendingRequests = useRef(new Map<string, PendingRequest>());
  const activeListeners = useRef(new Map<string, (event: MessageEvent) => void>());

  const generateRequestId = useCallback(() => {
    return `${Date.now()}-${requestIdCounter.current++}`;
  }, []);

  // Main listener for messages originating from the isolated iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    const { requestId, type, ...data } = event.data || {};
    if (!requestId) return;

    // Execute intermediate submission hooks (e.g., getting a txHash)
    const customListener = activeListeners.current.get(`${requestId}-${type}`);
    if (customListener) {
      customListener(event);
    }

    // Process ultimate finalization promises
    const pending = pendingRequests.current.get(requestId);
    if (!pending) return;

    if (type === "unshield_success" || type === "confidential_balance_response") {
      pending.resolve(data);
      pendingRequests.current.delete(requestId);
    } else if (type === "unshield_error") {
      pending.reject(data.error || "An unknown error occurred inside FHE bridge.");
      pendingRequests.current.delete(requestId);
    }
  }, []);

  // Hook global browser event pipeline
  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const onIframeLoad = useCallback(() => {
    setIsReady(true);
  }, []);

  // Base message transmitter 
  const sendRequest = useCallback((type: string, params: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!iframeRef.current?.contentWindow) {
        return reject(new Error("FHE Bridge iframe not ready or missing from layout"));
      }

      const requestId = generateRequestId();
      pendingRequests.current.set(requestId, { resolve, reject });

      iframeRef.current.contentWindow.postMessage(
        { type, requestId, params },
        window.location.origin
      );
    });
  }, [generateRequestId]);

  // Public Methods
  const getConfidentialBalance = useCallback(
    (tokenAddress: `0x${string}`) => {
      return sendRequest("getConfidentialBalance", { tokenAddress });
    },
    [sendRequest]
  );

  const unshield = useCallback(
    (params: {
      tokenAddress: `0x${string}`;
      amount: bigint;
      onUnwrapSubmitted?: (txHash: `0x${string}`) => void;
    }) => {
      return new Promise((resolve, reject) => {
        if (!iframeRef.current?.contentWindow) {
          return reject(new Error("FHE Bridge iframe not ready or missing from layout"));
        }

        const requestId = generateRequestId();
        pendingRequests.current.set(requestId, { resolve, reject });

        if (params.onUnwrapSubmitted) {
          const listenerKey = `${requestId}-unshield_submitted`;
          const submittedListener = (event: MessageEvent) => {
            if (event.data?.txHash) {
              params.onUnwrapSubmitted?.(event.data.txHash);
            }
            activeListeners.current.delete(listenerKey);
          };
          activeListeners.current.set(listenerKey, submittedListener);
        }

        iframeRef.current.contentWindow.postMessage(
          {
            type: "unshield",
            requestId,
            params: {
              tokenAddress: params.tokenAddress,
              amount: params.amount.toString(),
            },
          },
          window.location.origin
        );
      });
    },
    [generateRequestId]
  );

  // Hidden bridge injector component
  const FHEIframe = useCallback(() => {
    return (
      <iframe
        ref={iframeRef}
        src="/fhe-bridge"
        allow="cross-origin-isolated"
        onLoad={onIframeLoad}
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          width: "1px",
          height: "1px",
          border: "none",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      />
    );
  }, [onIframeLoad]);

  return {
    isReady,
    getConfidentialBalance,
    unshield,
    FHEIframe,
  };
}