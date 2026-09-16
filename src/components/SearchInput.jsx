import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  GOOGLE_PLACES_AUTOCOMPLETE_URL,
  GOOGLE_PLACE_DETAILS_URL,
  MAPS_API_KEY,
} from '../constants/config';

/**
 * SearchInput – Autocomplete location input using Google Places API.
 *
 * Props:
 *   placeholder   – Input placeholder text
 *   value         – Controlled text value
 *   onPlaceSelect – Called with { address, coords: { latitude, longitude } }
 *   leftIcon      – ReactNode rendered on the left of the input
 */
export default function SearchInput({ placeholder, value, onPlaceSelect, leftIcon, onClear }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef(null);

  // Keep local query in sync when parent sets value externally
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const fetchSuggestions = async (text) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const url =
        `${GOOGLE_PLACES_AUTOCOMPLETE_URL}` +
        `?input=${encodeURIComponent(text)}` +
        `&key=${MAPS_API_KEY}` +
        `&types=geocode|establishment`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK') {
        setSuggestions(data.predictions || []);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeText = (text) => {
    setQuery(text);
    // Debounce API calls by 400ms
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const handleSelectSuggestion = async (prediction) => {
    setShowDropdown(false);
    setSuggestions([]);
    setQuery(prediction.description);

    try {
      // Fetch place details to get coordinates
      const url =
        `${GOOGLE_PLACE_DETAILS_URL}` +
        `?place_id=${prediction.place_id}` +
        `&fields=geometry,formatted_address` +
        `&key=${MAPS_API_KEY}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        onPlaceSelect?.({
          address: prediction.description,
          coords: { latitude: lat, longitude: lng },
        });
      }
    } catch (err) {
      console.warn('Place details error:', err);
    }
  };

  return (
    <View className="relative mb-1">
      {/* Input row */}
     {/* Input row */}
<View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
  {leftIcon && <View className="mr-3">{leftIcon}</View>}

  <TextInput
    className="flex-1 text-gray-800 text-base"
    placeholder={placeholder}
    placeholderTextColor="#9CA3AF"
    value={query}
    onChangeText={handleChangeText}
    onFocus={() => query.length >= 3 && setShowDropdown(true)}
    autoCorrect={false}
  />

  {/* Loading indicator */}
  {loading && (
    <ActivityIndicator
      size="small"
      color="#3B82F6"
      className="ml-2"
    />
  )}

  {/* Cancel button */}
  {!loading && query.length > 0 && (
    <TouchableOpacity
      onPress={() => {
        setQuery('');
        setSuggestions([]);
        setShowDropdown(false);

        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        onClear?.();
      }}
      className="ml-2 w-7 h-7 rounded-full bg-gray-200 items-center justify-center"
      activeOpacity={0.7}
    >
      <Text className="text-gray-500 text-lg font-bold leading-5">
        ×
      </Text>
    </TouchableOpacity>
  )}
</View>

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <View className="absolute top-14 left-0 right-0 z-50 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                className={`px-4 py-3 ${
                  index < suggestions.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <Text className="text-gray-800 text-sm font-medium" numberOfLines={1}>
                  {item.structured_formatting?.main_text || item.description}
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                  {item.structured_formatting?.secondary_text || ''}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}