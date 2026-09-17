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

export default function SearchInput({
  placeholder,
  value,
  onPlaceSelect,
  leftIcon,
  onClear,
  history = [],
  onHistorySelect,
  onHistoryRemove,
  onClearHistory,
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef(null);
  const blurTimer = useRef(null);

  // Keep local query in sync when parent sets value externally
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

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
    setShowDropdown(true);
    // Debounce API calls by 400ms
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setShowDropdown(true);
  };

  const handleBlur = () => {
    // Delay so a tap on a dropdown row registers before it unmounts
    blurTimer.current = setTimeout(() => setShowDropdown(false), 150);
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

  const handleSelectHistoryItem = (item) => {
    setShowDropdown(false);
    setSuggestions([]);
    setQuery(item.address);
    onHistorySelect?.(item);
  };

  const isHistoryMode = query.trim().length === 0;
  const showHistoryDropdown =
    showDropdown && isHistoryMode && history.length > 0;
  const showSuggestionsDropdown =
    showDropdown && !isHistoryMode && suggestions.length > 0;

  return (
    <View className="relative mb-1">
      {/* Input row */}
      <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
        {leftIcon && <View className="mr-3">{leftIcon}</View>}

        <TextInput
          className="flex-1 text-gray-800 text-base"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
        />

        {/* Loading indicator */}
        {loading && (
          <ActivityIndicator size="small" color="#3B82F6" className="ml-2" />
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
            <Text className="text-gray-500 text-lg font-bold leading-5">×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent search history dropdown (shown when focused + empty) */}
      {showHistoryDropdown && (
        <View className="absolute top-14 left-0 right-0 z-50 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <View className="flex-row items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Recent
            </Text>
            {onClearHistory && (
              <TouchableOpacity onPress={() => onClearHistory()}>
                <Text className="text-red-500 text-xs font-medium">Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={history}
            keyExtractor={(item, index) => `${item.address}-${index}`}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View
                className={`flex-row items-center px-4 py-3 ${
                  index < history.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <TouchableOpacity
                  className="flex-1 flex-row items-center"
                  onPress={() => handleSelectHistoryItem(item)}
                  activeOpacity={0.7}
                >
                  <Text className="text-base mr-2">🕘</Text>
                  <Text
                    className="flex-1 text-gray-700 text-sm"
                    numberOfLines={2}
                  >
                    {item.address}
                  </Text>
                </TouchableOpacity>

                {onHistoryRemove && (
                  <TouchableOpacity
                    className="ml-3 px-2"
                    onPress={() => onHistoryRemove(item.address)}
                  >
                    <Text className="text-gray-400 text-lg">×</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        </View>
      )}

      {/* Place autocomplete suggestions dropdown (shown while typing) */}
      {showSuggestionsDropdown && (
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