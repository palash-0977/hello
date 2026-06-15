"use client";

import Image from "next/image";
import { WifiOff, RefreshCcw } from "lucide-react";

interface Props {
  onRetry: () => void;
}

export default function NoInternetScreen({ onRetry }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-center">
      {/* Glow */}
      <div className="absolute h-72 w-72 rounded-full bg-white/5 blur-3xl" />

      {/* Logo */}
      <div className="relative mb-6 h-24 w-24 animate-pulse">
        <Image
          src="/kivo_icon.png"
          alt="Kivo Logo"
          fill
          priority
          className="object-contain"
        />
      </div>

      {/* Icon */}
      <div className="mb-5 rounded-full border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
        <WifiOff className="h-10 w-10 text-white" />
      </div>

      {/* Text */}
      <h1 className="mb-2 text-3xl font-bold text-white">
        No Internet
      </h1>

      <p className="max-w-sm text-sm leading-6 text-zinc-400">
        Your connection seems lost. Check your internet and try again.
      </p>

      {/* Button */}
      <button
        onClick={onRetry}
        className="mt-8 flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-105 active:scale-95"
      >
        <RefreshCcw className="h-4 w-4" />
        Try Again
      </button>

      {/* Bottom */}
      <p className="absolute bottom-8 text-xs text-zinc-600">
        Kivo Messaging
      </p>
    </div>
  );
}