import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/** Movement in CSS pixels that cancels a pending long press. */
const MOVE_TOLERANCE = 10;

/** Handlers to spread onto the element that should respond to a long press. */
export interface LongPressHandlers {
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerCancel: (event: ReactPointerEvent) => void;
  onPointerLeave: (event: ReactPointerEvent) => void;
}

/**
 * Fires a callback when the user presses and holds.
 *
 * Uses Pointer Events so mouse, touch, and stylus share one code path. A press that
 * drifts past MOVE_TOLERANCE aborts, so scrolling a list with a finger resting on a
 * card does not fire the long press and enter selection mode; so does a press the
 * browser cancels (an incoming call, a system gesture).
 *
 * @param ms How long to hold before the callback fires
 * @param callback Invoked once per press, with the originating pointer event
 */
export default function useLongPress(
  ms = 500,
  callback: (event: ReactPointerEvent) => void
): LongPressHandlers {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }
    origin.current = null;
  }, []);

  // A press in flight when the component unmounts must not fire afterwards.
  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      // Ignore secondary mouse buttons; a right-click is not a long press.
      if (event.pointerType === "mouse" && event.button !== 0) return;

      cancel();
      origin.current = { x: event.clientX, y: event.clientY };

      // React pools nothing in v17+, but the timer outlives the handler, so keep
      // only what the callback needs rather than the live event object.
      const captured = event;
      timeout.current = setTimeout(() => {
        timeout.current = null;
        callback(captured);
      }, ms);
    },
    [callback, cancel, ms]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (!timeout.current || !origin.current) return;
      const dx = event.clientX - origin.current.x;
      const dy = event.clientY - origin.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE) cancel();
    },
    [cancel]
  );

  return {
    onPointerDown,
    onPointerUp: cancel,
    onPointerMove,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
  };
}
