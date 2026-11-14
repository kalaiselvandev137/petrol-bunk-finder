import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BUTTON_SHADOW, COLORS, SOFT_SHADOW } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

const FEATURES = ["Live Route", "Nearby Bunks", "Open Status"];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      // Navigation happens automatically via _layout.jsx redirect
    } catch (err) {
      Alert.alert("Login failed", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="bg-[#0B2559]"
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand area: grows to fill all free space, content centred */}
        <View
          className="flex-1 items-center justify-center px-6 pt-14 pb-8 overflow-hidden"
          style={{ minHeight: 280 }}
        >
          {/* Decorative shapes (transparency via style) */}
          <View
            className="absolute w-64 h-64 rounded-full"
            style={{ top: -80, right: -80, backgroundColor: "rgba(10,91,255,0.4)" }}
          />
          <View
            className="absolute w-40 h-40 rounded-full"
            style={{ top: 120, left: -60, backgroundColor: "rgba(0,229,255,0.16)" }}
          />
          <View
            className="absolute w-44 h-44 rounded-full"
            style={{ bottom: -70, right: -20, backgroundColor: "rgba(0,224,198,0.2)" }}
          />
          <View
            className="absolute w-3 h-3 rounded-full"
            style={{ top: 90, left: 48, backgroundColor: "#00E5FF" }}
          />
          <View
            className="absolute w-2 h-2 rounded-full"
            style={{ top: 150, right: 56, backgroundColor: "#00E0C6" }}
          />

          {/* Logo on a white tile */}
          <View
            className="bg-white rounded-3xl p-4 items-center justify-center"
            style={SOFT_SHADOW}
          >
            <Image
              source={require("../../assets/images/petrol-maps/logo.png")}
              className="w-32 h-32"
              resizeMode="contain"
            />
          </View>

          <Text className="text-2xl font-extrabold text-white text-center mt-6">
            FuelPay | Petrofinance Innovations
          </Text>
          <Text className="text-sm text-[#7DF3E6] text-center mt-1">
            Find fuel stations along your route
          </Text>

          {/* Feature chips */}
          <View className="flex-row flex-wrap justify-center mt-5">
            {FEATURES.map((label) => (
              <View
                key={label}
                className="flex-row items-center px-3 py-1.5 rounded-full mx-1 mb-2"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                <View className="w-1.5 h-1.5 rounded-full bg-[#00E0C6] mr-1.5" />
                <Text className="text-xs font-semibold text-white">{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Form sheet */}
        <View className="bg-white rounded-t-[32px] px-6 pt-7 pb-10">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-2xl font-extrabold text-[#0B2559]">Sign in</Text>
              <Text className="text-sm text-[#5B6B8C] mt-0.5">Welcome back! Enter your details</Text>
            </View>
            <View className="w-11 h-11 rounded-2xl bg-[#E6FBF8] items-center justify-center">
              <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.teal} />
            </View>
          </View>

          {/* Email */}
          <Text className="text-sm font-semibold text-[#0B2559] mb-2 ml-1">Email</Text>
          <View className="flex-row items-center bg-[#F1F5FB] border border-[#DCE6F4] rounded-2xl px-4 mb-4">
            <Ionicons name="mail-outline" size={18} color={COLORS.muted} />
            <TextInput
              className="flex-1 py-3.5 ml-3 text-base text-[#0B2559]"
              placeholder="you@example.com"
              placeholderTextColor={COLORS.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <Text className="text-sm font-semibold text-[#0B2559] mb-2 ml-1">Password</Text>
          <View className="flex-row items-center bg-[#F1F5FB] border border-[#DCE6F4] rounded-2xl px-4 mb-6">
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} />
            <TextInput
              className="flex-1 py-3.5 ml-3 text-base text-[#0B2559]"
              placeholder="Enter your password"
              placeholderTextColor={COLORS.faint}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={COLORS.soft}
              />
            </TouchableOpacity>
          </View>

          {/* Login button: className stays constant; colours switch via style */}
          <TouchableOpacity
            className="rounded-2xl py-4 items-center"
            style={[
              { backgroundColor: submitting ? "#9DBBFF" : "#0A5BFF" },
              submitting ? null : BUTTON_SHADOW,
            ]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base">
              {submitting ? "Signing in..." : "Login"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}