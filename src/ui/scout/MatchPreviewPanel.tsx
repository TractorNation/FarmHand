import { Alert, AlertTitle, Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
  DecodedQr,
  SchemaRequiredError,
  decodeQrWithSchemas,
  getSchemaHashFromQrString,
} from "../../utils/QrUtils";
import { getSchemaFromHash } from "../../utils/SchemaUtils";
import { matchDataJsonToMap } from "../../utils/schemaFields";
import { reconstructMatchDataFromArray } from "../../utils/QrUtils";
import { useSchema } from "../../context/SchemaContext";
import MatchDataReview from "./MatchDataReview";

interface MatchPreviewPanelProps {
  qrCode: QrCode;
}

type State =
  | { kind: "loading" }
  | { kind: "missing-schema"; hash: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; schema: Schema; values: Map<number, any>; decoded: DecodedQr };

/**
 * Shows the match data inside a saved QR code, so a scout can verify a match before
 * trusting it.
 */
export default function MatchPreviewPanel({ qrCode }: MatchPreviewPanelProps) {
  const { availableSchemas } = useSchema();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });

    (async () => {
      try {
        const hash = getSchemaHashFromQrString(qrCode.data);
        if (!hash) throw new Error("This file does not contain a FarmHand QR code.");

        const schema = await getSchemaFromHash(hash, availableSchemas);
        if (!schema) {
          if (!cancelled) setState({ kind: "missing-schema", hash });
          return;
        }

        const decoded = await decodeQrWithSchemas(qrCode.data, availableSchemas);
        const values = matchDataJsonToMap(
          reconstructMatchDataFromArray(schema, decoded.data)
        );
        if (!cancelled) setState({ kind: "ready", schema, values, decoded });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof SchemaRequiredError) {
          setState({ kind: "missing-schema", hash: error.schemaHash });
          return;
        }
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [qrCode.data, availableSchemas]);

  if (state.kind === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (state.kind === "missing-schema") {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 600 }}>Schema not on this device</AlertTitle>
        This match was recorded with schema <code>{state.hash}</code>, which isn't
        available here. Import that schema's QR code and reopen this preview.
      </Alert>
    );
  }

  if (state.kind === "error") {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 600 }}>Could not read this code</AlertTitle>
        {state.message}
      </Alert>
    );
  }

  return (
    <Box>
      {!state.decoded.checksumOk && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          This code failed its checksum, so its contents can't be trusted. Re-scout
          this match if you can.
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        Device {state.decoded.deviceId} · schema {state.decoded.schemaHash}
      </Typography>
      <MatchDataReview schema={state.schema} values={state.values} />
    </Box>
  );
}
