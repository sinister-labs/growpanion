"use client";

import { useEffect, useState } from 'react';
import { TELEMETRY_UPDATED_EVENT } from '@/lib/telemetry-events';

export function useTelemetryRefreshToken(): number {
  const [token, setToken] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setToken(current => current + 1);
    };

    window.addEventListener(TELEMETRY_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(TELEMETRY_UPDATED_EVENT, handleUpdate);
  }, []);

  return token;
}
