export const DEFAULT_COURSE_IMAGE_RATIO = 16 / 9;
export const COURSE_IMAGE_RATIO_HELPER_TEXT =
  "Proporcao de 16:9 recomendada. 3:2 tambem e aceita.";

const COURSE_IMAGE_RATIO_TOLERANCE = 0.03;
const COURSE_IMAGE_RATIO_RULES = [
  {
    label: "16:9",
    ratio: 16 / 9,
    recommended: true,
  },
  {
    label: "3:2",
    ratio: 3 / 2,
    recommended: false,
  },
] as const;

export type CourseImageRatioMeta = {
  width: number;
  height: number;
  ratio: number;
  matchedRatioLabel: string | null;
  isAccepted: boolean;
  isRecommended: boolean;
};

export const getCourseImageRatioMeta = (
  width: number,
  height: number,
): CourseImageRatioMeta => {
  const ratio = width / height;
  const matchedRatio = COURSE_IMAGE_RATIO_RULES.find(
    (rule) => Math.abs(ratio - rule.ratio) <= COURSE_IMAGE_RATIO_TOLERANCE,
  );

  return {
    width,
    height,
    ratio,
    matchedRatioLabel: matchedRatio?.label ?? null,
    isAccepted: Boolean(matchedRatio),
    isRecommended: matchedRatio?.recommended ?? false,
  };
};
