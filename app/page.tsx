"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import NoInternetScreen from "./components/NoInternetScreen";

const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 13) % 100}%`,
  top: `${(i * 17) % 100}%`,
  delay: `${(i * 0.15) % 3}s`,
}));

export default function Home() {
  const router = useRouter();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => {
      setOnline(navigator.onLine);
    };

    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    if (!online) return;

    const checkUser = async () => {
      try {
        const res = await fetch("/api/auth/check");
        const data = await res.json();

        setTimeout(() => {
          if (data.user) {
            router.replace("/messages");
          } else {
            router.replace("/auth/login");
          }
        }, 3000);
      } catch (err) {
        console.error(err);
      }
    };

    checkUser();
  }, [online, router]);

  if (!online) {
    return (
      <NoInternetScreen
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-900" />

      {/* Main Glow */}
      <div className="absolute h-[700px] w-[700px] rounded-full bg-white/[0.03] blur-3xl animate-pulse" />

      {/* Floating Blobs */}
      <div className="absolute left-20 top-20 h-32 w-32 rounded-full bg-white/[0.04] blur-2xl animate-bounce" />

      <div
        className="absolute right-20 bottom-20 h-40 w-40 rounded-full bg-white/[0.03] blur-3xl animate-bounce"
        style={{ animationDelay: "1s" }}
      />

      <div
        className="absolute left-1/3 bottom-10 h-20 w-20 rounded-full bg-white/[0.05] blur-xl animate-bounce"
        style={{ animationDelay: "2s" }}
      />

      {/* Stars */}
      {STARS.map((star, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/40 animate-pulse"
          style={{
            left: star.left,
            top: star.top,
            animationDelay: star.delay,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute h-40 w-40 rounded-full border border-white/10 animate-spin [animation-duration:8s]" />

          <div className="absolute h-32 w-32 rounded-full border border-white/5 animate-spin [animation-direction:reverse] [animation-duration:5s]" />

          <div className="absolute h-28 w-28 rounded-full bg-white/10 blur-2xl animate-pulse" />

          <div className="relative h-28 w-28 animate-[float_4s_ease-in-out_infinite]">
            <Image
              src="/hello_icon.svg"
              alt="Hello Logo"
              fill
              priority
              className="object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.35)]"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-6xl font-extrabold tracking-wide text-transparent">
          Hello
        </h1>

        <p className="mt-2 text-xs uppercase tracking-[0.6em] text-zinc-500">
          Messaging Platform
        </p>

        {/* Loader */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-white animate-bounce" />
            <span
              className="h-3 w-3 rounded-full bg-white animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="h-3 w-3 rounded-full bg-white animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </div>

          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
            Loading...
          </p>
        </div>

        {/* Footer */}
        <div className="absolute -bottom-32 flex flex-col items-center">
          <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-600">
            Powered By
          </p>

          <p className="mt-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-sm font-semibold tracking-[0.4em] text-transparent">
            PROXIMA
          </p>

          <p className="mt-2 text-[10px] text-zinc-700">
            Version 1.0.0
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }
      `}</style>
    </main>
  );
}