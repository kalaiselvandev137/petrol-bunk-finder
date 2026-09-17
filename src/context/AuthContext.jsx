import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import apiurl from "../services/apiendpoint";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("auth_user");
      const storedToken = await AsyncStorage.getItem("auth_token");
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (e) {
      console.error("Failed to load auth", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    let response;
    try {
      response = await fetch(`${apiurl()}/auth/apilogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password }),
      });
    } catch (e) {
      throw new Error("Unable to reach the server. Check your connection.");
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error("Unexpected response from server");
    }

    if (!response.ok) {
      throw new Error(data?.message || "Invalid email or password");
    }

    const apiUser = data.user;
    if (!apiUser || !apiUser.token) {
      throw new Error("Login response was missing required data");
    }

    // Separate the token from the user profile before storing/using
    const { token: authToken, ...userData } = apiUser;

    await AsyncStorage.setItem("auth_user", JSON.stringify(userData));
    await AsyncStorage.setItem("auth_token", authToken);

    setUser(userData);
    setToken(authToken);

    return userData;
  };

  const logout = async () => {
    await AsyncStorage.removeItem("auth_user");
    await AsyncStorage.removeItem("auth_token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}