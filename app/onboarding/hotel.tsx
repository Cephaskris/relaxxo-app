import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router, Redirect } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Wallet } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Screen, T, Row, Chip, Field, Btn, Card, ErrorNote, Loading } from "@/components/ui";
import { PhotoGrid, DocUpload, type Photo } from "@/components/Uploaders";
import { LocationPicker, type PickedLocation } from "@/components/LocationPicker";
import { RoomsManager } from "@/components/RoomsManager";
import { Sheet } from "@/components/Sheet";
import { Packs } from "@/components/Packs";
import { C, F, ICON } from "@/lib/theme";
import { errorMessage, normalizePhone, prettyPhone } from "@/lib/util";
import { CITY_NAMES } from "@/lib/areas";

const AMENITIES = ["Wi-Fi", "24h power", "Air conditioning", "Parking", "Restaurant", "Pool", "Gym", "Security", "Room service"];

export default function HotelOnboarding() {
  const me = useQuery(api.users.me);
  const h = useQuery(api.hotels.mine, me?.role === "hotel" ? {} : "skip");
  const saveHotel = useMutation(api.hotels.saveHotel);
  const submit = useMutation(api.hotels.submitVerification);
  const updateMe = useMutation(api.users.updateMe);
  const { signOut } = useAuthActions();

  const [init, setInit] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [loc, setLoc] = useState<PickedLocation | null>(null);
  const [cover, setCover] = useState<Photo[]>([]);
  const [exterior, setExterior] = useState<Photo[]>([]);
  const [doc, setDoc] = useState<Id<"_storage"> | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (init || h === undefined) return;
    if (h) {
      setName(h.name);
      setAddress(h.address);
      setPhone(prettyPhone(h.phone));
      setAmenities(h.amenities);
      setLoc({ area: h.area, lat: h.lat, lng: h.lng });
      if (h.coverId) setCover([{ id: h.coverId, uri: h.cover ?? "" }]);
      if (h.exteriorIds?.length) {
        setExterior(h.exteriorIds.map((id, i) => ({ id, uri: h.exterior?.[i] ?? "" })));
      }
    }
    setInit(true);
  }, [h, init]);

  if (me === undefined || (me?.role === "hotel" && h === undefined)) return <Loading />;
  if (!me) return <Redirect href="/auth/sign-in" />;
  if (me.role !== "hotel") return <Redirect href="/" />;
  const status = h?.verification ?? "none";

  async function onSave() {
    setError(null);
    const p = normalizePhone(phone);
    if (!p) return setError("Enter a valid front-desk phone number");
    if (!loc) return setError("Set your hotel's location");
    if (!cover[0]) return setError("Add a cover photo");
    setBusy("save");
    try {
      await saveHotel({ name, address: address || loc.address || "", area: loc.area, lat: loc.lat, lng: loc.lng, phone: p, amenities, coverId: cover[0].id });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit() {
    setError(null);
    if (!doc) return setError("Upload your CAC certificate or business document");
    setBusy("submit");
    try {
      await submit({ docId: doc, exteriorIds: exterior.map((p) => p.id) });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen padBottom={60}>
      <Row style={{ justifyContent: "space-between" }}>
        <T v="label">Hotel setup</T>
        <Pressable
          onPress={() => setWalletOpen(true)}
          style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.card, flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Wallet size={16} strokeWidth={ICON.stroke} color={C.ink} />
          <T style={{ fontFamily: F.medium, fontSize: 14 }}>{me.credits} CC · Buy</T>
        </Pressable>
      </Row>
      <T v="display" style={{ marginTop: 4 }}>
        {status === "approved" ? "You're verified" : status === "pending" ? "Under review" : "List your hotel"}
      </T>
      {status === "pending" ? (
        <Card style={{ marginTop: 16, backgroundColor: C.lime, gap: 10 }}>
          <T>We're checking your documents. You can add rooms and buy Connection Credits (CC) meanwhile.</T>
          <Btn label="Buy CC while waiting" tone="dark" onPress={() => setWalletOpen(true)} />
        </Card>
      ) : null}
      {status === "rejected" ? (
        <Card dark style={{ marginTop: 16 }}>
          <T style={{ color: "#FFFFFF" }}>Not approved: {h?.rejectReason}. Fix the details and resubmit.</T>
        </Card>
      ) : null}
      {status === "approved" ? <Btn style={{ marginTop: 16 }} label="Go to dashboard" arrow onPress={() => router.replace("/host")} /> : null}

      <T v="h2" style={{ marginTop: 28, marginBottom: 12 }}>1 · Hotel details</T>
      <View style={{ gap: 14 }}>
        <T v="label">Cover photo</T>
        <PhotoGrid photos={cover} onChange={setCover} min={1} max={1} />
        <Field label="Hotel name" value={name} onChangeText={setName} maxLength={60} />
        <Field label="Front-desk phone (guests will call this)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={16} />
        <T v="label">City</T>
        <Row>
          {CITY_NAMES.map((c) => (
            <Chip
              key={c}
              label={c}
              active={(me.city ?? "Lagos") === c}
              onPress={() => {
                updateMe({ city: c }).catch((e) => setError(errorMessage(e)));
                setLoc(null);
              }}
            />
          ))}
        </Row>
        <LocationPicker city={me.city ?? "Lagos"} value={loc} onChange={(v) => { setLoc(v); if (v.address) setAddress(v.address); }} exactRequired />
        <Field label="Full address" value={address} onChangeText={setAddress} maxLength={160} />
        <T v="label">Amenities</T>
        <Row style={{ flexWrap: "wrap" }}>
          {AMENITIES.map((a) => (
            <Chip
              key={a}
              label={a}
              active={amenities.includes(a)}
              onPress={() => setAmenities((x) => (x.includes(a) ? x.filter((y) => y !== a) : [...x, a]))}
            />
          ))}
        </Row>
        <Btn label={saved ? "Saved" : "Save details"} tone="dark" loading={busy === "save"} onPress={onSave} />
      </View>

      {h ? (
        <>
          <T v="h2" style={{ marginTop: 32, marginBottom: 12 }}>2 · Rooms</T>
          <RoomsManager rooms={h.rooms} />
        </>
      ) : null}

      {h && status !== "approved" && status !== "pending" ? (
        <>
          <T v="h2" style={{ marginTop: 32, marginBottom: 6 }}>3 · Verification</T>
          <T v="label" style={{ marginBottom: 12 }}>Private. Only the Relaxxo team sees these.</T>
          <View style={{ gap: 12 }}>
            <DocUpload label="CAC certificate or business registration" done={!!doc} onUploaded={setDoc} />
            <T v="label">Photos of the building and reception (2–6)</T>
            <PhotoGrid photos={exterior} onChange={setExterior} min={2} max={6} />
            <Btn label="Submit for review" arrow loading={busy === "submit"} onPress={onSubmit} />
          </View>
        </>
      ) : null}
      <View style={{ marginTop: 16 }}><ErrorNote text={error} /></View>
      <View style={{ marginTop: 28 }}>
        <Btn
          label="Sign out"
          tone="light"
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
        />
      </View>

      <Sheet visible={walletOpen} onClose={() => setWalletOpen(false)} title={`Wallet · ${me.credits} CC`}>
        <Packs returnTo="/onboarding/hotel" onSuccess={() => setWalletOpen(false)} />
      </Sheet>
    </Screen>
  );
}
