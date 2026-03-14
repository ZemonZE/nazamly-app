import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, Modal, TextInput, ToastAndroid, Platform, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { auth, API_URL, storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { updateUserPhoto } from '@/utils/updatePhoto';

interface ProfileDetailProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}

const ProfileScreen = () => {
  const router = useRouter();
  const { user, backendUser, setBackendUser, refreshProfile } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileLoading, setProfileLoading] = useState(!backendUser); // Don't show spinner if data already exists

  // Edit Modal State
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [cgpaInput, setCgpaInput] = useState(backendUser?.currentCGPA?.toString() || "");
  const [creditsInput, setCreditsInput] = useState(backendUser?.earnedCreditHours?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    try {
      setProfileLoading(true);
      const token = await user.getIdToken(true);
      const url = `${API_URL}/api/auth/get-profile`;
      console.log("[Profile] Fetching:", url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[Profile] Non-JSON response from:", url, "status:", res.status);
        setProfileLoading(false);
        return;
      }
      const body = await res.json();
      if (res.ok && body.success) {
        setBackendUser(body.data);
        setCgpaInput(body.data?.currentCGPA?.toString() || "");
        setCreditsInput(body.data?.earnedCreditHours?.toString() || "");
      } else {
        console.error("[Profile] fetch failed:", body);
      }
    } catch (err) {
      console.error("[Profile] fetch error:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [user, setBackendUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Stop loading spinner when backendUser is received
  useEffect(() => {
    if (backendUser) {
      setProfileLoading(false);
    }
  }, [backendUser]);

  // Sync input fields when backendUser changes
  useEffect(() => {
    if (backendUser) {
      setCgpaInput(backendUser.currentCGPA?.toString() || "0.0");
      setCreditsInput(backendUser.earnedCreditHours?.toString() || "0");
    }
  }, [backendUser]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      router.replace("/(auth)/Login");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSaveProfile = async () => {
    // 1. Validate input
    const cgpa = parseFloat(cgpaInput);
    const credits = parseFloat(creditsInput);

    if (isNaN(cgpa) || isNaN(credits)) {
      Alert.alert("Invalid Input", "CGPA and Credit Hours must be valid numbers.");
      return;
    }

    // 2. Validate CGPA range (0-5.0)
    if (cgpa < 0 || cgpa > 5.0) {
      Alert.alert("Invalid Input", "CGPA must be between 0.0 and 5.0.");
      return;
    }

    // 3. Validate Credits (>= 0)
    if (credits < 0) {
      Alert.alert("Invalid Input", "Credit hours cannot be negative.");
      return;
    }

    setIsSaving(true);
    try {
      const token = await user?.getIdToken();
      console.log("[Profile] Saving profile with CGPA:", cgpa, "Credits:", credits);
      
      // 4. POST to /api/auth/setup-profile
      const res = await fetch(`${API_URL}/api/auth/setup-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentCGPA: cgpa,
          earnedCreditHours: credits
        })
      });

      const data = await res.json();
      console.log("[Profile] Save response:", data);
      
      if (res.ok && data.success) {
        // 5. Backend updated MongoDB successfully
        console.log("[Profile] Backend updated successfully");
        
        // 6. refreshProfile() fetches latest data from backend
        await refreshProfile();
        console.log("[Profile] Profile refreshed from backend");
        
        // 7. AuthContext updates backendUser (done by refreshProfile)
        // 8. UI updates automatically via backendUser state
        
        setEditModalVisible(false);
        
        if (Platform.OS === 'android') {
          ToastAndroid.showWithGravity("Profile updated successfully", ToastAndroid.SHORT, ToastAndroid.BOTTOM);
        } else {
          Alert.alert("Success", "Profile updated successfully");
        }
      } else {
        throw new Error(data.message || "Failed to save profile");
      }
    } catch (err: any) {
      console.error("[Profile] Save error:", err);
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to upload a profile picture.");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8, // Reduced quality for faster upload
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;
      
      // Immediately show the selected image locally (optimistic UI)
      setLocalPhotoUri(imageUri);
      setIsUploadingPhoto(true);
      console.log("[Profile] Selected image:", imageUri);

      // Upload in background
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const filename = `profile_photos/${user?.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      console.log("[Profile] Uploading to Firebase Storage...");
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log("[Profile] Upload complete. URL:", downloadURL);

      // Update database via backend
      await updateUserPhoto(downloadURL);
      console.log("[Profile] Database updated with photo URL");

      // Update local state immediately without full refresh
      if (backendUser) {
        setBackendUser({
          ...backendUser,
          photoURL: downloadURL
        });
      }
      
      // Clear local URI now that we have the real URL
      setLocalPhotoUri(null);

      if (Platform.OS === 'android') {
        ToastAndroid.showWithGravity("Profile photo updated", ToastAndroid.SHORT, ToastAndroid.BOTTOM);
      } else {
        Alert.alert("Success", "Profile photo updated");
      }
    } catch (err: any) {
      console.error("[Profile] Photo upload error:", err);
      setLocalPhotoUri(null); // Clear local URI on error
      Alert.alert("Error", err.message || "Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const displayName = user?.displayName || "Student";
  const displayEmail = user?.email || "No Email";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {profileLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={{ color: '#94a3b8', marginTop: 10 }}>Loading profile...</Text>
          </View>
        ) : (
          <>
        <Text style={styles.screenTitle}>Profile</Text>

        {/* User Info Card */}
        <View style={styles.infoCard}>
          {/* Header with Avatar */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {(localPhotoUri || backendUser?.photoURL) ? (
                  <Image 
                    source={{ uri: localPhotoUri || backendUser.photoURL }} 
                    style={styles.avatarImage} 
                  />
                ) : (
                  <Text style={styles.avatarText}>{initial}</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.addPhotoButton} 
                onPress={handlePhotoUpload}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="plus" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            <View>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{displayEmail}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details List */}
          <ProfileDetail icon="user" label="Name" value={displayName} />
          <ProfileDetail icon="mail" label="Email" value={displayEmail} />
          <ProfileDetail icon="hash" label="User ID" value={user?.uid.substring(0, 12) + '...' || 'N/A'} />
          <ProfileDetail icon="award" label="CGPA" value={backendUser?.currentCGPA?.toString() || (cgpaInput||"0.0").toString()} />
          <ProfileDetail icon="clock" label="Credit Hours" value={backendUser?.earnedCreditHours?.toString() || (creditsInput||"0").toString()} />
          <ProfileDetail icon="book-open" label="Department" value="Computer Science" />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.primaryButton} onPress={() => {
            setCgpaInput(backendUser?.currentCGPA?.toString() || "");
            setCreditsInput(backendUser?.earnedCreditHours?.toString() || "");
            setEditModalVisible(true);
        }}>
          <Feather name="edit-2" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Edit Academic Info</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <Feather name="log-out" size={20} color="#ef4444" />
          )}
          <Text style={styles.signOutText}>
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Academic Info</Text>
            
            <Text style={styles.inputLabel}>Current CGPA</Text>
            <TextInput 
              style={styles.modalInput}
              value={cgpaInput}
              onChangeText={setCgpaInput}
              keyboardType="numeric"
              placeholder="e.g. 3.5"
            />

            <Text style={styles.inputLabel}>Earned Credit Hours</Text>
            <TextInput 
              style={styles.modalInput}
              value={creditsInput}
              onChangeText={setCreditsInput}
              keyboardType="numeric"
              placeholder="e.g. 60"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.saveButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};


const ProfileDetail = ({ icon, label, value }: ProfileDetailProps) => (
  <View style={styles.detailRow}>
    <View style={styles.labelGroup}>
      <Feather name={icon} size={18} color="#94a3b8" />
      <Text style={styles.label}>{label}</Text>
    </View>
    <Text style={styles.value}>{value}</Text>
  </View>
);

// --- Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  userEmail: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 20 },
  detailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 18 
  },
  labelGroup: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 15, color: '#64748b', marginLeft: 10 },
  value: { fontSize: 15, fontWeight: '500', color: '#1e293b', flexShrink: 1, textAlign: 'right' },
  primaryButton: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 15,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  signOutButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  signOutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ProfileScreen;