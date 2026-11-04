"use client";

import { createContext, useContext } from "react";

/**
 * The phone-frame element. Sheets and overlays portal into it so on desktop
 * they stay inside the phone instead of covering the whole browser window.
 */
export const FrameContext = createContext<HTMLElement | null>(null);
export const useFrame = () => useContext(FrameContext);
