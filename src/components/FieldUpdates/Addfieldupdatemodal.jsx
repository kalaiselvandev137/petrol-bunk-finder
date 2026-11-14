import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Modal, Platform,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BUTTON_SHADOW, COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import apiurl from '../../services/apiendpoint';

const OIL_COMPANIES = ['Indian Oil', 'Bharat Petroleum', 'Hindustan Petroleum', 'Reliance', 'Nayara Energy','Essar', 'Shell'];

const EMPTY_FORM = {
  Country_ID: '',
  Country_Name: '',
  State_ID: '',
  State_Name: '',
  City_ID: '',
  City_Name: '',
  Pincode: '',
  Complete_Address: '',
  Region: '',
  Bunk_Name: '',
  Oil_Company: '',
  Dealer_Name: '',
  Dealer_Contact: '',
  Visit_Notes: '',
};

// ---- helpers -------------------------------------------------------------

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---- small UI pieces ---------------------------------------------------------

function Field({ label, children }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-[#0B2559] mb-2">{label}</Text>
      {children}
    </View>
  );
}

function Input({ icon, readOnly, multiline, ...props }) {
  return (
    <View
      className={`flex-row rounded-xl px-3 border ${multiline ? 'items-start' : 'items-center'} ${
        readOnly ? 'bg-[#E9EFF8] border-[#E3EBF6]' : 'bg-[#F1F5FB] border-[#DCE6F4]'
      }`}
    >
      {icon && (
        <Ionicons name={icon} size={16} color={COLORS.muted} style={multiline ? { marginTop: 14 } : null} />
      )}
      <TextInput
        className={`flex-1 text-sm py-3 ${icon ? 'ml-2' : ''} ${readOnly ? 'text-[#7A8AA8]' : 'text-[#0B2559]'}`}
        placeholderTextColor={COLORS.faint}
        editable={!readOnly}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

// ---- modal ------------------------------------------------------------------

export default function AddFieldUpdateModal({ visible, onClose, onSaved }) {
  const { token, user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [coords, setCoords] = useState(null);
  const [image, setImage] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingStamp, setPendingStamp] = useState(null);
  const geocodeSeq = useRef(0);
  const stampRef = useRef(null);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  // ---- location -----------------------------------------------------------

  // coordinates -> name/pincode/address fields
  const applyCoords = useCallback(async (latitude, longitude) => {
    const seq = ++geocodeSeq.current;
    setCoords({ latitude, longitude });
    setLocLoading(true);
    setLocError(null);
    try {
      const [g] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (seq !== geocodeSeq.current) return;
      if (!g) throw new Error('No address found');

      const address =
        g.formattedAddress ||
        [g.name, g.street, g.district, g.subregion].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');

      setForm((prev) => ({
        ...prev,
        Country_ID: g.isoCountryCode === 'IN' ? '101' : '',
        Country_Name: g.country || '',
        State_ID: '',
        State_Name: g.region || '',
        City_ID: '',
        City_Name: g.city || g.subregion || g.district || '',
        Region: g.subregion || g.district || '',
        Pincode: g.postalCode || '',
        Complete_Address: address,
      }));
    } catch (e) {
      if (seq === geocodeSeq.current) setLocError('Could not read the address for this spot.');
    } finally {
      if (seq === geocodeSeq.current) setLocLoading(false);
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    setLocLoading(true);
    setLocError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocLoading(false);
        setLocError('Location permission is required. Enable it in Settings and retry.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await applyCoords(pos.coords.latitude, pos.coords.longitude);
    } catch (e) {
      setLocLoading(false);
      setLocError('Could not get your location. Turn on GPS and retry.');
    }
  }, [applyCoords]);

  // fresh form + auto location every time the modal opens
  useEffect(() => {
    if (!visible) return;
    setForm(EMPTY_FORM);
    setCoords(null);
    setImage(null);
    setError(null);
    fetchLocation();
  }, [visible, fetchLocation]);

  // ---- image --------------------------------------------------------------

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera permission is required to verify your face.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
      quality: 0.6,
    });
    if (!res.canceled) setImage(res.assets[0]);
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!res.canceled) setImage(res.assets[0]);
  };

  // ---- save ---------------------------------------------------------------

  const validate = () => {
    if (!coords) return 'Location not detected yet. Tap "Refresh" in the location section.';
    if (!form.Country_Name || !form.State_Name || !form.City_Name)
      return 'Location details are still loading. Wait a moment or tap "Refresh".';
    if (!/^\d{6}$/.test(form.Pincode)) return 'Enter a valid 6-digit pincode.';
    if (!form.Complete_Address.trim()) return 'Address is required.';
    if (!form.Region.trim()) return 'Region is required.';
    if (!form.Bunk_Name.trim()) return 'Bunk name is required.';
    if (!form.Oil_Company) return 'Select an oil company.';
    if (!form.Dealer_Name.trim()) return 'Dealer name is required.';
    if (!/^\d{10}$/.test(form.Dealer_Contact)) return 'Enter a valid 10-digit dealer contact.';
    if (!image) return 'Add a visit photo.';
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
      fd.append('Country_ID', form.Country_ID);
      fd.append('Country_Name', form.Country_Name);
      fd.append('Employee_Name', user?.First_Name || user?.firstName || user?.name || '');
      fd.append('Visit_Date', formatDate(new Date()));
      fd.append('Status', 'Submitted');
      fd.append('State_ID', form.State_ID);
      fd.append('State_Name', form.State_Name);
      fd.append('City_ID', form.City_ID);
      fd.append('City_Name', form.City_Name);
      fd.append('Region', form.Region.trim());
      fd.append('Pincode', form.Pincode);
      fd.append('Complete_Address', form.Complete_Address.trim());
      fd.append('Bunk_Name', form.Bunk_Name.trim());
      fd.append('Oil_Company', form.Oil_Company);
      fd.append('Dealer_Name', form.Dealer_Name.trim());
      fd.append('Dealer_Contact', form.Dealer_Contact);
      fd.append('Visit_Notes', form.Visit_Notes.trim());
      // fd.append('latitude', String(coords.latitude));
      // fd.append('longitude', String(coords.longitude)); 
      const visitImageFile = new File(image.uri);
      fd.append('Visit_Image', visitImageFile, image.fileName || `visit_${Date.now()}.jpg`);

      // don't set Content-Type: fetch adds the multipart boundary itself
      const res = await fetch(`${apiurl()}/fieldupdates/apisavefieldupdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Save failed');

      onSaved?.(json);
      onClose();
    } catch (e) {
      setError(e.message || 'Could not save the field update. Please try again.');
      if (/face/i.test(e.message || '')) setImage(null);
    } finally {
      setSaving(false);
    }
  };

  // ---- render -------------------------------------------------------------

  const submitDisabled = saving || locLoading;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-[#0B2559]" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <View>
            <Text className="text-xl font-extrabold text-white">Add field update</Text>
            <Text className="text-xs text-[#7DF3E6] mt-0.5">Location is detected automatically</Text>
          </View>
          <TouchableOpacity
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
            onPress={onClose}
            disabled={saving}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          className="bg-white rounded-t-[28px] overflow-hidden"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {locLoading && (
              <View className="flex-row items-center bg-[#E6FBF8] rounded-xl px-3 py-2.5 mb-4">
                <ActivityIndicator size="small" color={COLORS.teal} />
                <Text className="text-xs text-[#0A8F8F] font-medium ml-2">Detecting your location...</Text>
              </View>
            )}

            {locError && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
                <Text className="text-xs text-[#D93036] ml-1 flex-1">{locError}</Text>
                <TouchableOpacity onPress={fetchLocation} disabled={locLoading}>
                  <Text className="text-xs text-[#0A5BFF] font-semibold ml-2">Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <Field label="Country">
              <Input icon="globe-outline" value={form.Country_Name} readOnly placeholder="Detecting..." />
            </Field>
            <Field label="State">
              <Input
                icon="map-outline"
                readOnly
                value={form.State_Name}
                onChangeText={(t) => setForm((prev) => ({ ...prev, State_Name: t, State_ID: '' }))}
                placeholder="Detecting..."
              />
            </Field>
            <Field label="City">
              <Input
                icon="business-outline"
                readOnly
                value={form.City_Name}
                onChangeText={(t) => setForm((prev) => ({ ...prev, City_Name: t, City_ID: '' }))}
                placeholder="Detecting..."
              />
            </Field>
            <Field label="Pincode">
              <Input icon="keypad-outline"
                value={form.Pincode}
                onChangeText={(t) => set('Pincode')(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                readOnly={true}
                placeholder="Pincode"
              />
            </Field>
            <Field label="Complete address">
              <Input
                icon="location-outline"
                value={form.Complete_Address}
                onChangeText={set('Complete_Address')}
                readOnly
                placeholder="Address"
                multiline
              />
            </Field>
            <Field label="Region">
              <Input icon="compass-outline" value={form.Region} onChangeText={set('Region')} placeholder="e.g. Ujjain" />
            </Field>

            {/* ---- Bunk / dealer ---- */}
            <Field label="Bunk name">
              <Input icon="storefront-outline" value={form.Bunk_Name} onChangeText={set('Bunk_Name')} placeholder="Bunk name" />
            </Field>

            <Field label="Oil company">
              <View className="flex-row flex-wrap">
                {OIL_COMPANIES.map((opt) => {
                  const active = form.Oil_Company === opt;
                  return (
                    <TouchableOpacity key={opt} onPress={() => set('Oil_Company')(opt)}
                      className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${
                        active ? 'bg-[#0A5BFF] border-[#0A5BFF]' : 'bg-white border-[#DCE6F4]'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-[#5B6B8C]'}`}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>

            <Field label="Dealer name">
              <Input icon="person-outline" value={form.Dealer_Name} onChangeText={set('Dealer_Name')} placeholder="Dealer name" />
            </Field>
            <Field label="Dealer contact">
              <Input icon="call-outline" value={form.Dealer_Contact}
                onChangeText={(t) => set('Dealer_Contact')(t.replace(/[^0-9]/g, ''))}
                keyboardType="phone-pad" maxLength={10} placeholder="10-digit mobile number"
              />
            </Field>

            <Field label="Visit notes">
              <Input icon="document-text-outline" value={form.Visit_Notes}
                onChangeText={set('Visit_Notes')} placeholder="Add a note (optional)"
                multiline
              />
            </Field>

            {/* ---- Image ---- */}
            <Field label="Visit image">
              {image ? (
                <View>
                  <Image source={{ uri: image.uri }} className="w-full h-48 rounded-2xl bg-[#EEF3FA]" resizeMode="cover" />
                  <TouchableOpacity
                    className="absolute top-2 right-2 rounded-full w-8 h-8 items-center justify-center"
                    style={{ backgroundColor: 'rgba(11,37,89,0.7)' }}
                    onPress={() => setImage(null)}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row">
                  <TouchableOpacity
                    className="flex-1 py-5 rounded-2xl border border-dashed border-[#B9C8E0] bg-[#F7F9FC] items-center"
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera-outline" size={24} color={COLORS.blue} />
                    <Text className="text-xs text-[#0A5BFF] font-semibold mt-1">Take photo</Text>
                  </TouchableOpacity>
                </View>
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
              style={[
                { backgroundColor: submitDisabled ? '#9DBBFF' : '#0A5BFF' },
                submitDisabled ? null : BUTTON_SHADOW,
              ]}
              onPress={handleSave}
              disabled={submitDisabled}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text className="text-white font-semibold text-sm ml-2">Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}