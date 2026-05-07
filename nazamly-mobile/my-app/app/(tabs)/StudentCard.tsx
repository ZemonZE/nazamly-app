import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  Image, Alert, Platform, ToastAndroid,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/constants/theme';
import { useRouter } from 'expo-router';

const STUDENT_CARD_FRONT_KEY = '@nazamly_student_card_front';
const STUDENT_CARD_BACK_KEY = '@nazamly_student_card_back';

export default function StudentCardScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STUDENT_CARD_FRONT_KEY).then(v => setFrontUri(v));
    AsyncStorage.getItem(STUDENT_CARD_BACK_KEY).then(v => setBackUri(v));
  }, []);

  const pickImage = async (side: 'front' | 'back') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery permissions are required to upload a card.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 900 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );

      const uri = manipResult.uri;
      const key = side === 'front' ? STUDENT_CARD_FRONT_KEY : STUDENT_CARD_BACK_KEY;
      await AsyncStorage.setItem(key, uri);

      if (side === 'front') setFrontUri(uri);
      else setBackUri(uri);

      if (Platform.OS === 'android') {
        ToastAndroid.showWithGravity(
          `${side === 'front' ? 'Front' : 'Back'} side saved!`,
          ToastAndroid.SHORT,
          ToastAndroid.BOTTOM,
        );
      } else {
        Alert.alert('Saved', `${side === 'front' ? 'Front' : 'Back'} side saved on your device.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick image');
    }
  };

  const removeSide = async (side: 'front' | 'back') => {
    const key = side === 'front' ? STUDENT_CARD_FRONT_KEY : STUDENT_CARD_BACK_KEY;
    await AsyncStorage.removeItem(key);
    if (side === 'front') setFrontUri(null);
    else setBackUri(null);
  };

  const handleDone = () => {
    router.back();
  };

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={handleDone}>
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Student Card</Text>
            <Text style={s.subtitle}>Save your university ID for quick access</Text>
          </View>
        </View>

        {/* Privacy Notice */}
        <View style={s.privacyBanner}>
          <Ionicons name="shield-checkmark" size={20} color={colors.teal} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.privacyTitle}>Your data is secure</Text>
            <Text style={s.privacyText}>
              Card images are saved on your device only and are never shared or uploaded to any server.
            </Text>
          </View>
        </View>

        {/* Front Side */}
        <Text style={s.sideLabel}>Front Side</Text>
        {frontUri ? (
          <View style={s.cardPreview}>
            <Image source={{ uri: frontUri }} style={s.cardImage} resizeMode="cover" />
            <View style={s.cardActions}>
              <TouchableOpacity style={[s.cardActionBtn, { backgroundColor: colors.indigo }]} onPress={() => pickImage('front')}>
                <Feather name="refresh-cw" size={14} color="#fff" />
                <Text style={s.cardActionText}>Replace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.cardActionBtn, { backgroundColor: colors.redLight, borderWidth: 1, borderColor: colors.red + '40' }]} onPress={() => removeSide('front')}>
                <Feather name="trash-2" size={14} color={colors.red} />
                <Text style={[s.cardActionText, { color: colors.red }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.uploadBox} onPress={() => pickImage('front')}>
            <View style={s.uploadIconCircle}>
              <Feather name="credit-card" size={28} color={colors.indigo} />
            </View>
            <Text style={s.uploadTitle}>Upload Front Side</Text>
            <Text style={s.uploadHint}>Tap to select from gallery</Text>
          </TouchableOpacity>
        )}

        {/* Back Side */}
        <Text style={[s.sideLabel, { marginTop: 24 }]}>Back Side</Text>
        {backUri ? (
          <View style={s.cardPreview}>
            <Image source={{ uri: backUri }} style={s.cardImage} resizeMode="cover" />
            <View style={s.cardActions}>
              <TouchableOpacity style={[s.cardActionBtn, { backgroundColor: colors.teal }]} onPress={() => pickImage('back')}>
                <Feather name="refresh-cw" size={14} color="#fff" />
                <Text style={s.cardActionText}>Replace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.cardActionBtn, { backgroundColor: colors.redLight, borderWidth: 1, borderColor: colors.red + '40' }]} onPress={() => removeSide('back')}>
                <Feather name="trash-2" size={14} color={colors.red} />
                <Text style={[s.cardActionText, { color: colors.red }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.uploadBox} onPress={() => pickImage('back')}>
            <View style={[s.uploadIconCircle, { backgroundColor: colors.tealLight }]}>
              <Feather name="credit-card" size={28} color={colors.teal} />
            </View>
            <Text style={s.uploadTitle}>Upload Back Side</Text>
            <Text style={s.uploadHint}>Tap to select from gallery</Text>
          </TouchableOpacity>
        )}

        {/* Done Button */}
        {(frontUri || backUri) && (
          <TouchableOpacity style={s.doneBtn} onPress={handleDone}>
            <Feather name="check" size={18} color="#fff" />
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  privacyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 4,
    backgroundColor: colors.tealLight, borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: colors.teal + '30',
  },
  privacyTitle: { fontSize: 14, fontWeight: '700', color: colors.teal, marginBottom: 2 },
  privacyText: { fontSize: 12, color: colors.teal + 'CC', lineHeight: 18 },

  sideLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },

  uploadBox: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed', padding: 32, alignItems: 'center', gap: 8,
  },
  uploadIconCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.indigoPale,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  uploadHint: { fontSize: 13, color: colors.textMuted },

  cardPreview: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardImage: { width: '100%', height: 200, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cardActions: { flexDirection: 'row', gap: 10, padding: 12 },
  cardActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  cardActionText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.indigo, paddingVertical: 16, borderRadius: 16, marginTop: 28,
    shadowColor: colors.indigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
