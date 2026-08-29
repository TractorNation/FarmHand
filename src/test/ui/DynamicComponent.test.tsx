import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ValidationProvider from "../../context/ValidationContext";
import { setViewport } from "../../test/viewport";

/**
 * The bridge between a schema field and a working input: it picks the widget, decides
 * what an untouched field starts as, registers the field's error with the wizard, and
 * persists changes.
 *
 * Its failure modes are quiet. A wrong empty-state value writes a default the scout
 * never chose; a missed `removeError` leaves the stepper permanently red; a dropped
 * debounce loses the last edit before the QR is built.
 *
 * `useScoutData` is mocked rather than provided for real — the aim here is this
 * component's own logic, not ScoutDataContext's persistence, and the spies make the
 * error lifecycle directly observable.
 */

const scoutData = vi.hoisted(() => ({ current: null as any }));

vi.mock("../../context/ScoutDataContext", () => ({
  useScoutData: () => scoutData.current,
}));

// Imported after the mock so the component picks it up.
const { default: DynamicComponent } = await import(
  "../../ui/components/DynamicComponent"
);

function makeScoutData(over: Record<string, any> = {}) {
  return {
    addMatchData: vi.fn(),
    addError: vi.fn(),
    removeError: vi.fn(),
    getMatchData: vi.fn(async () => undefined),
    getAllMatchNumbers: () => [],
    getAllTeamNumbers: () => [],
    tbaMatchData: null,
    setWatchedMatchNumber: vi.fn(),
    setWatchedAlliance: vi.fn(),
    setWatchedPosition: vi.fn(),
    getTeamForCurrentSlot: () => null,
    ...over,
  };
}

const field = (over: Partial<Component>): Component =>
  ({
    id: 1,
    name: "Field",
    type: "text",
    required: false,
    ...over,
  } as Component);

function renderField(component: Component, submitted = false) {
  return render(
    <ValidationProvider>
      <DynamicComponent component={component} submitted={submitted} />
    </ValidationProvider>
  );
}

/**
 * Renders and waits for the field to reach its settled value.
 *
 * The input does not go straight from skeleton to its real value: when the async read
 * finishes it commits once with `value` still null, and only the following effect
 * applies the stored value or the default. Assertions made before that second commit
 * see the null placeholder — which happens to match the expected value for most of
 * the empty-state cases, so they would pass without proving anything.
 */
async function renderSettled(component: Component, submitted = false) {
  const result = renderField(component, submitted);
  await act(async () => {});
  return result;
}

beforeEach(() => {
  setViewport("md");
  scoutData.current = makeScoutData();
});

describe("widget dispatch", () => {
  it("renders a text field for a text component", async () => {
    renderField(field({ type: "text", name: "Comments" }));
    expect(await screen.findByRole("textbox")).toBeInTheDocument();
  });

  it("renders a toggle button for a checkbox component", async () => {
    // Not an <input type="checkbox">: this renders a Button whose icon carries the
    // state, so it has role "button" and no checked property.
    renderField(field({ type: "checkbox", name: "Climbed" }));
    expect(await screen.findByRole("button")).toBeInTheDocument();
  });

  it("renders a select for a dropdown component", async () => {
    renderField(
      field({
        type: "dropdown",
        name: "Position",
        props: { options: ["1", "2"] },
      })
    );
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
  });

  it("renders radio buttons for a multiple choice component", async () => {
    renderField(
      field({
        type: "multiplechoice",
        name: "Auto",
        props: { options: ["A", "B"] },
      })
    );
    expect(await screen.findAllByRole("radio")).toHaveLength(2);
  });

  it("renders nothing for a filler, which is a layout spacer", async () => {
    const { container } = renderField(
      field({ type: "filler", name: "Spacer" })
    );
    await waitFor(() => {
      expect(
        container.querySelector(".MuiSkeleton-root")
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("reports an unknown type rather than rendering nothing silently", async () => {
    // A schema written by a newer build can name a type this one does not have.
    renderField(field({ type: "somethingNew" as any, name: "Future" }));
    expect(
      await screen.findByText(/unknown component type/i)
    ).toBeInTheDocument();
  });
});

describe("empty-state defaults", () => {
  it("starts a text field blank", async () => {
    await renderSettled(field({ type: "text" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("starts a checkbox in the false state", async () => {
    // The toggle shows its state through the Button variant it is given:
    // `variant={value ? "contained" : "outlined"}`.
    await renderSettled(field({ type: "checkbox" }));
    expect(screen.getByRole("button")).toHaveClass("MuiButton-outlined");
  });

  it("starts a timer at 0.0", async () => {
    await renderSettled(field({ type: "timer" }));
    expect(screen.getByText("0.0")).toBeInTheDocument();
  });

  it("honours an explicit default over the built-in empty state", async () => {
    // `default` is typed number | boolean | number[]; the schema editor only ever
    // writes numeric defaults, so a counter is the honest way to exercise this.
    await renderSettled(
      field({ type: "counter", props: { default: 5, min: 0, max: 10 } })
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("starts a counter at zero with no default", async () => {
    await renderSettled(field({ type: "counter", props: { min: 0, max: 10 } }));
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("honours a checkbox default of true", async () => {
    await renderSettled(field({ type: "checkbox", props: { default: true } }));
    expect(screen.getByRole("button")).toHaveClass("MuiButton-contained");
  });

  it("prefers a stored value over any default", async () => {
    // Returning to a partly-filled match must show what the scout already entered.
    scoutData.current = makeScoutData({
      getMatchData: vi.fn(async () => "stored answer"),
    });
    await renderSettled(field({ type: "text" }));

    expect(screen.getByRole("textbox")).toHaveValue("stored answer");
  });

  it("prefers a stored false over a default of true", async () => {
    // The subtle half: `false` is a real stored answer, not an absent one, so it must
    // win over the default rather than being treated as empty. Only meaningful once
    // settled: `outlined` is also what the pre-settle null render shows, so asserting
    // it early would pass even if the default had won.
    scoutData.current = makeScoutData({
      getMatchData: vi.fn(async () => false),
    });
    await renderSettled(field({ type: "checkbox", props: { default: true } }));

    expect(screen.getByRole("button")).toHaveClass("MuiButton-outlined");
  });

  it("builds a grid default with the colon and the field's real dimensions", async () => {
    // Guards a fixed bug: without the colon parseGridData returns null, and the
    // analysis code silently lost the grid's dimensions. Observed through validation
    // — a required grid whose default is empty must register as unanswered.
    const required = field({
      type: "grid",
      required: true,
      props: { rows: 2, cols: 4 },
    });
    renderField(required);

    await waitFor(() => {
      expect(scoutData.current.addError).toHaveBeenCalledWith(1, "Field");
    });
  });

  it("treats a stored grid with a checked cell as answered", async () => {
    scoutData.current = makeScoutData({
      getMatchData: vi.fn(async () => "2x2:[1]"),
    });
    renderField(
      field({ type: "grid", required: true, props: { rows: 2, cols: 2 } })
    );

    await waitFor(() => {
      expect(scoutData.current.getMatchData).toHaveBeenCalled();
    });
    expect(scoutData.current.addError).not.toHaveBeenCalled();
  });
});

describe("error lifecycle", () => {
  it("registers a required empty field on mount", async () => {
    renderField(field({ type: "text", required: true, name: "Comments" }));

    await waitFor(() => {
      expect(scoutData.current.addError).toHaveBeenCalledWith(1, "Comments");
    });
  });

  it("does not register an optional empty field", async () => {
    renderField(field({ type: "text", required: false }));

    await waitFor(() => {
      expect(scoutData.current.getMatchData).toHaveBeenCalled();
    });
    expect(scoutData.current.addError).not.toHaveBeenCalled();
  });

  it("does not register a required field that already has a stored value", async () => {
    scoutData.current = makeScoutData({
      getMatchData: vi.fn(async () => "answered"),
    });
    renderField(field({ type: "text", required: true }));

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveValue("answered");
    });
    expect(scoutData.current.addError).not.toHaveBeenCalled();
  });

  it("withdraws the error when the field unmounts", async () => {
    // Scout keeps every section mounted precisely because unmounting withdraws the
    // registration; this is the behaviour that makes that necessary.
    const { unmount } = renderField(field({ type: "text", required: true }));

    await waitFor(() => {
      expect(scoutData.current.addError).toHaveBeenCalled();
    });

    unmount();
    expect(scoutData.current.removeError).toHaveBeenCalledWith(1);
  });

  it("clears the error once the scout answers", async () => {
    renderField(field({ type: "text", required: true }));
    const input = await screen.findByRole("textbox");

    await userEvent.type(input, "a");

    await waitFor(() => {
      expect(scoutData.current.removeError).toHaveBeenCalledWith(1);
    });
  });

  it("re-registers the error when the answer is cleared again", async () => {
    scoutData.current = makeScoutData({
      getMatchData: vi.fn(async () => "answered"),
    });
    renderField(field({ type: "text", required: true, name: "Comments" }));

    const input = await screen.findByRole("textbox");
    await userEvent.clear(input);

    await waitFor(() => {
      expect(scoutData.current.addError).toHaveBeenCalledWith(1, "Comments");
    });
  });
});

describe("persistence", () => {
  /**
   * Real timers throughout. Fake timers deadlock here: `findBy*` and `waitFor` poll
   * on the very timers being faked, and a test that times out never runs its cleanup,
   * leaving the clock faked for every test after it.
   */
  const DEBOUNCE_MS = 300;

  it("coalesces a burst of keystrokes into a single write", async () => {
    // The point of the 300 ms debounce: three characters, one store write, carrying
    // the final value rather than an intermediate one.
    renderField(field({ type: "text" }));

    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "abc");

    await waitFor(() => {
      expect(scoutData.current.addMatchData).toHaveBeenCalledWith(1, "abc");
    });
    expect(scoutData.current.addMatchData).toHaveBeenCalledTimes(1);
  });

  it("does not write after the field unmounts mid-debounce", async () => {
    // Leaving the page inside the debounce window must not fire a store write
    // against a component that no longer exists.
    const { unmount } = renderField(field({ type: "text" }));

    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "abc");
    unmount();

    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS * 2));
    expect(scoutData.current.addMatchData).not.toHaveBeenCalled();
  });
});

describe("TBA-backed fields", () => {
  const tba = { matchNumbers: ["Qual-1", "Qual-2"], allTeamNumbers: ["254"] };

  it("renders an autocomplete for Match Number when pullFromTBA is set", async () => {
    // The override is checked ahead of the type switch, so a `number` field still
    // becomes an autocomplete.
    scoutData.current = makeScoutData({
      tbaMatchData: tba,
      getAllMatchNumbers: () => tba.matchNumbers,
    });
    renderField(
      field({
        type: "number",
        name: "Match Number",
        props: { pullFromTBA: true },
      })
    );

    const input = await screen.findByRole("combobox");
    await userEvent.click(input);
    expect(await screen.findByText("Qual-2")).toBeInTheDocument();
  });

  it("renders the ordinary input when pullFromTBA is not set", async () => {
    scoutData.current = makeScoutData({ tbaMatchData: tba });
    renderField(field({ type: "number", name: "Match Number" }));

    await waitFor(() => {
      expect(scoutData.current.getMatchData).toHaveBeenCalled();
    });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("does not apply the override to an ordinary field name", async () => {
    scoutData.current = makeScoutData({ tbaMatchData: tba });
    renderField(
      field({ type: "text", name: "Comments", props: { pullFromTBA: true } })
    );

    expect(await screen.findByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("auto-populates Team Number from the current match slot", async () => {
    scoutData.current = makeScoutData({
      tbaMatchData: tba,
      getAllTeamNumbers: () => tba.allTeamNumbers,
      getTeamForCurrentSlot: () => "254",
    });
    renderField(
      field({
        type: "number",
        name: "Team Number",
        props: { pullFromTBA: true },
      })
    );

    await waitFor(() => {
      expect(scoutData.current.addMatchData).toHaveBeenCalledWith(1, "254");
    });
  });

  it("locks Team Number while the slot determines it", async () => {
    // Editable would let a scout silently disagree with the schedule.
    scoutData.current = makeScoutData({
      tbaMatchData: tba,
      getAllTeamNumbers: () => tba.allTeamNumbers,
      getTeamForCurrentSlot: () => "254",
    });
    renderField(
      field({
        type: "number",
        name: "Team Number",
        props: { pullFromTBA: true },
      })
    );

    expect(await screen.findByRole("combobox")).toBeDisabled();
  });

  it("leaves Team Number editable when no slot is resolved", async () => {
    scoutData.current = makeScoutData({
      tbaMatchData: tba,
      getAllTeamNumbers: () => tba.allTeamNumbers,
      getTeamForCurrentSlot: () => null,
    });
    renderField(
      field({
        type: "number",
        name: "Team Number",
        props: { pullFromTBA: true },
      })
    );

    expect(await screen.findByRole("combobox")).toBeEnabled();
  });

  it("does not overwrite an auto-populated team with a null stored value", async () => {
    // The documented race: Team Number's stored-value fetch can resolve *after* the
    // slot auto-populate has already written the right team. Writing null here would
    // clear it, and the populate effect would not fire again to recover.
    scoutData.current = makeScoutData({
      tbaMatchData: tba,
      getAllTeamNumbers: () => tba.allTeamNumbers,
      getMatchData: vi.fn(async () => null),
      getTeamForCurrentSlot: () => "254",
    });
    renderField(
      field({
        type: "number",
        name: "Team Number",
        props: { pullFromTBA: true },
      })
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveValue("254");
    });
  });
});

describe("watched slot fields", () => {
  it("publishes Match Number changes so Team Number can resolve", async () => {
    renderField(field({ type: "text", name: "Match Number" }));

    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "7");

    expect(scoutData.current.setWatchedMatchNumber).toHaveBeenCalledWith("7");
  });

  it("publishes an unset dropdown as null rather than as the sentinel", async () => {
    // "Select an option..." is a real stored string; leaking it would have
    // getTeamForCurrentSlot look up a slot named after the placeholder.
    renderField(
      field({
        type: "dropdown",
        name: "Alliance",
        props: { options: ["Red", "Blue"] },
      })
    );

    await waitFor(() => {
      expect(scoutData.current.setWatchedAlliance).toHaveBeenCalledWith(null);
    });
  });
});

describe("accessible names", () => {
  /**
   * Only `text` and `number` used to receive a name. Dropdowns and radio groups were
   * given `props.label`, which five of the six built-in schemas never set, so most of
   * a real scouting form announced as unlabelled controls.
   */
  it("names a text field after the field", async () => {
    renderField(field({ type: "text", name: "Comments" }));
    expect(await screen.findByLabelText("Comments")).toBeInTheDocument();
  });

  it("names a number field after the field", async () => {
    renderField(field({ type: "number", name: "Auto Points" }));
    expect(await screen.findByLabelText("Auto Points")).toBeInTheDocument();
  });

  it("names a dropdown after the field", async () => {
    renderField(
      field({
        type: "dropdown",
        name: "Climb",
        props: { options: ["Yes", "No"] },
      })
    );
    expect(await screen.findByLabelText("Climb")).toBeInTheDocument();
  });

  it("names a checkbox toggle after the field", async () => {
    renderField(field({ type: "checkbox", name: "Broke Down" }));
    expect(await screen.findByLabelText("Broke Down")).toBeInTheDocument();
  });

  it("prefers a schema-authored label over the field name", async () => {
    renderField(
      field({ type: "text", name: "Comments", props: { label: "Notes" } })
    );
    expect(await screen.findByLabelText("Notes")).toBeInTheDocument();
  });

  it("exposes checkbox state through aria-pressed", async () => {
    // The icon is the only visual cue; without this a screen-reader user cannot tell
    // whether the answer is yes or no.
    renderField(field({ type: "checkbox", name: "Climbed" }));

    const toggle = await screen.findByRole("button", { name: "Climbed" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("gives the counter's icon-only buttons distinct names", async () => {
    // Two unnamed icon buttons either side of a number are indistinguishable.
    renderField(
      field({ type: "counter", name: "Points", props: { min: 0, max: 9 } })
    );

    expect(
      await screen.findByRole("button", { name: "Increase" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Decrease" })
    ).toBeInTheDocument();
  });

  it("gives the timer's icon-only buttons action names", async () => {
    renderField(field({ type: "timer", name: "Cycle" }));

    expect(
      await screen.findByRole("button", { name: "Start timer" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset timer" })
    ).toBeInTheDocument();
  });
});

describe("load states", () => {
  it("shows a skeleton while the stored value is being read", () => {
    scoutData.current = makeScoutData({
      getMatchData: vi.fn(() => new Promise(() => {})),
    });
    const { container } = renderField(field({ type: "text" }));

    expect(container.querySelector(".MuiSkeleton-root")).toBeInTheDocument();
  });

  it("reports a read failure instead of rendering an empty input", async () => {
    // The component logs the failure; silence it so a real failure stays readable.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      scoutData.current = makeScoutData({
        getMatchData: vi.fn(async () => {
          throw new Error("store unavailable");
        }),
      });
      renderField(field({ type: "text" }));

      expect(
        await screen.findByText(/error loading data/i)
      ).toBeInTheDocument();
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });
});
