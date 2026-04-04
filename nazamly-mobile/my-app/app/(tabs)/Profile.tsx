import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  Alert, ActivityIndicator, Modal, TextInput, ToastAndroid, Platform, Image, Switch,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/context/AuthContext';
import { auth, API_URL } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/constants/theme';
interface ProfileDetailProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: any;
}

const ProfileScreen = () => {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { user, backendUser, setBackendUser, refreshProfile } = useAuth();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileLoading, setProfileLoading] = useState(!backendUser);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [cgpaInput, setCgpaInput] = useState(backendUser?.currentCGPA?.toString() || '');
  const [creditsInput, setCreditsInput] = useState(backendUser?.earnedCreditHours?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) { setProfileLoading(false); return; }
    try {
      setProfileLoading(true);
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_URL}/api/auth/get-profile`, { headers: { Authorization: `Bearer ${token}` } });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) { setProfileLoading(false); return; }
      const body = await res.json();
      if (res.ok && body.success) {
        setBackendUser(body.data);
        setCgpaInput(body.data?.currentCGPA?.toString() || '');
        setCreditsInput(body.data?.earnedCreditHours?.toString() || '');
      }
    } catch (err) { console.error('[Profile] fetch error:', err); }
    finally { setProfileLoading(false); }
  }, [user, setBackendUser]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { if (backendUser) setProfileLoading(false); }, [backendUser]);
  useEffect(() => {
    if (backendUser) {
      setCgpaInput(backendUser.currentCGPA?.toString() || '0.0');
      setCreditsInput(backendUser.earnedCreditHours?.toString() || '0');
    }
  }, [backendUser]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try { await signOut(auth); router.replace('/(auth)/Login'); }
    catch { Alert.alert('Error', 'Failed to sign out. Please try again.'); }
    finally { setIsSigningOut(false); }
  };

  const handleSaveProfile = async () => {
    const cgpa = parseFloat(cgpaInput);
    const credits = parseFloat(creditsInput);
    if (isNaN(cgpa) || isNaN(credits)) return Alert.alert('Invalid Input', 'Please enter valid numbers');
    if (cgpa < 0 || cgpa > 5.0) return Alert.alert('Invalid Input', 'CGPA must be between 0 and 5.0.');
    if (credits < 0) return Alert.alert('Invalid Input', 'Credit hours cannot be negative.');
    setIsSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`${API_URL}/api/auth/setup-profile`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentCGPA: cgpa, earnedCreditHours: credits }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshProfile(); setEditModalVisible(false);
        if (Platform.OS === 'android') { ToastAndroid.showWithGravity('Profile updated successfully', ToastAndroid.SHORT, ToastAndroid.BOTTOM); }
        else { Alert.alert('Success', 'Profile updated successfully'); }
      } else { throw new Error(data.message || 'Failed to save profile'); }
    } catch (err: any) { Alert.alert('Error', err.message || 'Failed to update profile'); }
    finally { setIsSaving(false); }
  };

  const handlePhotoUpload = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission Required', 'Please allow access to your photo library.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (result.canceled) return;
      const imageUri = result.assets[0].uri;
      setLocalPhotoUri(imageUri); setIsUploadingPhoto(true); setUploadProgress(10);
      const ctx = ImageManipulator.ImageManipulator.manipulate(imageUri);
      ctx.resize({ width: 800 });
      const rendered = await ctx.renderAsync();
      const saved = await rendered.saveAsync({ compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
      setUploadProgress(30);
      const token = await user?.getIdToken();
      const formData = new FormData();
      if (Platform.OS === 'web') { const response = await fetch(saved.uri); const blob = await response.blob(); formData.append('photo', blob, 'photo.jpg'); }
      else { formData.append('photo', { uri: saved.uri, name: 'photo.jpg', type: 'image/jpeg' } as any); }
      const res = await fetch(`${API_URL}/api/auth/upload-photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      setUploadProgress(90);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed');
      setUploadProgress(100);
      if (backendUser) setBackendUser({ ...backendUser, photoURL: data.photoURL });
      setLocalPhotoUri(null);
      if (Platform.OS === 'android') { ToastAndroid.showWithGravity('Profile photo updated', ToastAndroid.SHORT, ToastAndroid.BOTTOM); }
      else { Alert.alert('Success', 'Profile photo updated'); }
    } catch (err: any) { setLocalPhotoUri(null); Alert.alert('Upload Failed', err.message || 'Failed to upload photo.'); }
    finally { setIsUploadingPhoto(false); setUploadProgress(0); }
  };

  const displayName = user?.displayName || 'Student';
  const displayEmail = user?.email || 'No Email';
  const initial = displayName.charAt(0).toUpperCase();
  const currentGpa = backendUser?.currentCGPA ?? 0;
  const isDeansList = currentGpa >= 3.7;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {profileLoading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={colors.indigo} />
            <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading Profile...</Text>
          </View>
        ) : (
          <>
            {/* Avatar Section */}
            <View style={s.avatarSection}>
              <TouchableOpacity style={s.avatarWrap} onPress={handlePhotoUpload} activeOpacity={0.85}>
                <View style={[s.avatar, { backgroundColor: colors.indigo, borderColor: colors.indigoPale }]}>
                  {(localPhotoUri || backendUser?.photoURL) ? (
                    <Image source={{ uri: localPhotoUri || backendUser.photoURL }} style={s.avatarImage} />
                  ) : (
                    <Text style={s.avatarInitial}>{initial}</Text>
                  )}
                  {isUploadingPhoto && <View style={s.avatarOverlay}><ActivityIndicator size="small" color="#fff" /></View>}
                </View>
                <View style={[s.cameraBtn, { backgroundColor: colors.indigo, borderColor: colors.bg }]}>
                  <Feather name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={[s.studentIdBadge, { backgroundColor: colors.indigoPale, flexDirection: 'row' }]}>
                <MaterialCommunityIcons name="card-account-details" size={13} color={colors.indigo} />
                <Text style={[s.studentIdText, { color: colors.indigo }]}>Student ID · {(user?.uid.substring(0, 8) || 'N/A').toUpperCase()}</Text>
              </View>
              <Text style={[s.profileName, { color: colors.textPrimary }]}>{displayName}</Text>
              <Text style={[s.profileEmail, { color: colors.textSecondary }]}>{displayEmail}</Text>
            </View>

            {isUploadingPhoto && (
              <View style={[s.progressBarOuter, { backgroundColor: colors.border }]}>
                <View style={[s.progressBarInner, { backgroundColor: colors.indigo, width: `${uploadProgress}%` as any }]} />
              </View>
            )}

            {/* Dean's List Badge */}
            {isDeansList && (
              <View style={[s.deansListCard, { backgroundColor: colors.tealLight, borderColor: colors.teal + '40', flexDirection: 'row' }]}>
                <View style={[s.deansListLeft, { flexDirection: 'row' }]}>
                  <MaterialCommunityIcons name="trophy" size={24} color={colors.teal} />
                  <View>
                    <Text style={[s.deansListTitle, { color: colors.teal }]}>Dean&apos;s List</Text>
                    <Text style={[s.deansListSub, { color: colors.teal + 'AA' }]}>Academic Excellence · GPA {currentGpa.toFixed(2)}</Text>
                  </View>
                </View>
                <Feather name="award" size={20} color={colors.teal} />
              </View>
            )}

            {/* Info Grid */}
            <View style={[s.infoGrid, { flexDirection: 'row' }]}>
              {[
                { icon: 'book', label: 'GPA', value: currentGpa.toFixed(2), color: colors.indigo },
                { icon: 'clock', label: 'Earned Hrs', value: (backendUser?.earnedCreditHours ?? 0).toString(), color: colors.teal },
                { icon: 'layers', label: 'Department', value: 'CS', color: colors.amber },
                { icon: 'calendar', label: 'Year', value: 'Year 3', color: colors.green },
              ].map(item => (
                <View key={item.label} style={[s.infoGridItem, { backgroundColor: colors.card }]}>
                  <Feather name={item.icon as any} size={18} color={item.color} />
                  <Text style={[s.infoGridLabel, { color: colors.textMuted }]}>{item.label}</Text>
                  <Text style={[s.infoGridValue, { color: colors.textPrimary }]}>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* Academic Details */}
            <View style={[s.detailsCard, { backgroundColor: colors.card }]}>
              <Text style={[s.detailsCardTitle, { color: colors.textMuted }]}>Academic Info</Text>
              <ProfileDetail icon="user" label="Full Name" value={displayName} colors={colors} />
              <View style={[s.divider, { backgroundColor: colors.divider }]} />
              <ProfileDetail icon="mail" label="Email" value={displayEmail} colors={colors} />
              <View style={[s.divider, { backgroundColor: colors.divider }]} />
              <ProfileDetail icon="hash" label="User ID" value={(user?.uid.substring(0, 12) || '') + '...'} colors={colors} />
            </View>

            {/* Preferences */}
            <View style={[s.settingsCard, { backgroundColor: colors.card }]}>
              <Text style={[s.detailsCardTitle, { color: colors.textMuted }]}>Preferences</Text>

              {/* Notifications Toggle */}
              <View style={[s.settingRow, { flexDirection: 'row' }]}>
                <View style={[s.settingLeft, { flexDirection: 'row' }]}>
                  <View style={[s.settingIcon, { backgroundColor: colors.indigoPale }]}>
                    <Feather name="bell" size={16} color={colors.indigo} />
                  </View>
                  <View>
                    <Text style={[s.settingLabel, { color: colors.textPrimary }]}>Notifications</Text>
                    <Text style={[s.settingSub, { color: colors.textMuted }]}>Stay updated on schedule changes</Text>
                  </View>
                </View>
                <Switch value={notifEnabled} onValueChange={setNotifEnabled}
                  trackColor={{ false: colors.border, true: colors.indigoLight }}
                  thumbColor={notifEnabled ? colors.indigo : colors.textMuted} />
              </View>

              <View style={[s.divider, { backgroundColor: colors.divider }]} />

              {/* Dark Mode Toggle */}
              <View style={[s.settingRow, { flexDirection: 'row' }]}>
                <View style={[s.settingLeft, { flexDirection: 'row' }]}>
                  <View style={[s.settingIcon, { backgroundColor: colors.amberLight }]}>
                    <Feather name={isDark ? 'sun' : 'moon'} size={16} color={colors.amber} />
                  </View>
                  <View>
                    <Text style={[s.settingLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
                    <Text style={[s.settingSub, { color: colors.textMuted }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                  </View>
                </View>
                <Switch value={isDark} onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.amberLight }}
                  thumbColor={isDark ? colors.amber : colors.textMuted} />
              </View>

              <View style={[s.divider, { backgroundColor: colors.divider }]} />

            </View>

            {/* Edit & Logout */}
            <TouchableOpacity style={[s.editButton, { borderColor: colors.indigo, backgroundColor: colors.indigoPale, flexDirection: 'row' }]}
              onPress={() => { setCgpaInput(backendUser?.currentCGPA?.toString() || ''); setCreditsInput(backendUser?.earnedCreditHours?.toString() || ''); setEditModalVisible(true); }}>
              <Feather name="edit-2" size={18} color={colors.indigo} />
              <Text style={[s.editButtonText, { color: colors.indigo }]}>Edit Academic Info</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.logoutButton, { borderColor: colors.red + '40', backgroundColor: colors.redLight, flexDirection: 'row' }]} onPress={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? <ActivityIndicator color={colors.red} size="small" /> : <Feather name="log-out" size={18} color={colors.red} />}
              <Text style={[s.logoutText, { color: colors.red }]}>{isSigningOut ? 'Logging out...' : 'Logout'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <View style={[s.modalHandleBar, { backgroundColor: colors.border }]} />
            <View style={[s.modalHeader, { flexDirection: 'row' }]}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}><Feather name="x" size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Current CGPA</Text>
            <TextInput style={[s.modalInput, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.textPrimary }]}
              value={cgpaInput} onChangeText={setCgpaInput} keyboardType="numeric" placeholder="e.g. 3.75" placeholderTextColor={colors.textMuted} />
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Credit Hours Earned</Text>
            <TextInput style={[s.modalInput, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.textPrimary }]}
              value={creditsInput} onChangeText={setCreditsInput} keyboardType="numeric" placeholder="e.g. 60" placeholderTextColor={colors.textMuted} />
            <View style={[s.modalActions, { flexDirection: 'row' }]}>
              <TouchableOpacity style={[s.cancelBtn, { backgroundColor: colors.bg }]} onPress={() => setEditModalVisible(false)} disabled={isSaving}>
                <Text style={[s.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.indigo }]} onPress={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Choices</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const ProfileDetail = ({ icon, label, value, colors }: ProfileDetailProps) => (
  <View style={[s.detailRow, { flexDirection: 'row' }]}>
    <View style={[s.detailLeft, { flexDirection: 'row' }]}>
      <Feather name={icon} size={16} color={colors.textMuted} />
      <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
    <Text style={[s.detailValue, { color: colors.textPrimary, textAlign: 'right' }]} numberOfLines={1}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110 },
  centered: { alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 10, fontSize: 14 },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3 },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: '900' },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5 },
  studentIdBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  studentIdText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  profileName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  profileEmail: { fontSize: 14 },
  progressBarOuter: { height: 4, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressBarInner: { height: '100%', borderRadius: 2 },
  deansListCard: { alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1 },
  deansListLeft: { alignItems: 'center', gap: 14 },
  deansListTitle: { fontSize: 15, fontWeight: '800' },
  deansListSub: { fontSize: 12, marginTop: 2 },
  infoGrid: { flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  infoGridItem: { width: '47%', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  infoGridLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6, textAlign: 'center' },
  infoGridValue: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  detailsCard: { borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  detailsCardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  divider: { height: 1, marginVertical: 12 },
  detailRow: { justifyContent: 'space-between', alignItems: 'center' },
  detailLeft: { alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '600', maxWidth: '55%' },
  settingsCard: { borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  settingRow: { alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { alignItems: 'center', gap: 12 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  settingSub: { fontSize: 12, marginTop: 1 },
  editButton: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, marginBottom: 12 },
  editButtonText: { fontSize: 15, fontWeight: '700' },
  logoutButton: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5 },
  logoutText: { fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 34 },
  modalHandleBar: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  modalInput: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 15 },
  modalActions: { justifyContent: 'flex-start', marginTop: 20, gap: 10 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  cancelBtnText: { fontWeight: '600' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  modalOverlayCentered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  dropdownContent: { width: '100%', borderRadius: 20, padding: 24, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  dropdownOption: { padding: 16, borderRadius: 14, marginBottom: 10, alignItems: 'center' },
  dropdownText: { fontSize: 16, fontWeight: '700' },
});

export default ProfileScreen;
