// THE MANIFESTATION CHAMBER — choose form, swap/recolor layers against a LIVE render of the entity
// in its current realm and state. Preview-before-buy; owned → Manifest, unowned → Unseal.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { colors, spacing, radii, type as typo } from '../src/constants/theme';
import { EntityView } from '../src/components/EntityView';
import { JuicyButton } from '../src/components/JuicyButton';
import { useManifestation } from '../src/hooks/useManifestation';
import { useCharacterConfig } from '../src/store/characterConfig';
import { api } from '../src/api/endpoints';
import { LAYER_ORDER, type CosmeticCategory } from '../src/constants/cosmetics';
import type { CosmeticCatalogEntry, FormCatalogEntry } from '../src/api/types';
import type { FormKey } from '../src/constants/forms';
import { fire } from '../src/lib/juice';

const TINTS = ['#7df9ff', '#ffd76a', '#ff5470', '#9b5cff', '#39ff88', '#f5f7ff'];

export default function ChamberScreen() {
  const manifestation = useManifestation();
  const setForm = useCharacterConfig((s) => s.setForm);
  const setOwnedForms = useCharacterConfig((s) => s.setOwnedForms);
  const equip = useCharacterConfig((s) => s.equip);
  const unequip = useCharacterConfig((s) => s.unequip);
  const savePreset = useCharacterConfig((s) => s.savePreset);

  const [forms, setForms] = useState<FormCatalogEntry[]>([]);
  const [category, setCategory] = useState<CosmeticCategory>('aura');
  const [items, setItems] = useState<CosmeticCatalogEntry[]>([]);

  useEffect(() => {
    api.entity.forms().then(({ forms }) => {
      setForms(forms);
      setOwnedForms(forms.filter((f) => f.owned).map((f) => f.formKey));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.cosmetics.list(category).then(({ cosmetics }) => setItems(cosmetics)).catch(() => {});
  }, [category]);

  const chooseForm = async (f: FormCatalogEntry) => {
    if (!f.owned) {
      Alert.alert(`Unseal ${f.name}`, 'This form is a premium manifestation. Acquire it to take its shape.');
      return;
    }
    try {
      await setForm(f.formKey as FormKey);
      fire('equip');
    } catch (e: any) {
      Alert.alert('Not yet manifested', e?.message ?? '');
    }
  };

  const chooseItem = async (it: CosmeticCatalogEntry) => {
    if (!it.owned) {
      Alert.alert(`Unseal ${it.name}`, 'Unseal this item with Void Crystals or a purchase to equip it.');
      return;
    }
    try {
      await equip({ itemKey: it.itemKey, category: it.category, defaultTint: it.defaultTint }, it.defaultTint);
      fire('equip');
    } catch (e: any) {
      Alert.alert('Could not equip', e?.message ?? '');
    }
  };

  const recolor = async (tint: string) => {
    const equipped = manifestation?.layers.find((l) => l.category === category && l.source === 'cosmetic');
    if (!equipped) return;
    await equip({ itemKey: equipped.itemKey, category, defaultTint: tint }, tint);
    fire('recolor');
  };

  if (!manifestation) return <View style={styles.fill} />;

  return (
    <View style={styles.fill}>
      <View style={styles.preview}>
        <EntityView manifestation={manifestation} size={200} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Form</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {forms.map((f) => (
            <Pressable key={f.formKey} onPress={() => chooseForm(f)} style={[styles.formCard, manifestation.formKey === f.formKey && styles.formActive]}>
              <Text style={styles.formName}>{f.name}</Text>
              <Text style={styles.formMeta}>{f.owned ? 'Manifest' : 'Unseal'}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Layer</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {LAYER_ORDER.map((c) => (
            <Pressable key={c} onPress={() => { fire('tap'); setCategory(c); }} style={[styles.chip, category === c && styles.chipOn]}>
              <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Recolor</Text>
        <View style={styles.tints}>
          {TINTS.map((t) => (
            <Pressable key={t} onPress={() => recolor(t)} style={[styles.tint, { backgroundColor: t }]} accessibilityLabel={`Recolor ${t}`} />
          ))}
          <Pressable onPress={() => { fire('tap'); unequip(category); }} style={styles.clear}>
            <Text style={styles.clearText}>clear</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{category} items</Text>
        <View style={styles.grid}>
          {items.map((it) => (
            <Pressable key={it.itemKey} onPress={() => chooseItem(it)} style={styles.item}>
              <View style={[styles.swatch, { backgroundColor: it.defaultTint ?? colors.void2 }]} />
              <Text style={styles.itemName}>{it.name}</Text>
              <Text style={[styles.itemTag, it.owned ? styles.owned : styles.unowned]}>{it.owned ? 'Manifest' : 'Unseal'}</Text>
            </Pressable>
          ))}
        </View>

        <JuicyButton label="Save as preset" tone="ghost" onPress={() => savePreset(`Preset ${Date.now() % 1000}`)} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.void0 },
  preview: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, backgroundColor: colors.void1 },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  label: { ...typo.label, color: colors.inkDim, marginTop: spacing.sm },
  rail: { gap: spacing.sm, paddingVertical: 4 },
  formCard: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.void1, alignItems: 'center', gap: 4 },
  formActive: { borderWidth: 1, borderColor: colors.ki },
  formName: { ...typo.body, color: colors.ink, fontWeight: '700' },
  formMeta: { ...typo.label, fontSize: 9, color: colors.inkDim },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.void1 },
  chipOn: { backgroundColor: colors.ki },
  chipText: { ...typo.label, color: colors.inkDim },
  chipTextOn: { color: colors.void0 },
  tints: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  tint: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.line },
  clear: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.sm, backgroundColor: colors.void2 },
  clearText: { ...typo.label, color: colors.inkDim },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { width: 96, backgroundColor: colors.void1, borderRadius: radii.md, padding: spacing.sm, gap: 4, alignItems: 'center' },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  itemName: { ...typo.label, fontSize: 10, color: colors.ink, textAlign: 'center' },
  itemTag: { ...typo.label, fontSize: 9 },
  owned: { color: colors.ki },
  unowned: { color: colors.gold },
});
