import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList, Linking,
    RefreshControl, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import DealerEditSheet from "../components/Dealers/DealerEditSheet";
import DealerVisitModal from "../components/Dealers/DealerVisitModal";
import StripCard from "../components/StripCard";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../hooks/useLocation";
import apiurl from "../services/apiendpoint";

const PAGE_SIZE = 10;

// Navy native header
const HEADER_OPTIONS = {
    title: "My Dealers",
    headerShown: true,
    headerStyle: { backgroundColor: COLORS.navy },
    headerTintColor: "#FFFFFF",
    headerTitleStyle: { fontWeight: "700" },
    headerShadowVisible: false,
    statusBarStyle: "light",
};

export default function DealersScreen() {
    const { token } = useAuth();
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [dealers, setDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const { getCurrentLocation } = useLocation();
    const [routingId, setRoutingId] = useState(null);
    const [visitDealer, setVisitDealer] = useState(null);

    const requestSeq = useRef(0);
    const debounceRef = useRef(null);
    const isFirstRun = useRef(true);
    const sheetRef = useRef(null);

    const fetchData = useCallback(
        async ({ first = 0, append = false, isRefresh = false } = {}) => {
            const seq = ++requestSeq.current;
            if (append) setLoadingMore(true);
            else if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    first: String(first),
                    rows: String(PAGE_SIZE),
                    globalfilter: search.trim(),
                });
                const res = await fetch(
                    `${apiurl()}/dealers/apigetdealersbysalesman?${params.toString()}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const json = await res.json();

                if (seq !== requestSeq.current) return;
                if (!json.success) throw new Error("Request failed");

                const rows = json.resdata || [];
                setDealers((prev) => (append ? [...prev, ...rows] : rows));

                if (json.totallength != null) {
                    setHasMore(first + rows.length < json.totallength);
                } else {
                    setHasMore(rows.length === PAGE_SIZE);
                }
            } catch (err) {
                if (seq === requestSeq.current) {
                    setError("Could not load dealers. Pull down to retry.");
                }
            } finally {
                if (seq === requestSeq.current) {
                    setLoading(false);
                    setLoadingMore(false);
                    setRefreshing(false);
                }
            }
        },
        [search, token]
    );

    useEffect(() => {
        const delay = isFirstRun.current ? 0 : 400;
        isFirstRun.current = false;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchData({ first: 0 });
        }, delay);
        return () => clearTimeout(debounceRef.current);
    }, [fetchData]);

    const onRefresh = () => fetchData({ first: 0, isRefresh: true });

    const onEndReached = () => {
        if (!hasMore || loadingMore || loading || refreshing) return;
        fetchData({ first: dealers.length, append: true });
    };

    const formatAmount = (value) => {
        if (!value) return "N/A";
        return `₹${Number(value).toLocaleString("en-IN")}`;
    };

    const openDetail = (item) => {
        setSelectedItem(item);
        sheetRef.current?.expand();
    };

    // update the edited dealer in the list without refetching
    const handleSaved = (updatedItem) => {
        setDealers((prev) => prev.map((d) => (d._id === updatedItem._id ? updatedItem : d)));
        setSelectedItem(updatedItem);
    };

    const toNum = (...vals) => {
        for (const v of vals) {
            const n = parseFloat(v);
            if (Number.isFinite(n)) return n;
        }
        return null;
    };

    const getDealerCoords = async (dealer) => {
        const lat = toNum(
            dealer.latitude, dealer.Latitude, dealer.lat,
            dealer.location?.latitude, dealer.location?.coordinates?.[1] // GeoJSON is [lng, lat]
        );
        const lng = toNum(
            dealer.longitude, dealer.Longitude, dealer.lng,
            dealer.location?.longitude, dealer.location?.coordinates?.[0]
        );
        if (lat != null && lng != null) return { latitude: lat, longitude: lng };

        const query = [dealer.Current_Address_Locality, dealer.Current_Address_State, "India"]
            .filter(Boolean)
            .join(", ");
        if (!query) return null;

        try {
            const [hit] = await Location.geocodeAsync(query);
            return hit ? { latitude: hit.latitude, longitude: hit.longitude } : null;
        } catch {
            return null;
        }
    };

    const handleShowRoute = async (dealer) => {
        if (routingId) return;
        setRoutingId(dealer._id);
        try {
            const dest = await getDealerCoords(dealer);
            if (!dest) {
                Alert.alert("No location", "Location data not available for this dealer.");
                return;
            }

            const from = await getCurrentLocation(); // asks permission, returns { coords, address }

            router.push({
                pathname: "/map",
                params: {
                    fromAddress: from.address,
                    fromLat: from.coords.latitude,
                    fromLng: from.coords.longitude,
                    toAddress: dealer.Business_Name,
                    toLat: dest.latitude,
                    toLng: dest.longitude,
                    dealerName: dealer.Business_Name,
                    dealerAddress: dealer.Current_Address_Locality || "",
                },
            });
        } catch (err) {
            Alert.alert("Route Error", err.message);
        } finally {
            setRoutingId(null);
        }
    };

    const renderCard = ({ item }) => {
        const active = item.Status === "Active";
        return (
            <StripCard color={active ? "#00C9B1" : "#D93036"} onPress={() => openDetail(item)}>
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-[15px] font-bold text-[#0B2559] flex-1 mr-2" numberOfLines={1}>
                        {item.Business_Name}
                    </Text>
                    <View className={`px-2 py-1 rounded-full ${active ? "bg-[#D9F7F1]" : "bg-[#FDECEC]"}`}>
                        <Text className={`text-[11px] font-semibold ${active ? "text-[#0A8F8F]" : "text-[#D93036]"}`}>
                            {item.Status}
                        </Text>
                    </View>
                </View>

                <Text className="text-xs text-[#7A8AA8] mb-2">Lead ID: {item.Lead_ID}</Text>

                <View className="flex-row items-center mb-2">
                    <View className="bg-[#E8F0FF] px-2 py-1 rounded-md mr-2">
                        <Text className="text-[11px] font-semibold text-[#0A5BFF]">{item.OMC}</Text>
                    </View>
                    <Text className="text-xs text-[#5B6B8C] shrink">
                        {item.Current_Address_Locality}, {item.Current_Address_State}
                    </Text>
                </View>

                <View className="h-px bg-[#EEF3FA] my-2" />

                <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                        <Text className="text-[10px] text-[#7A8AA8] mb-0.5">Approved line</Text>
                        <Text className="text-sm font-bold text-[#0B2559]">
                            {formatAmount(item.Approved_Line_Amount)}
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity
                            className="flex-row items-center"
                            onPress={() => item.Primary_Mobile && Linking.openURL(`tel:${item.Primary_Mobile}`)}
                        >
                            <Ionicons name="call-outline" size={14} color={COLORS.blue} />
                            <Text className="text-sm text-[#0A5BFF] font-medium ml-1.5">
                                {item.Primary_Mobile || "—"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="bg-[#0A5BFF] w-9 h-9 rounded-xl items-center justify-center"
                            onPress={() => handleShowRoute(item)}
                            disabled={routingId === item._id}
                            activeOpacity={0.7}
                        >
                            {routingId === item._id ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="bg-green-100 p-2 rounded-lg"
                            onPress={() => setVisitDealer(item)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="checkmark-done" size={16} color="#059669" />
                        </TouchableOpacity>
                    </View>
                </View>
            </StripCard>
        );
    };

    return (
        <>
            <Stack.Screen options={HEADER_OPTIONS} />
            <View className="flex-1 bg-[#0B2559]">
                {/* Search */}
                <View className="px-4 pt-1 pb-5">
                    <View className="flex-row items-center bg-white rounded-xl px-3 py-2.5">
                        <Ionicons name="search-outline" size={16} color={COLORS.soft} />
                        <TextInput
                            className="flex-1 text-sm text-[#0B2559] ml-2"
                            placeholder="Search dealer, lead ID, city..."
                            placeholderTextColor={COLORS.faint}
                            value={search}
                            onChangeText={setSearch}
                            returnKeyType="search"
                            autoCorrect={false}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch("")}>
                                <Ionicons name="close-circle" size={18} color={COLORS.faint} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Body sheet */}
                <View className="flex-1 bg-[#F4F7FB] rounded-t-[28px] overflow-hidden">
                    {loading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color={COLORS.blue} />
                        </View>
                    ) : error ? (
                        <View className="flex-1 items-center justify-center px-8">
                            <Ionicons name="warning-outline" size={40} color={COLORS.warning} />
                            <Text className="text-[#5B6B8C] text-center text-sm mt-3 mb-4">{error}</Text>
                            <TouchableOpacity
                                className="bg-[#0A5BFF] px-5 py-2.5 rounded-xl"
                                onPress={() => fetchData({ first: 0 })}
                            >
                                <Text className="text-white font-semibold text-sm">Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={dealers}
                            keyExtractor={(item, idx) => `${item._id}-${idx}`}
                            renderItem={renderCard}
                            contentContainerStyle={{ padding: 16 }}
                            keyboardShouldPersistTaps="handled"
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={COLORS.blue}
                                    colors={[COLORS.blue]}
                                />
                            }
                            onEndReachedThreshold={0.4}
                            onEndReached={onEndReached}
                            ListEmptyComponent={
                                <View className="items-center justify-center mt-24 px-8">
                                    <Ionicons name="file-tray-outline" size={44} color={COLORS.disabled} />
                                    <Text className="text-lg font-bold text-[#0B2559] text-center mt-4">
                                        No dealers found
                                    </Text>
                                    <Text className="text-[#5B6B8C] text-center mt-2 text-sm">
                                        Try a different search term.
                                    </Text>
                                </View>
                            }
                            ListFooterComponent={
                                loadingMore ? (
                                    <View className="py-4">
                                        <ActivityIndicator size="small" color={COLORS.blue} />
                                    </View>
                                ) : null
                            }
                        />
                    )}
                </View>

                <DealerEditSheet
                    sheetRef={sheetRef}
                    item={selectedItem}
                    token={token}
                    onSaved={handleSaved}
                />
                <DealerVisitModal
                    visible={!!visitDealer}
                    dealer={visitDealer}
                    onClose={() => setVisitDealer(null)}
                    onSaved={() => {}}
                />
            </View>
        </>
    );
}