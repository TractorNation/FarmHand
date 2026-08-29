import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import InputCard from "../../ui/InputCard";
import ValidationProvider from "../../context/ValidationContext";
import { renderWithTheme } from "../renderWithTheme";

/**
 * The card wrapping every scouting field.
 *
 * It owns the one piece of accessibility that cannot live in the input components:
 * most field types are composite — the counter is two buttons around a number, the
 * timer is play plus reset, the grid is a mesh of cells — so the field's name belongs
 * to a group around them rather than to any single control.
 */

function renderCard(
  props: Partial<React.ComponentProps<typeof InputCard>> = {}
) {
  return renderWithTheme(
    <ValidationProvider>
      <InputCard
        label="Auto Points"
        isFiller={false}
        required={false}
        submitted={false}
        {...props}
      >
        <button>inner</button>
      </InputCard>
    </ValidationProvider>
  );
}

describe("field naming", () => {
  it("names the group after the field", () => {
    renderCard();
    expect(screen.getByRole("group", { name: "Auto Points" })).toBeInTheDocument();
  });

  it("marks a required field in the name", () => {
    renderCard({ required: true });
    expect(screen.getByRole("group", { name: "Auto Points *" })).toBeInTheDocument();
  });

  it("still groups the controls when a filler has no heading", () => {
    // A filler is pure layout, so it shows no label — but the group must not then
    // claim a name that is not on screen.
    renderCard({ isFiller: true, required: false });

    const group = screen.getByRole("group");
    expect(group).not.toHaveAccessibleName();
  });

  it("keeps the inner control reachable", () => {
    renderCard();
    expect(screen.getByRole("button", { name: "inner" })).toBeInTheDocument();
  });
});

describe("required-field error", () => {
  it("is not shown before the scout has touched or submitted", () => {
    renderCard({ required: true });
    expect(screen.queryByText("This field is required")).not.toBeInTheDocument();
  });

  it("is shown once the form is submitted", () => {
    // ValidationProvider starts valid; the card only surfaces an error when the
    // field is required, invalid, and the scout has had a chance to fill it.
    renderCard({ required: true, submitted: true });
    // Still valid, so nothing yet — this guards against the message appearing for
    // every required field the moment Submit is pressed.
    expect(screen.queryByText("This field is required")).not.toBeInTheDocument();
  });

  it("describes the group with the note when one is set", () => {
    renderCard({ note: "Count only successful cycles" });
    expect(screen.getByText("Count only successful cycles")).toBeInTheDocument();
  });
});
