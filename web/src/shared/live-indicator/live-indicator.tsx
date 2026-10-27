import Badge from "@/shared/badge/badge";
import type { ILiveIndicatorProp } from "./interface";

/** A pulsing dot showing a live (Realtime) connection. */
export default function LiveIndicator({ label = "Live" }: ILiveIndicatorProp) {
  return (
    <Badge tone="success" size="md" dot="pulse">
      {label}
    </Badge>
  );
}
