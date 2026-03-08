import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { auth } from '@/firebase';

interface ProfileDetailProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}

const ProfileScreen = () => {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const user = auth.currentUser;

  const displayName = user?.displayName || 'User';
  const email = user?.email || '';
  const initials = displayName.charAt(0).toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut(auth);
            // Root layout's onAuthStateChanged will redirect to login
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to sign out');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Profile</Text>

        {/* User Info Card */}
        <View style={styles.infoCard}>
          {/* Header with Avatar */}
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details List */}
          <ProfileDetail icon="user" label="Name" value={displayName} />
          <ProfileDetail icon="mail" label="Email" value={email} />
          {user?.uid && <ProfileDetail icon="hash" label="UID" value={user.uid.substring(0, 12) + '...'} />}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons name="card-outline" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>View Student Card</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={signingOut}>
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>{signingOut ? 'Signing Out...' : 'Sign Out'}</Text>
        </TouchableOpacity>
      </ScrollView>
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

// --- Styles (كما هي دون تغيير) ---
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
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
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
});

export default ProfileScreen;