import { SvgIconComponent } from "@mui/icons-material";
import CircleIcon from "@mui/icons-material/CircleRounded";
import SquareIcon from "@mui/icons-material/SquareRounded";
import TriangleIcon from "@mui/icons-material/ChangeHistoryRounded";
import HexagonIcon from "@mui/icons-material/HexagonRounded";
import StarIcon from "@mui/icons-material/StarRounded";
import CubeIcon from "@mui/icons-material/ViewInArRounded";
import RingIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import DiscIcon from "@mui/icons-material/AlbumRounded";
import BallIcon from "@mui/icons-material/SportsBasketballRounded";
import TargetIcon from "@mui/icons-material/GpsFixedRounded";
import UpIcon from "@mui/icons-material/ArrowUpwardRounded";
import DownIcon from "@mui/icons-material/ArrowDownwardRounded";
import FlagIcon from "@mui/icons-material/FlagRounded";
import ShieldIcon from "@mui/icons-material/ShieldRounded";
import BoltIcon from "@mui/icons-material/BoltRounded";
import WrenchIcon from "@mui/icons-material/BuildRounded";
import ClimbIcon from "@mui/icons-material/StairsRounded";
import CheckIcon from "@mui/icons-material/CheckRounded";
import CrossIcon from "@mui/icons-material/CloseRounded";
import PinIcon from "@mui/icons-material/PushPinRounded";

/**
 * Curated icon set for auto-path game pieces and actions.
 *
 * The **key** is what a schema stores and what travels inside a schema QR code, so
 * keys are stable identifiers and must not be renamed. Adding entries is safe;
 * removing one breaks schemas that reference it (see resolvePathIcon's fallback).
 */
export const PATH_ICON_REGISTRY: Record<
  string,
  { label: string; Icon: SvgIconComponent }
> = {
  circle: { label: "Circle", Icon: CircleIcon },
  square: { label: "Square", Icon: SquareIcon },
  triangle: { label: "Triangle", Icon: TriangleIcon },
  hexagon: { label: "Hexagon", Icon: HexagonIcon },
  star: { label: "Star", Icon: StarIcon },
  cube: { label: "Cube", Icon: CubeIcon },
  ring: { label: "Ring", Icon: RingIcon },
  disc: { label: "Disc", Icon: DiscIcon },
  ball: { label: "Ball", Icon: BallIcon },
  target: { label: "Target", Icon: TargetIcon },
  up: { label: "Arrow up", Icon: UpIcon },
  down: { label: "Arrow down", Icon: DownIcon },
  flag: { label: "Flag", Icon: FlagIcon },
  shield: { label: "Shield", Icon: ShieldIcon },
  bolt: { label: "Bolt", Icon: BoltIcon },
  wrench: { label: "Wrench", Icon: WrenchIcon },
  climb: { label: "Climb", Icon: ClimbIcon },
  check: { label: "Check", Icon: CheckIcon },
  cross: { label: "Cross", Icon: CrossIcon },
  pin: { label: "Pin", Icon: PinIcon },
};

export const PATH_ICON_KEYS = Object.keys(PATH_ICON_REGISTRY);

export const DEFAULT_PATH_ICON = "circle";

/**
 * Resolves an icon key to a component, falling back to the default rather than
 * rendering nothing — a schema imported from another device may name an icon this
 * build does not have.
 */
export function resolvePathIcon(key?: string): SvgIconComponent {
  return (
    PATH_ICON_REGISTRY[key ?? ""]?.Icon ??
    PATH_ICON_REGISTRY[DEFAULT_PATH_ICON].Icon
  );
}
