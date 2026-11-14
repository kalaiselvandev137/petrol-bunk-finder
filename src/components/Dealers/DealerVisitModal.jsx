import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Modal, Platform,
    ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BUTTON_SHADOW, COLORS, GLASS, SOFT_SHADOW } from '../../constants/theme';
import { VISIT_OUTCOMES } from '../../constants/visitOutcomes';
import { useAuth } from '../../context/AuthContext';
import apiurl from '../../services/apiendpoint';

const ON_SITE_RADIUS_M = 200;
const FOLLOW_UP_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
];

// ---- helpers ---------------------------------------------------------------

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

const toRad = (v) => (v * Math.PI) / 180;

// Haversine distance in meters
function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function Field({ label, children }) {
  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-[#0B2559] mb-2">{label}</Text>
      {children}
    </View>
  );
}

// ---- modal -----------------------------------------------------------------

export default function DealerVisitModal({ visible, dealer, onClose, onSaved }) {
  const { token, user } = useAuth();

  const [outcome, setOutcome] = useState('');
  const [followUpDays, setFollowUpDays] = useState(null);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const dealerCoords = useMemo(() => {
    const lat = parseFloat(dealer?.latitude);
    const lng = parseFloat(dealer?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
  }, [dealer]);

  const distance = coords && dealerCoords ? distanceMeters(coords, dealerCoords) : null;
  const onSite = distance != null ? distance <= ON_SITE_RADIUS_M : null;

  const fetchLocation = useCallback(async () => {
    setLocLoading(true);
    setLocError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError('Location permission is required to log a visit.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      setLocError('Could not get your location. Turn on GPS and retry.');
    } finally {
      setLocLoading(false);
    }
  }, []);

  // fresh form + auto location each time the modal opens
  useEffect(() => {
    if (!visible || !dealer) return;
    setOutcome('');
    setFollowUpDays(null);
    setNotes('');
    setImage(null);
    setCoords(null);
    setError(null);
    fetchLocation();
  }, [visible, dealer, fetchLocation]);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera permission is required to take a photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled) setImage(res.assets[0]);
  };

  const validate = () => {
    if (!coords) return 'Location not detected yet. Tap "Retry" in the location section.';
    if (!outcome) return 'Select the visit outcome.';
    if (outcome === 'Follow-up' && followUpDays == null) return 'Pick a follow-up date.';
    if (outcome === 'Not Interested' && !notes.trim()) return 'Add a short reason in notes.';
    return null;
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('Dealer_ID', dealer._id);
      fd.append('Lead_ID', dealer.Lead_ID || '');
      fd.append('Dealer_Name', dealer.Business_Name || '');
      fd.append('OMC', dealer.OMC || '');
      fd.append('Employee_Name', user?.First_Name || user?.firstName || user?.name || '');
      fd.append('Visit_Date', formatDate(new Date()));
      fd.append('Outcome', outcome);
      fd.append('Notes', notes.trim());
      fd.append(
        'Follow_Up_Date',
        outcome === 'Follow-up' && followUpDays != null ? formatDate(addDays(followUpDays)) : ''
      );
      fd.append('Latitude', String(coords.latitude));
      fd.append('Longitude', String(coords.longitude));
      fd.append('Distance_From_Dealer', distance != null ? String(Math.round(distance)) : '');
      fd.append('On_Site', onSite == null ? '' : String(onSite));
      if (image) {
        fd.append('Visit_Image', new File(image.uri), image.fileName || `dealer_visit_${Date.now()}.jpg`);
      }

      // don't set Content-Type: fetch adds the multipart boundary itself
      const res = await fetch(`${apiurl()}/dealervisits/apisavedealervisit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Save failed');

      onSaved?.(json);
      onClose();
    } catch {
      setError('Could not save the visit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!dealer) return null;

  // location banner state
  const locIcon = locLoading
    ? null
    : onSite === true
    ? { name: 'checkmark-circle', color: COLORS.teal }
    : onSite === false
    ? { name: 'warning', color: COLORS.warning }
    : { name: 'location-outline', color: COLORS.faint };

  const locText = locLoading
    ? 'Detecting your location...'
    : locError
    ? locError
    : !coords
    ? 'Location not detected'
    : distance == null
    ? 'Location captured (dealer location not on file)'
    : onSite
    ? `You are at the dealer (${formatDistance(distance)} away)`
    : `You are ${formatDistance(distance)} from the dealer`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-[#0B2559]" edges={['top']}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-5">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-extrabold text-white">Log Visit</Text>
            <Text className="text-xs text-[#7DF3E6] mt-1" numberOfLines={1}>
              {dealer.Business_Name} · {dealer.Lead_ID}
            </Text>
          </View>
          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: GLASS }}
            onPress={onClose}
            disabled={saving}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Body sheet */}
        <View className="flex-1 bg-[#F4F7FB] rounded-t-[28px] overflow-hidden">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Location check */}
              <View
                className="flex-row items-center bg-white rounded-2xl px-3 py-3 mb-5 border border-[#E3EBF6]"
                style={SOFT_SHADOW}
              >
                {locLoading ? (
                  <ActivityIndicator size="small" color={COLORS.blue} />
                ) : (
                  <Ionicons name={locIcon.name} size={18} color={locIcon.color} />
                )}
                <Text className="flex-1 text-xs text-[#5B6B8C] ml-2">{locText}</Text>
                <TouchableOpacity onPress={fetchLocation} disabled={locLoading}>
                  <Text className="text-xs font-semibold text-[#0A5BFF]">Retry</Text>
                </TouchableOpacity>
              </View>

              {/* Outcome */}
              <Field label="Outcome">
                <View className="flex-row flex-wrap">
                  {VISIT_OUTCOMES.map((o) => {
                    const active = outcome === o.id;
                    return (
                      <TouchableOpacity
                        key={o.id}
                        onPress={() => setOutcome(o.id)}
                        className="flex-row items-center px-3 py-2.5 rounded-xl border mr-2 mb-2"
                        style={{
                          backgroundColor: active ? o.strip : '#FFFFFF',
                          borderColor: active ? o.strip : '#DCE6F4',
                        }}
                      >
                        <Ionicons name={o.icon} size={14} color={active ? '#FFFFFF' : o.text} />
                        <Text
                          className="text-sm font-medium ml-1.5"
                          style={{ color: active ? '#FFFFFF' : COLORS.muted }}
                        >
                          {o.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>

              {/* Follow-up date */}
              {outcome === 'Follow-up' && (
                <Field label="Follow up on">
                  <View className="flex-row">
                    {FOLLOW_UP_OPTIONS.map((opt) => {
                      const active = followUpDays === opt.days;
                      return (
                        <TouchableOpacity
                          key={opt.days}
                          onPress={() => setFollowUpDays(opt.days)}
                          className={`flex-1 mr-2 py-2.5 rounded-xl items-center border ${
                            active ? 'bg-[#0A5BFF] border-[#0A5BFF]' : 'bg-white border-[#DCE6F4]'
                          }`}
                        >
                          <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-[#5B6B8C]'}`}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Field>
              )}

              {/* Notes */}
              <Field label={outcome === 'Not Interested' ? 'Reason (required)' : 'Notes'}>
                <View className="bg-[#F1F5FB] border border-[#E3EBF6] rounded-xl px-3">
                  <TextInput
                    className="text-sm text-[#0B2559] py-3 min-h-[80px]"
                    placeholder="What was discussed? (optional)"
                    placeholderTextColor={COLORS.faint}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </Field>

              {/* Photo (optional) */}
              <Field label="Photo (optional)">
                {image ? (
                  <View>
                    <Image
                      source={{ uri: image.uri }}
                      className="w-full h-44 rounded-2xl bg-[#E8EEF8]"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="absolute top-2 right-2 rounded-full w-8 h-8 items-center justify-center"
                      style={{ backgroundColor: 'rgba(11,37,89,0.65)' }}
                      onPress={() => setImage(null)}
                    >
                      <Ionicons name="close" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="py-4 rounded-xl border border-dashed border-[#C5D0E3] bg-white items-center"
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera-outline" size={22} color={COLORS.blue} />
                    <Text className="text-xs text-[#0A5BFF] font-semibold mt-1">Take photo</Text>
                  </TouchableOpacity>
                )}
              </Field>

              {error && (
                <View className="flex-row items-center mb-3">
                  <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
                  <Text className="text-xs text-[#D93036] ml-1 flex-1">{error}</Text>
                </View>
              )}

              <TouchableOpacity
                className="rounded-2xl py-3.5 items-center flex-row justify-center"
                style={[BUTTON_SHADOW, { backgroundColor: saving || locLoading ? COLORS.disabled : COLORS.blue }]}
                onPress={handleSave}
                disabled={saving || locLoading}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text className="text-white font-semibold text-sm ml-2">Save Visit</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}