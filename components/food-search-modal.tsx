// 식약처 영양 DB 검색·보정 모달
// 음식명 검색 → 후보 선택 → 그램수 입력 → 공식 영양값으로 보정 적용

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { scaleToFoodItem, searchFoodDb, type FoodDbItem } from '@/services/foodDb';
import type { FoodItem } from '@/types';

interface Props {
  visible: boolean;
  initialQuery: string;
  onClose: () => void;
  onApply: (food: FoodItem) => void;
}

export default function FoodSearchModal({ visible, initialQuery, onClose, onApply }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<FoodDbItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<FoodDbItem | null>(null);
  const [grams, setGrams] = useState('200');

  // 열릴 때 초기화 + 자동 검색
  useEffect(() => {
    if (visible) {
      setQuery(initialQuery);
      setSelected(null);
      setGrams('200');
      setError('');
      setResults([]);
      runSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialQuery]);

  async function runSearch(q: string) {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setError('');
    setSelected(null);
    try {
      const list = await searchFoodDb(term);
      setResults(list);
      if (list.length === 0) setError('검색 결과가 없어요. 더 단순한 이름으로 검색해 보세요. (예: "김치찌개")');
    } catch (e: any) {
      setError(e?.message ?? '검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const gramsNum = Math.max(0, Number(grams.replace(/[^0-9]/g, '')) || 0);
  const preview = selected ? scaleToFoodItem(selected, gramsNum) : null;

  function apply() {
    if (!selected || gramsNum <= 0) return;
    onApply(scaleToFoodItem(selected, gramsNum));
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topbar}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>닫기</Text>
          </TouchableOpacity>
          <Text style={styles.title}>식약처 영양 보정</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* 검색창 */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="음식 이름 (예: 김치찌개)"
              placeholderTextColor="#9AA0A6"
              returnKeyType="search"
              onSubmitEditing={() => runSearch(query)}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={() => runSearch(query)}>
              <Text style={styles.searchBtnText}>검색</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {loading ? (
            <ActivityIndicator color="#208AEF" style={{ marginTop: 24 }} />
          ) : selected ? (
            // ── 그램 입력 + 미리보기 ──
            <View style={styles.applyBox}>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={8}>
                <Text style={styles.backLink}>← 목록으로</Text>
              </TouchableOpacity>
              <Text style={styles.selName}>{selected.name}</Text>
              <Text style={styles.selMeta}>
                {selected.group} · 100g당 {selected.per100.calories}kcal
              </Text>

              <Text style={styles.gramsLabel}>먹은 양 (g)</Text>
              <View style={styles.gramsRow}>
                {[100, 200, 300].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.gramsChip, gramsNum === g && styles.gramsChipActive]}
                    onPress={() => setGrams(String(g))}>
                    <Text
                      style={[styles.gramsChipText, gramsNum === g && styles.gramsChipTextActive]}>
                      {g}g
                    </Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={styles.gramsInput}
                  value={grams}
                  onChangeText={setGrams}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>

              {preview ? (
                <View style={styles.previewCard}>
                  <Text style={styles.previewKcal}>
                    {preview.calories.toLocaleString()} kcal
                  </Text>
                  <Text style={styles.previewMacro}>
                    탄수 {preview.carbs}g · 단백 {preview.protein}g · 지방 {preview.fat}g · 당류{' '}
                    {preview.sugar}g
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.applyBtn} onPress={apply}>
                <Text style={styles.applyBtnText}>이 값으로 보정</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── 검색 결과 목록 ──
            <FlatList
              data={results}
              keyExtractor={(it, i) => it.foodCd || String(i)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultRow} onPress={() => setSelected(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultMeta}>{item.group || '기타'}</Text>
                  </View>
                  <Text style={styles.resultKcal}>{item.per100.calories}kcal/100g</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !error ? (
                  <Text style={styles.hint}>음식 이름을 검색하면 공식 영양성분이 나와요.</Text>
                ) : null
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEEF0',
  },
  close: { fontSize: 15, color: '#60646C', width: 40 },
  title: { fontSize: 17, fontWeight: '700', color: '#000' },

  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 16 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  searchBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  error: {
    color: '#E5484D',
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 12,
    lineHeight: 19,
  },
  hint: { fontSize: 14, color: '#9AA0A6', textAlign: 'center', marginTop: 40 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F4',
  },
  resultName: { fontSize: 15, fontWeight: '600', color: '#000' },
  resultMeta: { fontSize: 12, color: '#9AA0A6', marginTop: 2 },
  resultKcal: { fontSize: 13, color: '#208AEF', fontWeight: '700' },

  applyBox: { paddingHorizontal: 20, paddingTop: 16 },
  backLink: { fontSize: 14, color: '#208AEF', marginBottom: 14 },
  selName: { fontSize: 20, fontWeight: '800', color: '#000' },
  selMeta: { fontSize: 13, color: '#60646C', marginTop: 4 },
  gramsLabel: { fontSize: 14, fontWeight: '700', color: '#000', marginTop: 24, marginBottom: 10 },
  gramsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  gramsChip: {
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  gramsChipActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  gramsChipText: { fontSize: 14, color: '#60646C', fontWeight: '600' },
  gramsChipTextActive: { color: '#fff' },
  gramsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
  },

  previewCard: { backgroundColor: '#EAF3FF', borderRadius: 14, padding: 18, marginTop: 20 },
  previewKcal: { fontSize: 28, fontWeight: '800', color: '#1666C2' },
  previewMacro: { fontSize: 13, color: '#1A3A5C', marginTop: 6 },

  applyBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
