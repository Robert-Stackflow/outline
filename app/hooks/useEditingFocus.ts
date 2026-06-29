import { useDocumentContext } from "~/components/DocumentContext";
import useIdle from "./useIdle";

export const editingFocusActivityEvents = [
  "click",
  "mousemove",
  "DOMMouseScroll",
  "mousewheel",
  "wheel",
  "scroll",
  "mousedown",
  "touchstart",
  "touchmove",
  "focus",
];

export default function useEditingFocus() {
  const { editor } = useDocumentContext();
  const isIdle = useIdle(3000, editingFocusActivityEvents);
  return isIdle && !!editor?.view.hasFocus();
}
