import { useState, type ChangeEvent } from "react";
import { ImagePlus } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_FILE_SIZE, convertImageToDataUrl } from "../../../lib/imageUpload";
import { NieError, nieApi } from "../../../lib/nie/client";
import { Button, Notice } from "../../ui/primitives";
import { Checkbox, Field, Select, TextInput } from "../../ui/form";

const LICENCES = [
  "Owned by NexTake",
  "Licensed to NexTake (editorial use)",
  "Company press kit (permission to publish)",
  "CC0 / public domain",
  "CC BY",
  "CC BY-SA",
  "Stock licence (editorial)",
  "Other (explain in credit line)",
];

/**
 * Attach a real, rights-cleared photograph. The editor is stating that NexTake may publish it, and that
 * statement is recorded against their account. The article is re-screened (legal risk) after upload.
 */
export default function NieImageUpload({ articleId, onUploaded }: { articleId: number; onUploaded: (status: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [creator, setCreator] = useState("");
  const [licence, setLicence] = useState(LICENCES[0]);
  const [licenceUrl, setLicenceUrl] = useState("");
  const [credit, setCredit] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [illustrative, setIllustrative] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return setError("Use a JPEG, PNG or WebP image.");
    if (file.size > MAX_IMAGE_FILE_SIZE) return setError("That image is larger than 8 MB. Choose a smaller file.");
    try {
      setPreview(await convertImageToDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read that image.");
    }
  };

  const submit = async () => {
    if (!preview) return setError("Choose an image first.");
    if (!creator.trim()) return setError("Add the photographer or rights holder.");
    setBusy(true);
    setError(null);
    try {
      const result = await nieApi.uploadImage(articleId, {
        data_base64: preview,
        creator: creator.trim(),
        licence_id: licence,
        licence_url: licenceUrl.trim(),
        attribution_text: credit.trim() || `Photo: ${creator.trim()}`,
        source_url: sourceUrl.trim(),
        is_illustrative: illustrative,
        alt: "",
      });
      setPreview(null);
      setCreator("");
      setCredit("");
      setLicenceUrl("");
      setSourceUrl("");
      onUploaded(result.article_status);
    } catch (e) {
      setError(e instanceof NieError ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#071A2B]/25 bg-slate-50 px-4 py-5 text-xs font-semibold text-[#071A2B] hover:bg-slate-100">
        <ImagePlus className="h-4 w-4" />
        {preview ? "Choose a different image" : "Choose an image (at least 900 × 400 px)"}
        <input type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" onChange={pick} />
      </label>
      {preview && <img src={preview} alt="Selected upload" className="max-h-48 w-full rounded-xl border border-[#071A2B]/10 object-cover" />}
      {preview && (
        <>
          <Field label="Photographer or rights holder" required>
            <TextInput value={creator} onChange={(e) => setCreator(e.target.value)} />
          </Field>
          <Field label="Licence" hint="You are confirming NexTake may publish this image.">
            <Select value={licence} onChange={(e) => setLicence(e.target.value)}>
              {LICENCES.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Licence link (optional)">
            <TextInput value={licenceUrl} onChange={(e) => setLicenceUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Credit line" hint="Shown under the image. Defaults to “Photo: name”.">
            <TextInput value={credit} onChange={(e) => setCredit(e.target.value)} />
          </Field>
          <Field label="Where it came from (optional)">
            <TextInput value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Checkbox
            checked={illustrative}
            onChange={(e) => setIllustrative(e.target.checked)}
            label="This is an illustrative image, not a photo of the event"
          />
        </>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      {preview && <Button onClick={submit} loading={busy} className="w-full">Attach image and re-screen</Button>}
    </div>
  );
}
