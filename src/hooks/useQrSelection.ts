import { useEffect, useMemo, useState } from "react";
import useToggle from "../hooks/useToggle";
import { getSchemaHashFromQrString } from "../utils/QrUtils";

export function useQrSelection(qrCodes?: QrCode[]) {
  const [selecting, switchSelecting] = useToggle(false);
  const [selectedCodes, setSelectedCodes] = useState<QrCode[]>([]);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [validQrCodes, setValidQrCodes] = useState<QrCode[]>([]);
  const [invalidQrCodes, setInvalidQrCodes] = useState<QrCode[]>([]);

  const codeIsSelected = (code: QrCode) => selectedCodes.includes(code);

  const toggleSelecting = () => {
    switchSelecting();
    setSelectedCodes([]);
  };
  useEffect(() => {
    if (!qrCodes) return;

    if (!selecting || !selectedHash) {
      setValidQrCodes(qrCodes);
      setInvalidQrCodes([]);
      return;
    }

    const valid: QrCode[] = [];
    const invalid: QrCode[] = [];
    qrCodes.forEach((code) => {
      // Parsed rather than split(":") so v1 and v2 codes for the same schema
      // compare equal — v2 uppercases the hash on the wire.
      const hash = getSchemaHashFromQrString(code.data);
      (hash === selectedHash ? valid : invalid).push(code);
    });

    setValidQrCodes(valid);
    setInvalidQrCodes(invalid);
  }, [qrCodes, selecting, selectedHash]);

  const updateSelectedCodes = (code: QrCode) => {
    setSelectedCodes((prev) => {
      const isSelected = prev.includes(code);
      const newList = isSelected
        ? prev.filter((c) => c !== code)
        : [...prev, code];

      if (newList.length === 1) {
        setSelectedHash(getSchemaHashFromQrString(newList[0].data));
      } else if (newList.length === 0) {
        setSelectedHash(null);
      }

      return newList;
    });
  };

  const selectAllCodes = (useHash: boolean) => {
    if (!qrCodes) return;

    // Compare parsed hashes rather than substring-matching the raw string. v2 writes
    // the hash uppercase so the whole code stays QR-alphanumeric, while parseQrHeader
    // normalizes to lowercase — so `data.includes(selectedHash)` matched nothing at
    // all for v2 codes. Substring matching was also a latent false positive: an
    // 8-hex-char run can occur inside an unrelated code's Base45 payload.
    if (useHash && selectedHash) {
      setSelectedCodes(
        qrCodes.filter((c) => getSchemaHashFromQrString(c.data) === selectedHash)
      );
      return;
    }

    // No hash established yet (nothing selected), so there is nothing to filter by —
    // select everything rather than appearing to do nothing.
    setSelectedCodes(qrCodes);
  };

  // Clears the selection only. Leaving/entering selection mode is composed on top
  // of this by useQrManager.toggleSelectionMode, which calls resetSelection() and
  // then toggleSelecting() — so this must NOT toggle, or the two would cancel out.
  const resetSelection = () => {
    setSelectedCodes([]);
    setSelectedHash(null);
  };

  const noCodesSelected = useMemo(
    () => selectedCodes.length === 0,
    [selectedCodes]
  );

  return {
    selecting,
    toggleSelecting,
    codeIsSelected,
    selectedCodes,
    selectedHash,
    validQrCodes,
    invalidQrCodes,
    updateSelectedCodes,
    resetSelection,
    noCodesSelected,
    selectAllCodes,
  };
}
