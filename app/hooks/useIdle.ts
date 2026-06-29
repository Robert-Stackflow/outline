import { throttle } from "es-toolkit/compat";
import { useState, useRef, useCallback, useEffect } from "react";
import { Minute } from "@shared/utils/time";
import { useScrollContext } from "~/components/ScrollContext";
import useIsMounted from "./useIsMounted";

const activityEvents = [
  "click",
  "mousemove",
  "keydown",
  "DOMMouseScroll",
  "mousewheel",
  "wheel",
  "scroll",
  "mousedown",
  "touchstart",
  "touchmove",
  "focus",
];

/**
 * Hook to detect user idle state.
 *
 * @param timeToIdle The time in ms until idle
 * @param events The events to listen to
 * @returns boolean if the user is idle
 */
export default function useIdle(
  timeToIdle: number = 3 * Minute.ms,
  events = activityEvents
) {
  const isMounted = useIsMounted();
  const scrollContainerRef = useScrollContext();
  const [isIdle, setIsIdle] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const onActivity = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }

    timeout.current = setTimeout(() => {
      if (isMounted()) {
        setIsIdle(true);
      }
    }, timeToIdle);
  }, [isMounted, timeToIdle]);

  useEffect(() => {
    const handleUserActivityEvent = throttle(() => {
      if (isMounted()) {
        setIsIdle(false);
        onActivity();
      }
    }, 1000);

    const targets: EventTarget[] = [window];
    const scrollContainer = scrollContainerRef?.current;
    if (scrollContainer) {
      targets.push(scrollContainer);
    }

    targets.forEach((target) => {
      events.forEach((eventName) =>
        target.addEventListener(eventName, handleUserActivityEvent)
      );
    });

    return () => {
      targets.forEach((target) => {
        events.forEach((eventName) =>
          target.removeEventListener(eventName, handleUserActivityEvent)
        );
      });
      handleUserActivityEvent.cancel();
    };
  }, [events, isMounted, onActivity, scrollContainerRef]);

  return isIdle;
}
