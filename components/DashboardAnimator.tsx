"use client";

import { useEffect } from "react";
import { gsap } from "gsap";

export default function DashboardAnimator() {
  useEffect(() => {
    gsap.from("[data-widget]", {
      opacity: 0,
      y: 16,
      duration: 0.4,
      stagger: 0.07,
      ease: "power2.out",
      clearProps: "all",
    });
  }, []);
  return null;
}
