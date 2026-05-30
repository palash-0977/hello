"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import NoInternetScreen from "./components/NoInternetScreen"

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
        }, 2500);
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
      {/* Background Glow */}
      <div className="absolute h-[400px] w-[400px] rounded-full bg-white/5 blur-3xl" />

      <div className="z-10 flex flex-col items-center gap-5 animate-fadeIn">
        <div className="relative h-28 w-28 animate-pulse">
          <Image
            src="/hello_icon.svg"
            alt="Hi Logo"
            fill
            priority
            className="object-contain"
          />
        </div>

        <h1 className="text-5xl font-bold tracking-wide text-white">
          Hello
        </h1>

        <p className="text-sm tracking-[0.3em] text-zinc-500 uppercase">
          Messaging
        </p>

        {/* Loader */}
        <div className="mt-6 flex gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-white" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:0.3s]" />
        </div>
      </div>
    </main>
  );
}