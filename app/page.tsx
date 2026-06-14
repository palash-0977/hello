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
  <main className="relative flex h-screen items-center justify-center overflow-hidden bg-[#050505]">
    {/* Background */}
    <div className="absolute inset-0">
      <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[140px]" />
      <div className="absolute right-[-10%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-500/20 blur-[140px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_70%)]" />
    </div>

    {/* Grid */}
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />

    {/* Main Card */}
    <div className="relative z-10 flex w-[380px] flex-col items-center rounded-[32px] border border-white/10 bg-white/[0.04] px-10 py-12 backdrop-blur-3xl">
      {/* Logo */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-white/20 blur-2xl" />

        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
          <Image
            src="/hello_icon.svg"
            alt="Hello"
            fill
            priority
            className="object-contain p-5"
          />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-5xl font-bold tracking-tight text-white">
        Hello
      </h1>

      <p className="mt-2 text-sm text-zinc-400">
        Fast • Secure • Connected
      </p>

      {/* Loading Bar */}
      <div className="mt-10 w-full">
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full animate-[loading_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-violet-500" />
        </div>

        <p className="mt-4 text-center text-xs tracking-[0.25em] text-zinc-500">
          INITIALIZING
        </p>
      </div>

      {/* Footer */}
      <div className="mt-10 flex flex-col items-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600">
          Powered By
        </p>

        <p className="mt-2 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-sm font-semibold tracking-[0.3em] text-transparent">
          PROXIMA
        </p>
      </div>
    </div>

    <style jsx>{`
      @keyframes loading {
        0% {
          width: 0%;
        }
        50% {
          width: 75%;
        }
        100% {
          width: 100%;
        }
      }
    `}</style>
  </main>
)
}