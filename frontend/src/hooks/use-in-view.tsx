import { useEffect, useRef, useState } from "react";

const defaultObserverOpts: IntersectionObserverInit = {
  threshold: 0.08,
  rootMargin: "0px 0px -5% 0px",
};

/** Sets `inView` when the element crosses the viewport (for scroll-triggered animations). */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setInView(true);
    }, defaultObserverOpts);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
