import * as ImagePicker from "expo-image-picker";
import type { Id } from "@/convex/_generated/dataModel";

type Gen = () => Promise<string>;
type Claim = (a: { storageId: Id<"_storage">; kind: "public" | "private" }) => Promise<unknown>;

// Picks one image, uploads it to Convex storage and ties it to the signed-in user.
export async function pickAndUpload(
  generateUploadUrl: Gen,
  claimUpload: Claim,
  kind: "public" | "private" = "public",
): Promise<{ storageId: Id<"_storage">; uri: string } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Allow photo access to upload");
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) throw new Error("Choose an image under 8 MB");
  const blob = await (await fetch(asset.uri)).blob();
  const url = await generateUploadUrl();
  const up = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": asset.mimeType ?? blob.type ?? "image/jpeg" },
    body: blob,
  });
  if (!up.ok) throw new Error("Upload failed");
  const { storageId } = (await up.json()) as { storageId: Id<"_storage"> };
  await claimUpload({ storageId, kind });
  return { storageId, uri: asset.uri };
}
