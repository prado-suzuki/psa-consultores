import { useEffect, useRef, useState, useCallback, type RefObject } from "react";

interface FloatingScrollbarProps {
  targetRef: RefObject<HTMLElement | null>;
  /** Always show when content overflows, regardless of native scrollbar visibility */
  alwaysVisible?: boolean;
}

export function FloatingScrollbar({ targetRef, alwaysVisible = false }: FloatingScrollbarProps) {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [contentWidth, setContentWidth] = useState(0);

  const updateLayout = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const hasOverflow = target.scrollWidth > target.clientWidth + 1;

    // Check if the native scrollbar is in view
    const bottomOfTarget = rect.bottom;
    const viewportHeight = window.innerHeight;
    const nativeScrollbarVisible = bottomOfTarget <= viewportHeight;

    setVisible(hasOverflow && (alwaysVisible || !nativeScrollbarVisible));
    setStyle({ left: rect.left, width: rect.width });
    setContentWidth(target.scrollWidth);
  }, [targetRef, alwaysVisible]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    updateLayout();

    const ro = new ResizeObserver(updateLayout);
    ro.observe(target);

    // Also observe an intersection to detect when native scrollbar enters viewport
    const sentinel = document.createElement("div");
    sentinel.style.height = "1px";
    sentinel.style.width = "100%";
    sentinel.style.pointerEvents = "none";
    target.appendChild(sentinel);

    const io = new IntersectionObserver(
      () => updateLayout(),
      { threshold: 0 }
    );
    io.observe(sentinel);

    window.addEventListener("scroll", updateLayout, { passive: true });
    window.addEventListener("resize", updateLayout, { passive: true });

    return () => {
      ro.disconnect();
      io.disconnect();
      sentinel.remove();
      window.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
    };
  }, [targetRef, updateLayout]);

  // Sync: floating → target
  const handleFloatingScroll = useCallback(() => {
    if (syncing.current) return;
    const target = targetRef.current;
    const bar = scrollbarRef.current;
    if (!target || !bar) return;
    syncing.current = true;
    target.scrollLeft = bar.scrollLeft;
    requestAnimationFrame(() => { syncing.current = false; });
  }, [targetRef]);

  // Sync: target → floating
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const handleTargetScroll = () => {
      if (syncing.current) return;
      const bar = scrollbarRef.current;
      if (!bar) return;
      syncing.current = true;
      bar.scrollLeft = target.scrollLeft;
      requestAnimationFrame(() => { syncing.current = false; });
    };

    target.addEventListener("scroll", handleTargetScroll, { passive: true });
    return () => target.removeEventListener("scroll", handleTargetScroll);
  }, [targetRef]);

  if (!visible) return null;

  return (
    <div
      ref={scrollbarRef}
      onScroll={handleFloatingScroll}
      className="fixed bottom-0 z-50 overflow-x-auto overflow-y-hidden"
      style={{
        left: style.left,
        width: style.width,
        height: 14,
        backgroundColor: "hsl(var(--muted) / 0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        ref={innerRef}
        style={{ width: contentWidth, height: 1 }}
      />
    </div>
  );
}
