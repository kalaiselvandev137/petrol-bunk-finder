import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <KeyboardAvoidingView className="justify-center px-6"
      behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View className="items-center mb-4">
        <Image source={require('../../assets/images/petrol-maps/logo.png')} className="w-24 h-24 mb-4"
          resizeMode="contain"
        />
      </View>
      <Text className="text-3xl font-bold text-gray-900 text-center mb-2">Welcome Back!</Text>
      <Text className="text-xl font-bold text-center mb-8 text-orange-600">
        Sign In to your account
      </Text>

      <TextInput
        className="border border-gray-300 rounded-lg p-3.5 mb-4 text-base placeholder:text-gray-500"
        placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email}
        onChangeText={setEmail}
      />

      <TextInput
        className="border border-gray-300 rounded-lg p-3.5 mb-4 text-base text-gray-500 placeholder:text-gray-500"
        placeholder="Password" secureTextEntry value={password} onChangeText={setPassword}
      />

      <TouchableOpacity
        className={`bg-blue-800 p-4 rounded-lg items-center ${submitting ? "opacity-50" : ""}`}
        onPress={handleLogin} disabled={submitting}
      >
        <Text className="text-white font-semibold text-base">
          {submitting ? "Signing in..." : "Login"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}