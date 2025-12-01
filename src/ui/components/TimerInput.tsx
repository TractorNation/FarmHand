import { Button, Stack, Typography } from "@mui/material";
import PlayIcon from "@mui/icons-material/PlayArrowRounded";
import PauseIcon from "@mui/icons-material/PauseRounded";
import ResetIcon from "@mui/icons-material/ReplayRounded";
import useToggle from "../../hooks/useToggle";
import { useEffect, useRef, useState } from "react";
import { parseTime } from "../../utils/GeneralUtils";

/**
 * Props for the timer input
 */
interface TimerInputProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function TimerInput(props: TimerInputProps) {
  const [playing, togglePlaying] = useToggle(false);
  const { value: initialValueString, onChange } = props;
  const initialTimeInTenths = parseTime(initialValueString);
  const [localTime, setLocalTime] = useState(initialTimeInTenths);

  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef(initialTimeInTenths * 100);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!playing) {
      const newTimeInTenths = parseTime(initialValueString);
      setLocalTime(newTimeInTenths);
      pauseTimeRef.current = newTimeInTenths * 100;
    }
  }, [initialValueString, playing]);

  useEffect(() => {
    if (!playing) {
      // Cancel any ongoing animation when stopped
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    // Set the start time based on where we paused
    startTimeRef.current = Date.now() - pauseTimeRef.current;

    // Define animate function inside the effect
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newTime = Math.floor(elapsed / 100);
      setLocalTime(newTime);

      // Continue animation
      requestRef.current = requestAnimationFrame(animate);
    };

    // Start the animation
    requestRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [playing]); // Only depend on 'playing'

  const handlePlayPause = () => {
    if (playing) {
      // Calculate final time when pausing
      const finalTimeMs = Date.now() - startTimeRef.current;
      pauseTimeRef.current = finalTimeMs;
      const finalTimeInTenths = Math.floor(finalTimeMs / 100);

      // Call onChange with the final value
      if (onChangeRef.current) {
        onChangeRef.current(formatTime(finalTimeInTenths));
      }
    }
    togglePlaying();
  };

  const formatTime = (timeInTenths: number) => {
    const totalSeconds = (timeInTenths || 0) / 10;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
    }
    return totalSeconds.toFixed(1);
  };

  const handleReset = () => {
    if (playing) togglePlaying();
    setLocalTime(0);
    pauseTimeRef.current = 0;
    if (onChangeRef.current) {
      onChangeRef.current(formatTime(0));
    }
  };

  return (
    <Stack direction={"column"} spacing={2} alignItems={"center"}>
      <Typography variant="h3" sx={{ minWidth: "180px", textAlign: "center" }}>
        {formatTime(localTime)}
      </Typography>
      <Stack direction={"row"} spacing={2}>
        {playing ? (
          <Button
            variant="outlined"
            color="secondary"
            onClick={handlePlayPause}
          >
            <PauseIcon />
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="secondary"
            onClick={handlePlayPause}
          >
            <PlayIcon />
          </Button>
        )}
        <Button variant="outlined" color="secondary" onClick={handleReset}>
          <ResetIcon />
        </Button>
      </Stack>
    </Stack>
  );
}
