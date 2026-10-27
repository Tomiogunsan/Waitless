export type IAvatarSize = "xs" | "sm" | "md" | "lg";

export type IAvatarProp = {
  /** Initials are taken from this; "Dr." is ignored. */
  name: string;
  size?: IAvatarSize;
  className?: string;
};
