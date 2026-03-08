import {
  type HTMLMotionProps,
  motion,
  useReducedMotion,
  useSpring,
} from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toFixed, toThousand } from "@/utils/number";

type AnimatedNumberProps = {
  value: number;
  disabled?: boolean;
} & HTMLMotionProps<"span">;

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  disabled = false,
  ...restProps
}) => {
  const LARGE_DELTA_NO_ANIMATION = 1000;
  const CROSSFADE_DURATION_MS = 180;
  const previousValueRef = useRef(value);
  const blurTimerRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // 根据传入的 value 自动判断小数位数
  const precision = Math.min((value.toString().split(".")[1] || "").length, 2);

  const springValue = useSpring(previousValueRef.current, {
    stiffness: 220,
    damping: 30,
  });

  const formatValue = (nextValue: number) => {
    const isInteger = Number.isInteger(nextValue);
    if (isInteger) {
      return toThousand(Math.round(nextValue)).toString();
    }
    return toThousand(toFixed(nextValue, precision));
  };

  const [displayValue, setDisplayValue] = useState(formatValue(value));
  const [blurTransitioning, setBlurTransitioning] = useState(false);

  useEffect(() => {
    const delta = Math.abs(value - previousValueRef.current);
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    if (disabled) {
      springValue.set(value);
      setDisplayValue(formatValue(value));
      setBlurTransitioning(false);
      previousValueRef.current = value;
      return;
    }
    // 大幅变更直接显示最终值，避免长时间抖动/闪烁
    if (delta >= LARGE_DELTA_NO_ANIMATION) {
      springValue.set(value);
      setDisplayValue(formatValue(value));
      if (!prefersReducedMotion) {
        setBlurTransitioning(true);
        blurTimerRef.current = window.setTimeout(() => {
          setBlurTransitioning(false);
          blurTimerRef.current = null;
        }, CROSSFADE_DURATION_MS);
      } else {
        setBlurTransitioning(false);
      }
      previousValueRef.current = value;
      return;
    }
    setBlurTransitioning(false);
    springValue.set(value);

    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(formatValue(latest));
    });

    return () => unsubscribe();
  }, [disabled, prefersReducedMotion, springValue, value, precision]);

  useEffect(() => {
    previousValueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  return (
    <motion.span
      animate={
        blurTransitioning && !prefersReducedMotion
          ? {
              opacity: [0.78, 1],
              filter: ["blur(3px)", "blur(0px)"],
              scale: [1.015, 1],
            }
          : {
              opacity: 1,
              filter: "blur(0px)",
              scale: 1,
            }
      }
      transition={{ duration: CROSSFADE_DURATION_MS / 1000, ease: "easeOut" }}
      {...restProps}
    >
      {/* <Money value={springValue.get()} /> */}
      {displayValue}
    </motion.span>
  );
};

export default AnimatedNumber;
