// 식사 기록 화면 — 사진 촬영/선택 → Gemini 분석 → 수정 → Firestore 저장
// 흐름: pick → analyzing → review(수정) → 저장

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { analyzeFoodImage } from '@/services/gemini';
import { saveMeal } from '@/services/meals';
import type { BloodSugarImpact, FoodItem, Meal, MealType } from '@/types';
import {
  BLOOD_SUGAR_LABELS,
  guessMealType,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  nowTime,
  todayKey,
} from '@/utils/date';

type Phase = 'pick' | 'analyzing' | 'review';

export default function AddMealScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // 분석 결과(수정 가능 상태)
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [impact, setImpact] = useState<BloodSugarImpact>('moderate');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [mealType, setMealType] = useState<MealType>(guessMealType());
  const [time, setTime] = useState(nowTime());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalCalories = foods.reduce((a, f) => a + (Number(f.calories) || 0), 0);
  const totalSugar = foods.reduce((a, f) => a + (Number(f.sugar) || 0), 0);

  async function pickFrom(source: 'camera' | 'library') {
    setError('');
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(
          source === 'camera'
            ? '카메라 권한이 필요합니다. 설정에서 허용해 주세요.'
            : '사진 접근 권한이 필요합니다. 설정에서 허용해 주세요.'
        );
        return;
      }

      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        setError('사진을 불러오지 못했습니다. 다시 시도해 주세요.');
        return;
      }
      setImageUri(asset.uri);
      await runAnalysis(asset.base64, asset.mimeType ?? 'image/jpeg');
    } catch {
      setError('사진을 여는 중 오류가 발생했습니다.');
    }
  }

  async function runAnalysis(base64: string, mimeType: string) {
    setPhase('analyzing');
    setError('');
    try {
      const res = await analyzeFoodImage(base64, mimeType);
      if (res.foods.length === 0) {
        setError(res.aiAnalysis || '음식을 인식하지 못했습니다. 다른 사진으로 시도해 주세요.');
        setPhase('pick');
        setImageUri(null);
        return;
      }
      setFoods(res.foods);
      setImpact(res.estimatedBloodSugarImpact);
      setAiAnalysis(res.aiAnalysis);
      setMealType(guessMealType());
      setTime(nowTime());
      setPhase('review');
    } catch (e: any) {
      setError(e?.message ?? '분석에 실패했습니다.');
      setPhase('pick');
      setImageUri(null);
    }
  }

  function updateFood(index: number, patch: Partial<FoodItem>) {
    setFoods((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  }

  function addEmptyFood() {
    setFoods((prev) => [
      ...prev,
      { name: '', calories: 0, carbs: 0, protein: 0, fat: 0, sugar: 0 },
    ]);
  }

  async function handleSave() {
    if (!user) return;
    if (foods.length === 0) {
      setError('최소 한 개의 음식이 필요합니다.');
      return;
    }
    setSaving(true);
    setError('');
    const meal: Omit<Meal, 'id'> = {
      date: todayKey(),
      mealType,
      time,
      foods: foods.map((f) => ({
        name: f.name.trim() || '음식',
        calories: Number(f.calories) || 0,
        carbs: Number(f.carbs) || 0,
        protein: Number(f.protein) || 0,
        fat: Number(f.fat) || 0,
        sugar: Number(f.sugar) || 0,
      })),
      totalCalories,
      totalSugar,
      estimatedBloodSugarImpact: impact,
      aiAnalysis,
      createdAt: Date.now(),
    };
    try {
      await saveMeal(user.uid, meal);
      router.back();
    } catch {
      setError('저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.cancel}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>식사 기록</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* ── 사진 선택 단계 ── */}
          {phase === 'pick' && (
            <View style={styles.pickBox}>
              <Text style={styles.pickHint}>
                음식 사진을 찍거나 갤러리에서 고르면{'\n'}AI가 칼로리와 영양을 추정해요.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => pickFrom('camera')}>
                <Text style={styles.primaryBtnText}>📷  사진 촬영</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickFrom('library')}>
                <Text style={styles.secondaryBtnText}>🖼️  갤러리에서 선택</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── 분석 중 ── */}
          {phase === 'analyzing' && (
            <View style={styles.analyzing}>
              <ActivityIndicator size="large" color="#208AEF" />
              <Text style={styles.analyzingText}>AI가 음식을 분석하고 있어요…</Text>
              <Text style={styles.analyzingSub}>보통 5~15초 걸려요</Text>
            </View>
          )}

          {/* ── 결과 수정 단계 ── */}
          {phase === 'review' && (
            <>
              {/* 끼니 선택 */}
              <Text style={styles.label}>끼니</Text>
              <View style={styles.chipRow}>
                {MEAL_TYPE_ORDER.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, mealType === t && styles.chipActive]}
                    onPress={() => setMealType(t)}>
                    <Text style={[styles.chipText, mealType === t && styles.chipTextActive]}>
                      {MEAL_TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 합계 카드 */}
              <View style={styles.totalCard}>
                <View>
                  <Text style={styles.totalLabel}>이 식사 합계</Text>
                  <Text style={styles.totalKcal}>
                    {totalCalories.toLocaleString()}
                    <Text style={styles.totalUnit}> kcal</Text>
                  </Text>
                  <Text style={styles.totalSub}>당류 약 {totalSugar}g</Text>
                </View>
                <View
                  style={[
                    styles.impactBadge,
                    { backgroundColor: BLOOD_SUGAR_LABELS[impact].color },
                  ]}>
                  <Text style={styles.impactBadgeText}>
                    혈당 {BLOOD_SUGAR_LABELS[impact].label}
                  </Text>
                </View>
              </View>

              {/* 혈당 영향 직접 조정 */}
              <Text style={styles.label}>혈당 영향 (직접 조정 가능)</Text>
              <View style={styles.chipRow}>
                {(['low', 'moderate', 'high'] as BloodSugarImpact[]).map((lv) => (
                  <TouchableOpacity
                    key={lv}
                    style={[styles.chip, impact === lv && styles.chipActive]}
                    onPress={() => setImpact(lv)}>
                    <Text style={[styles.chipText, impact === lv && styles.chipTextActive]}>
                      {BLOOD_SUGAR_LABELS[lv].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 음식 목록 (수정 가능) */}
              <Text style={styles.label}>인식된 음식 (수정 가능)</Text>
              {foods.map((f, i) => (
                <View key={i} style={styles.foodCard}>
                  <View style={styles.foodHeader}>
                    <TextInput
                      style={styles.foodName}
                      value={f.name}
                      placeholder="음식 이름"
                      placeholderTextColor="#9AA0A6"
                      onChangeText={(v) => updateFood(i, { name: v })}
                    />
                    <TouchableOpacity onPress={() => removeFood(i)} hitSlop={10}>
                      <Text style={styles.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.numRow}>
                    <NumField
                      label="kcal"
                      value={f.calories}
                      onChange={(n) => updateFood(i, { calories: n })}
                    />
                    <NumField
                      label="탄수(g)"
                      value={f.carbs}
                      onChange={(n) => updateFood(i, { carbs: n })}
                    />
                    <NumField
                      label="단백(g)"
                      value={f.protein}
                      onChange={(n) => updateFood(i, { protein: n })}
                    />
                    <NumField
                      label="지방(g)"
                      value={f.fat}
                      onChange={(n) => updateFood(i, { fat: n })}
                    />
                    <NumField
                      label="당류(g)"
                      value={f.sugar}
                      onChange={(n) => updateFood(i, { sugar: n })}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addFood} onPress={addEmptyFood}>
                <Text style={styles.addFoodText}>＋ 음식 직접 추가</Text>
              </TouchableOpacity>

              {/* AI 코멘트 */}
              {aiAnalysis ? (
                <View style={styles.aiCard}>
                  <Text style={styles.aiLabel}>AI 코칭</Text>
                  <Text style={styles.aiText}>{aiAnalysis}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>이 식사 저장</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retake}
                onPress={() => {
                  setPhase('pick');
                  setImageUri(null);
                  setFoods([]);
                  setError('');
                }}>
                <Text style={styles.retakeText}>다른 사진으로 다시</Text>
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                모든 수치는 AI 추정값입니다. 정확한 영양·혈당 관리는 의료 전문가와 상담하세요.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 숫자 입력 미니 필드
function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.numField}>
      <TextInput
        style={styles.numInput}
        value={String(value)}
        keyboardType="numeric"
        selectTextOnFocus
        onChangeText={(v) => {
          const n = Number(v.replace(/[^0-9]/g, ''));
          onChange(isFinite(n) ? n : 0);
        }}
      />
      <Text style={styles.numLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancel: { fontSize: 15, color: '#60646C', width: 40 },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  preview: { width: '100%', aspectRatio: 1, borderRadius: 20, marginBottom: 16, backgroundColor: '#E0E1E6' },
  error: {
    color: '#E5484D',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
    backgroundColor: '#FFF0F0',
    padding: 12,
    borderRadius: 12,
  },

  pickBox: { marginTop: 24, gap: 12 },
  pickHint: { fontSize: 15, color: '#60646C', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  primaryBtn: { backgroundColor: '#208AEF', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E1E6',
  },
  secondaryBtnText: { color: '#208AEF', fontSize: 16, fontWeight: '700' },

  analyzing: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  analyzingText: { fontSize: 16, fontWeight: '600', color: '#000', marginTop: 8 },
  analyzingSub: { fontSize: 13, color: '#9AA0A6' },

  label: { fontSize: 14, fontWeight: '700', color: '#000', marginTop: 20, marginBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  chipText: { fontSize: 14, color: '#60646C', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  totalCard: {
    backgroundColor: '#208AEF',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { color: '#D6E9FF', fontSize: 13, fontWeight: '600' },
  totalKcal: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  totalUnit: { fontSize: 16, fontWeight: '600' },
  totalSub: { color: '#D6E9FF', fontSize: 13, marginTop: 2 },
  impactBadge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  impactBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  foodCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDEEF0',
  },
  foodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  foodName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    paddingVertical: 4,
  },
  removeBtn: { fontSize: 16, color: '#9AA0A6', paddingHorizontal: 6 },
  numRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  numField: { flex: 1, alignItems: 'center' },
  numInput: {
    width: '100%',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FAFAFB',
  },
  numLabel: { fontSize: 10, color: '#9AA0A6', marginTop: 4 },

  addFood: {
    borderWidth: 1,
    borderColor: '#C9DCF5',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addFoodText: { color: '#208AEF', fontSize: 14, fontWeight: '600' },

  aiCard: { backgroundColor: '#EAF3FF', borderRadius: 14, padding: 16, marginTop: 20 },
  aiLabel: { fontSize: 12, fontWeight: '700', color: '#1666C2', marginBottom: 6 },
  aiText: { fontSize: 14, color: '#1A3A5C', lineHeight: 21 },

  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  retake: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  retakeText: { color: '#60646C', fontSize: 14 },
  disclaimer: {
    fontSize: 12,
    color: '#9AA0A6',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
});
