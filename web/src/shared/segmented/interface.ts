export type ISegmentedOption<T extends string | number> = {
  value: T;
  label: string;
  /** Small number shown beside the label, e.g. how many rows match. */
  count?: number;
};

export type ISegmentedProp<T extends string | number> = {
  /** Read by screen readers to name the group, e.g. "Filter by status". */
  label: string;
  value: T;
  options: readonly ISegmentedOption<T>[];
  onChange: (_value: T) => void;
  className?: string;
};
