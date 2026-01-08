import { useEffect, useMemo, useState } from "react";
import useToggle from "../hooks/useToggle";

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
      const [, , hash] = code.data.split(":");
      (hash === selectedHash ? valid : invalid).push(code);
    });

    setValidQrCodes(valid);
    setInvalidQrCodes(invalid);
  }, [qrCodes, selecting, selectedHash]);

  const updateSelectedCodes = (code: QrCode) => {
    const newList = codeIsSelected(code)
      ? selectedCodes.filter((c) => c !== code)
      : [...selectedCodes, code];
    setSelectedCodes(newList);

    if (newList.length === 1) {
      const [, , hash] = newList[0].data.split(":");
      setSelectedHash(hash);
    } else if (newList.length === 0) {
      setSelectedHash(null);
    }
  };

  const selectAllCodes = (useHash: boolean) => {
    if (!qrCodes) return;

    if (useHash) {
      setSelectedCodes(
        qrCodes && selectedHash
          ? [...qrCodes.filter((c) => c.data.includes(selectedHash || ""))]
          : []
      );
    } else {
      setSelectedCodes(qrCodes);
    }
  };

  const resetSelection = () => {
    setSelectedCodes([]);
    setSelectedHash(null);
    toggleSelecting;
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
