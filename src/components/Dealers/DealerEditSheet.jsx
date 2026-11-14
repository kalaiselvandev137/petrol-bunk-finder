import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
    BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Keyboard, Text, TouchableOpacity, View } from "react-native";
import { BUTTON_SHADOW, COLORS } from "../../constants/theme";
import apiurl from "../../services/apiendpoint";

const STATUS_OPTIONS = ["Active", "Inactive"];

// ---- helpers ---------------------------------------------------------------

function formatAmount(value) {
    if (!value) return "N/A";
    return `₹${Number(value).toLocaleString("en-IN")}`;
}

// complete address including pincode
function buildFullAddress(place) {
    const pin = place.postalCode ? place.postalCode.replace(/\D/g, "").slice(0, 6) : "";
    const parts = [
        place.name,
        place.street,
        place.district,
        place.city || place.subregion,
        place.region,
        pin,
    ].filter(Boolean);
    // remove duplicates while keeping order (e.g. name === street)
    return [...new Set(parts)].join(", ");
}

function DetailRow({ icon, label, value }) {
    return (
        <View className="flex-row items-center py-2.5 border-b border-[#EEF3FA]">
            <View className="w-8 items-center">
                <Ionicons name={icon} size={16} color={COLORS.soft} />
            </View>
            <Text className="text-xs text-[#7A8AA8] flex-1">{label}</Text>
            <Text className="text-sm font-medium text-[#0B2559] flex-1 text-right" numberOfLines={2}>
                {value || "—"}
            </Text>
        </View>
    );
}

function Field({ label, children }) {
    return (
        <View className="mb-4">
            <Text className="text-sm font-semibold text-[#0B2559] mb-2">{label}</Text>
            <View className="bg-[#F1F5FB] border border-[#E3EBF6] rounded-xl px-3">{children}</View>
        </View>
    );
}

// ---- main component ----------------------------------------------------------

export default function DealerEditSheet({ sheetRef, item, token, onSaved }) {
    const [mobile, setMobile] = useState("");
    const [status, setStatus] = useState("Active");
    const [locality, setLocality] = useState("");
    const [stateName, setStateName] = useState("");

    const [locating, setLocating] = useState(false);
    const [locationMsg, setLocationMsg] = useState(null); // { type: 'ok' | 'error', text }
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [coords, setCoords] = useState(null);

    const snapPoints = useMemo(() => ["90%"], []);

    // reset form whenever a different dealer is opened
    useEffect(() => {
        if (item) {
            setMobile(item.Primary_Mobile || "");
            setStatus(item.Status || "Active");
            setLocality(item.Current_Address_Locality || "");
            setStateName(item.Current_Address_State || "");
            setLocationMsg(null);
            setSaveError(null);
            setCoords(null);
        }
    }, [item]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
        ),
        []
    );

    // ---- auto fetch complete address (with pincode) into Locality ----
    const handleAutoLocation = async () => {
        Keyboard.dismiss();
        setLocating(true);
        setLocationMsg(null);
        try {
            const { status: perm } = await Location.requestForegroundPermissionsAsync();
            if (perm !== "granted") {
                setLocationMsg({
                    type: "error",
                    text: "Location permission denied. Please type the locality manually.",
                });
                return;
            }

            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const { latitude, longitude } = pos.coords;
            setCoords({ latitude, longitude });

            const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (!place) {
                setLocationMsg({
                    type: "error",
                    text: "Could not find an address for this location. Please type it manually.",
                });
                return;
            }

            const full = buildFullAddress(place);
            if (full) setLocality(full);
            if (place.region) setStateName(place.region.toUpperCase());

            setLocationMsg({ type: "ok", text: "Address filled from current location. You can edit it." });
        } catch (e) {
            setLocationMsg({
                type: "error",
                text: "Could not fetch location. Check GPS or type the locality manually.",
            });
        } finally {
            setLocating(false);
        }
    };

    // ---- save ----
    const handleSave = async () => {
        Keyboard.dismiss();
        setSaveError(null);

        if (mobile && !/^\d{10}$/.test(mobile)) {
            setSaveError("Enter a valid 10 digit mobile number.");
            return;
        }

    const updated = {
        Primary_Mobile: mobile,
        Status: status,
        Current_Address_Locality: locality.trim(),
        Current_Address_State: stateName.trim(),
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
    };

        setSaving(true);
        try {
            const res = await fetch(`${apiurl()}/dealers/apiupdatedealer`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ _id: item._id, ...updated })
            });
            const json = await res.json();
            if (!res.ok || json.success === false) {
                throw new Error(json.message || "Update failed");
            }
            onSaved({ ...item, ...updated });
            sheetRef.current?.close();
        } catch (e) {
            setSaveError("Could not save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <BottomSheet
            ref={sheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: "#C5D0E3", width: 40 }}
        >
            <BottomSheetScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
            >
                {item && (
                    <>
                        {/* Header */}
                        <View className="mb-4">
                            <Text className="text-lg font-bold text-[#0B2559]">{item.Business_Name}</Text>
                            <Text className="text-xs text-[#7A8AA8] mt-1">Lead ID: {item.Lead_ID}</Text>
                        </View>

                        {/* Read-only details */}
                        <View className="bg-[#F4F7FB] rounded-2xl px-3 mb-5">
                            <DetailRow icon="business-outline" label="OMC" value={item.OMC} />
                            <DetailRow
                                icon="cash-outline"
                                label="Approved line"
                                value={formatAmount(item.Approved_Line_Amount)}
                            />
                            <DetailRow icon="person-outline" label="Assigned to" value={item.Employee_Name} />
                        </View>

                        {/* Status */}
                        <Text className="text-sm font-semibold text-[#0B2559] mb-2">Status</Text>
                        <View className="flex-row mb-5">
                            {STATUS_OPTIONS.map((opt) => {
                                const active = status === opt;
                                return (
                                    <TouchableOpacity
                                        key={opt}
                                        onPress={() => setStatus(opt)}
                                        className={`flex-1 mr-2 py-2.5 rounded-xl items-center border ${
                                            active ? "bg-[#0A5BFF] border-[#0A5BFF]" : "bg-white border-[#DCE6F4]"
                                        }`}
                                    >
                                        <Text className={`text-sm font-medium ${active ? "text-white" : "text-[#5B6B8C]"}`}>
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Mobile */}
                        <Field label="Primary mobile">
                            <BottomSheetTextInput
                                className="text-sm text-[#0B2559] py-3"
                                placeholder="10 digit mobile number"
                                placeholderTextColor={COLORS.faint}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={mobile}
                                onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, ""))}
                            />
                        </Field>

                        {/* Locality with current-location fetch */}
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-sm font-semibold text-[#0B2559]">Locality / city</Text>
                            <TouchableOpacity
                                className="flex-row items-center bg-[#E6FBF8] px-3 py-1.5 rounded-full"
                                onPress={handleAutoLocation}
                                disabled={locating}
                                activeOpacity={0.7}
                            >
                                {locating ? (
                                    <ActivityIndicator size="small" color={COLORS.teal} />
                                ) : (
                                    <Ionicons name="locate" size={14} color={COLORS.teal} />
                                )}
                                <Text className="text-xs font-semibold text-[#0A8F8F] ml-1.5">
                                    {locating ? "Fetching..." : "Use current location"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View className="bg-[#F1F5FB] border border-[#E3EBF6] rounded-xl px-3 mb-2">
                            <BottomSheetTextInput
                                className="text-sm text-[#0B2559] py-3 min-h-[80px]"
                                placeholder="Door no, street, area, city, pincode..."
                                placeholderTextColor={COLORS.faint}
                                value={locality}
                                onChangeText={setLocality}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        {locationMsg && (
                            <View className="flex-row items-center mb-2">
                                <Ionicons
                                    name={locationMsg.type === "ok" ? "checkmark-circle-outline" : "alert-circle-outline"}
                                    size={14}
                                    color={locationMsg.type === "ok" ? COLORS.teal : COLORS.danger}
                                />
                                <Text
                                    className={`text-xs ml-1 flex-1 ${
                                        locationMsg.type === "ok" ? "text-[#0A8F8F]" : "text-[#D93036]"
                                    }`}
                                >
                                    {locationMsg.text}
                                </Text>
                            </View>
                        )}

                        <View className="mt-2" />

                        {/* State */}
                        <Field label="State">
                            <BottomSheetTextInput
                                className="text-sm text-[#0B2559] py-3"
                                placeholder="State"
                                placeholderTextColor={COLORS.faint}
                                value={stateName}
                                onChangeText={setStateName}
                            />
                        </Field>

                        {saveError && (
                            <View className="flex-row items-center mt-1">
                                <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
                                <Text className="text-xs text-[#D93036] ml-1">{saveError}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            className="bg-[#0A5BFF] rounded-2xl py-3.5 items-center mt-5 flex-row justify-center"
                            style={BUTTON_SHADOW}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                                    <Text className="text-white font-semibold text-sm ml-2">Save changes</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </BottomSheetScrollView>
        </BottomSheet>
    );
}