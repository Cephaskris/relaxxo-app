import React, { useRef } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { C, F, ICON } from "@/lib/theme";

// Curved area picker (reference 1): names sit on an arc, the selected one is large.
// Drag up/down on the wheel, drag the side scrollbar handle, scroll with mouse wheel, or tap a name.
export function AreaWheel({
  names,
  selected,
  onChange,
  onSelectActive,
  height = 360,
}: {
  names: string[];
  selected: number;
  onChange: (i: number) => void;
  onSelectActive?: () => void;
  height?: number;
}) {
  const cx = -150;
  const cy = height / 2;
  const R = 236;
  const step = 12;

  const trackTop = 30;
  const trackBottom = 30;
  const thumbHeight = 80;
  const trackHeight = height - trackTop - trackBottom;
  const maxTravel = Math.max(1, trackHeight - thumbHeight);
  const maxIndex = Math.max(1, names.length - 1);
  const thumbTop = trackTop + (selected / maxIndex) * maxTravel;

  const dragStart = useRef(selected);
  const thumbDragStart = useRef(selected);
  const wheelAccum = useRef(0);
  const latest = useRef({ selected, onChange, count: names.length, maxTravel });
  latest.current = { selected, onChange, count: names.length, maxTravel };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        dragStart.current = latest.current.selected;
      },
      onPanResponderMove: (_, g) => {
        const { count, onChange: change, selected: sel } = latest.current;
        const next = Math.min(count - 1, Math.max(0, dragStart.current - Math.round(g.dy / 44)));
        if (next !== sel) change(next);
      },
    }),
  ).current;

  const thumbPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        thumbDragStart.current = latest.current.selected;
      },
      onPanResponderMove: (_, g) => {
        const { count, onChange: change, selected: sel, maxTravel: travel } = latest.current;
        if (count <= 1) return;
        const deltaIndex = Math.round((g.dy / travel) * (count - 1));
        const next = Math.min(count - 1, Math.max(0, thumbDragStart.current + deltaIndex));
        if (next !== sel) change(next);
      },
    }),
  ).current;

  function onWheel(e: { deltaY?: number; preventDefault?: () => void }) {
    if (typeof e.deltaY !== "number") return;
    e.preventDefault?.();
    wheelAccum.current += e.deltaY;
    if (Math.abs(wheelAccum.current) >= 32) {
      const dir = wheelAccum.current > 0 ? 1 : -1;
      wheelAccum.current = 0;
      const { count, selected: sel, onChange: change } = latest.current;
      const next = Math.min(count - 1, Math.max(0, sel + dir));
      if (next !== sel) change(next);
    }
  }

  return (
    <View
      style={{ height, width: "100%", overflow: "hidden", userSelect: "none" } as object}
      {...pan.panHandlers}
      // @ts-expect-error web wheel support
      onWheel={onWheel}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: cx - 230,
          top: cy - 230,
          width: 460,
          height: 460,
          borderRadius: 230,
          borderWidth: 1.5,
          borderColor: "rgba(20,20,20,0.3)",
        }}
      />
      {names.map((name, i) => {
        const k = i - selected;
        if (Math.abs(k) > 4) return null;
        const deg = k * step;
        const rad = (deg * Math.PI) / 180;
        const x = cx + R * Math.cos(rad) + 18;
        const y = cy + R * Math.sin(rad);
        const isSel = k === 0;
        const opacity = [1, 0.5, 0.32, 0.2, 0.1][Math.abs(k)];
        const fontSize = isSel ? 40 : 26;
        return (
          <Pressable
            key={name}
            onPress={() => {
              if (isSel && onSelectActive) onSelectActive();
              else onChange(i);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${name}`}
            accessibilityState={{ selected: isSel }}
            style={{
              position: "absolute",
              left: x,
              top: y - fontSize * 0.7,
              transform: [{ rotate: `${deg}deg` }],
              transformOrigin: "left center",
              opacity,
              paddingVertical: 4,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: isSel ? F.medium : F.light,
                fontSize,
                letterSpacing: -0.6,
                color: C.ink,
              }}
            >
              {name}
            </Text>
          </Pressable>
        );
      })}

      {/* Interactive vertical scrollbar track */}
      <Pressable
        accessibilityLabel="Scroll area track"
        onPress={(e) => {
          const locY = e.nativeEvent.locationY;
          if (typeof locY === "number" && names.length > 1) {
            const ratio = Math.min(1, Math.max(0, (locY - thumbHeight / 2) / maxTravel));
            onChange(Math.round(ratio * (names.length - 1)));
          }
        }}
        style={{
          position: "absolute",
          right: 8,
          top: trackTop,
          height: trackHeight,
          width: 34,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 4, height: "100%", borderRadius: 2, backgroundColor: "#DADAD5" }} />
      </Pressable>

      {/* Draggable scrollbar thumb + step buttons */}
      <View
        {...thumbPan.panHandlers}
        style={
          {
            position: "absolute",
            right: 8,
            top: thumbTop,
            width: 34,
            height: thumbHeight,
            borderRadius: 17,
            backgroundColor: C.ink,
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 4,
            cursor: "grab",
          } as object
        }
      >
        <Pressable accessibilityLabel="Previous area" onPress={() => onChange(Math.max(0, selected - 1))} style={{ padding: 4 }}>
          <ChevronUp size={20} strokeWidth={ICON.stroke} color="#FFFFFF" />
        </Pressable>
        <Pressable
          accessibilityLabel="Next area"
          onPress={() => onChange(Math.min(names.length - 1, selected + 1))}
          style={{ padding: 4 }}
        >
          <ChevronDown size={20} strokeWidth={ICON.stroke} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
