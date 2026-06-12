"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const ROUTES = [
  "/",
  "/messages",
  "/status",
  "/search",
  "/profile",
];

export default function SwipeNavigation({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const MIN_SWIPE_DISTANCE = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;

    const distance = touchStart - touchEnd;

    const currentIndex = ROUTES.indexOf(pathname);

    if (currentIndex === -1) return;

    if (distance > MIN_SWIPE_DISTANCE) {
      const nextRoute = ROUTES[currentIndex + 1];
      if (nextRoute) router.push(nextRoute);
    }

    if (distance < -MIN_SWIPE_DISTANCE) {
      const prevRoute = ROUTES[currentIndex - 1];
      if (prevRoute) router.push(prevRoute);
    }
  };

  return (
    <div
      className="flex-1"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}