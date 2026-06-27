// Based on https://github.com/rehooks/window-scroll-position which is no longer
// maintained.
import { throttle } from "es-toolkit/compat";
import { useState, useEffect } from "react";
import { supportsPassiveListener } from "@shared/utils/browser";
import { useScrollContext } from "~/components/ScrollContext";

const defaultOptions = {
  throttle: 100,
};

/**
 * Hook to track the scroll position of the nearest scroll container (provided
 * via ScrollContext), falling back to the window when none is available.
 *
 * @param options Configuration options
 * @param options.throttle Time in milliseconds to throttle the scroll event
 * @returns Object containing the current scroll position (x, y coordinates)
 */
export default function useWindowScrollPosition(options: {
  throttle: number;
}): {
  x: number;
  y: number;
} {
  const opts = Object.assign({}, defaultOptions, options);
  const scrollRef = useScrollContext();

  const getPosition = () => {
    const el = scrollRef?.current;
    if (el) {
      return { x: el.scrollLeft, y: el.scrollTop };
    }
    return { x: window.pageXOffset, y: window.pageYOffset };
  };

  const [position, setPosition] = useState(getPosition());

  useEffect(() => {
    const target: HTMLElement | Window = scrollRef?.current ?? window;
    const handleScroll = throttle(() => {
      setPosition(getPosition());
    }, opts.throttle);

    // Sync once on mount in case the container scrolled before this ran.
    handleScroll();

    target.addEventListener(
      "scroll",
      handleScroll,
      supportsPassiveListener ? { passive: true } : false
    );
    return () => {
      handleScroll.cancel();
      target.removeEventListener("scroll", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.throttle, scrollRef]);

  return position;
}
