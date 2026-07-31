import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoutStepper from "./ScoutStepper";
import { setViewport } from "../../test/viewport";

/**
 * The wizard's only progress indicator, and the only way back to an earlier section.
 *
 * Two behaviours carry real risk: a step past the furthest one visited must not be
 * clickable (jumping ahead skips required fields), and a visited step holding an
 * unsatisfied field must read as an error rather than as complete — a falsely green
 * stepper is how a scout submits a half-filled match.
 */

const steps = [
  { title: "Match Info", hasError: false },
  { title: "Auto", hasError: true },
  { title: "Teleop", hasError: false },
  { title: "Review", hasError: false },
];

describe("full layout", () => {
  it("renders a button per step", () => {
    setViewport("md");
    render(
      <ScoutStepper
        steps={steps}
        activeStep={0}
        maxVisitedStep={0}
        onStepClick={vi.fn()}
      />
    );

    for (const step of steps) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it("disables steps beyond the furthest one visited", () => {
    setViewport("md");
    render(
      <ScoutStepper
        steps={steps}
        activeStep={1}
        maxVisitedStep={1}
        onStepClick={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeEnabled();
    expect(buttons[1]).toBeEnabled();
    // Teleop and Review have not been reached; jumping there would skip Auto.
    expect(buttons[2]).toBeDisabled();
    expect(buttons[3]).toBeDisabled();
  });

  it("calls back with the index of a visited step", async () => {
    setViewport("md");
    const onStepClick = vi.fn();
    render(
      <ScoutStepper
        steps={steps}
        activeStep={2}
        maxVisitedStep={2}
        onStepClick={onStepClick}
      />
    );

    await userEvent.click(screen.getByText("Match Info"));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it("does not call back for a step that has not been reached", async () => {
    setViewport("md");
    const onStepClick = vi.fn();
    render(
      <ScoutStepper
        steps={steps}
        activeStep={0}
        maxVisitedStep={0}
        onStepClick={onStepClick}
      />
    );

    // `pointerEventsCheck: 0` deliberately bypasses the `pointer-events: none` that
    // already stops a real user, so this asserts the stronger property: the handler
    // is not wired either, and the guard does not rest on CSS alone.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByText("Review"));
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it("marks a visited step with an unsatisfied field as an error", () => {
    setViewport("md");
    const { container } = render(
      <ScoutStepper
        steps={steps}
        activeStep={2}
        maxVisitedStep={2}
        onStepClick={vi.fn()}
      />
    );

    // "Auto" is visited and has an error; it must not read as completed.
    expect(container.querySelector(".Mui-error")).toBeInTheDocument();
  });

  it("does not flag an unvisited step as an error before the scout gets there", () => {
    setViewport("md");
    const unreachedError = [
      { title: "Match Info", hasError: false },
      { title: "Auto", hasError: true },
    ];
    const { container } = render(
      <ScoutStepper
        steps={unreachedError}
        activeStep={0}
        maxVisitedStep={0}
        onStepClick={vi.fn()}
      />
    );

    expect(container.querySelector(".Mui-error")).not.toBeInTheDocument();
  });
});

describe("compact layout", () => {
  it("replaces the stepper with a title and progress readout", () => {
    setViewport("xs");
    render(
      <ScoutStepper
        steps={steps}
        activeStep={1}
        maxVisitedStep={1}
        onStepClick={vi.fn()}
      />
    );

    expect(screen.getByText("Auto")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    // The full stepper's per-step buttons are gone at this width.
    expect(screen.queryByText("Teleop")).not.toBeInTheDocument();
  });

  it("reports progress proportional to the active step", () => {
    setViewport("xs");
    render(
      <ScoutStepper
        steps={steps}
        activeStep={1}
        maxVisitedStep={1}
        onStepClick={vi.fn()}
      />
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50"
    );
  });

  it("shows the last step as complete progress", () => {
    setViewport("xs");
    render(
      <ScoutStepper
        steps={steps}
        activeStep={3}
        maxVisitedStep={3}
        onStepClick={vi.fn()}
      />
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
  });
});
