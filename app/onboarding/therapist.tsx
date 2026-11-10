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
import { ServicesManager } from "@/components/ServicesManager";
import { Sheet } from "@/components/Sheet";
import { Packs } from "@/components/Packs";
import { C, F, ICON } from "@/lib/theme";
import { errorMessage } from "@/lib/util";
import { CITY_NAMES } from "@/lib/areas";

type Gender = "female" | "male";
type Serves = "women" | "men" | "both";
type Work = "home" | "studio" | "both";

export default function TherapistOnboarding() {
  const me = useQuery(api.users.me);
  const mine = useQuery(api.therapists.mine, me?.role === "therapist" ? {} : "skip");
  const saveProfile = useMutation(api.therapists.saveProfile);
  const submit = useMutation(api.therapists.submitVerification);
  const updateMe = useMutation(api.users.updateMe);
  const { signOut } = useAuthActions();

  const [init, setInit] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [serves, setServes] = useState<Serves>("both");
  const [workType, setWorkType] = useState<Work>("both");
  const [radiusKm, setRadiusKm] = useState(10);
  const [loc, setLoc] = useState<PickedLocation | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [idDoc, setIdDoc] = useState<Id<"_storage"> | null>(null);
  const [selfie, setSelfie] = useState<Id<"_storage"> | null>(null);
  const [cert, setCert] = useState<Id<"_storage"> | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (init || mine === undefined) return;
    if (mine) {
      setDisplayName(mine.displayName);
      setBio(mine.bio);
      setGender(mine.gender);
      setServes(mine.serves);
      setWorkType(mine.workType);
      setRadiusKm(mine.radiusKm);
      setLoc({ area: mine.area, lat: mine.lat, lng: mine.lng });
      setPhotos(mine.photoIds.map((id, i) => ({ id, uri: mine.photos[i] ?? "" })));
      if (mine.idDocId) setIdDoc(mine.idDocId);
      if (mine.selfieId) setSelfie(mine.selfieId);
      if (mine.certId) setCert(mine.certId);
    }
    setInit(true);
  }, [mine, init]);

  if (me === undefined || (me?.role === "therapist" && mine === undefined)) return <Loading />;
  if (!me) return <Redirect href="/auth/sign-in" />;
  if (me.role !== "therapist") return <Redirect href="/" />;

  const status = mine?.verification ?? "none";

  async function onSave() {
    setError(null);
    if (!loc) return setError("Choose your area");
    setBusy("save");
    try {
      await saveProfile({
        displayName,
        bio,
        gender,
        serves,
        workType,
        area: loc.area,
        lat: loc.lat,
        lng: loc.lng,
        radiusKm,
        photoIds: photos.map((p) => p.id),
      });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit() {
    setError(null);
    if (!idDoc || !selfie || !cert) return setError("Upload all three documents");
    setBusy("submit");
    try {
      await submit({ idDocId: idDoc, selfieId: selfie, certId: cert });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen padBottom={60}>
      <Row style={{ justifyContent: "space-between" }}>
        <T v="label">Therapist setup</T>
        <Pressable
          onPress={() => setWalletOpen(true)}
          style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.card, flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Wallet size={16} strokeWidth={ICON.stroke} color={C.ink} />
          <T style={{ fontFamily: F.medium, fontSize: 14 }}>{me.credits} CC · Buy</T>
        </Pressable>
      </Row>
      <T v="display" style={{ marginTop: 4 }}>
        {status === "approved" ? "You're verified" : status === "pending" ? "Under review" : "Get verified"}
      </T>

      {status === "pending" ? (
        <Card style={{ marginTop: 16, backgroundColor: C.lime, gap: 10 }}>
          <T>Thanks! Our team is checking your documents. You'll get a notification once you're approved. You can buy Connection Credits (CC) and edit your profile meanwhile.</T>
          <Btn label="Buy CC while waiting" tone="dark" onPress={() => setWalletOpen(true)} />
        </Card>
      ) : null}
      {status === "rejected" ? (
        <Card dark style={{ marginTop: 16 }}>
          <T style={{ color: "#FFFFFF" }}>Not approved: {mine?.rejectReason}. Update your profile and resubmit.</T>
        </Card>
      ) : null}
      {status === "approved" ? (
        <Btn style={{ marginTop: 16 }} label="Go to dashboard" arrow onPress={() => router.replace("/pro")} />
      ) : null}

      <T v="h2" style={{ marginTop: 28, marginBottom: 12 }}>1 · Your profile</T>
      <View style={{ gap: 14 }}>
        <PhotoGrid photos={photos} onChange={setPhotos} min={3} max={6} />
        <Field label="Display name (first name + initial)" placeholder="Adaeze O." value={displayName} onChangeText={setDisplayName} maxLength={40} />
        <Field label="Short bio" value={bio} onChangeText={setBio} multiline maxLength={200} style={{ minHeight: 90 }} placeholder="Certified therapist, 5 years' experience…" />
        <T v="label">I am</T>
        <Row>
          <Chip label="Female" active={gender === "female"} onPress={() => setGender("female")} />
          <Chip label="Male" active={gender === "male"} onPress={() => setGender("male")} />
        </Row>
        <T v="label">I serve</T>
        <Row>
          <Chip label="Women" active={serves === "women"} onPress={() => setServes("women")} />
          <Chip label="Men" active={serves === "men"} onPress={() => setServes("men")} />
          <Chip label="Both" active={serves === "both"} onPress={() => setServes("both")} />
        </Row>
        <T v="label">Where I work</T>
        <Row style={{ flexWrap: "wrap" }}>
          <Chip label="Home visits" active={workType === "home"} onPress={() => setWorkType("home")} />
          <Chip label="My studio" active={workType === "studio"} onPress={() => setWorkType("studio")} />
          <Chip label="Both" active={workType === "both"} onPress={() => setWorkType("both")} />
        </Row>
        {workType !== "studio" ? (
          <>
            <T v="label">How far I travel</T>
            <Row>
              {[5, 10, 20].map((k) => (
                <Chip key={k} label={`${k} km`} active={radiusKm === k} onPress={() => setRadiusKm(k)} />
              ))}
            </Row>
          </>
        ) : null}
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
        <LocationPicker city={me.city ?? "Lagos"} value={loc} onChange={setLoc} />
        <T v="small">Clients only see your area and a rounded distance — never your exact location.</T>
        <Btn label={saved ? "Saved" : "Save profile"} tone="dark" loading={busy === "save"} onPress={onSave} />
      </View>

      {mine ? (
        <>
          <T v="h2" style={{ marginTop: 32, marginBottom: 12 }}>2 · Services and prices</T>
          <ServicesManager services={mine.services} />
        </>
      ) : null}

      {mine && status !== "approved" && status !== "pending" ? (
        <>
          <T v="h2" style={{ marginTop: 32, marginBottom: 6 }}>3 · Verification</T>
          <T v="label" style={{ marginBottom: 12 }}>Private. Only the Relaxxo team sees these.</T>
          <View style={{ gap: 10 }}>
            <DocUpload label="Government ID (NIN, passport or driver's licence)" done={!!idDoc} onUploaded={setIdDoc} />
            <DocUpload label="Selfie holding your ID" done={!!selfie} onUploaded={setSelfie} />
            <DocUpload label="Certificate or photo of you at work" done={!!cert} onUploaded={setCert} />
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
        <Packs returnTo="/onboarding/therapist" onSuccess={() => setWalletOpen(false)} />
      </Sheet>
    </Screen>
  );
}
