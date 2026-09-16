import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { formatMoney, FulfilmentType, OrderLine } from '@/domain/orders';
import { useOrderStore } from '@/state/order-store';

const menu = [
  { id: 'bbq-pizza', name: 'BBQ Chicken Pizza', price: 249, category: 'PIZZA' },
  { id: 'farmhouse', name: 'Veg Farmhouse Pizza', price: 239, category: 'PIZZA' },
  { id: 'margherita', name: 'Margherita', price: 179, category: 'PIZZA' },
  { id: 'bbq-momo', name: 'BBQ Chicken Momo Combo', price: 159, category: 'MOMOS' },
  { id: 'cheese-momo', name: 'Cheese Garlic Momo Combo', price: 169, category: 'MOMOS' },
  { id: 'mocha', name: 'Iced Mocha', price: 159, category: 'DRINKS' },
  { id: 'blue-lagoon', name: 'Blue Lagoon', price: 79, category: 'DRINKS' },
  { id: 'mojito', name: 'Virgin Classic Mojito', price: 79, category: 'DRINKS' },
] as const;

export default function NewOrderScreen() {
  const router = useRouter();
  const { createOrder } = useOrderStore();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fulfilment, setFulfilment] = useState<FulfilmentType>('takeaway');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [lines]);

  const addItem = (item: (typeof menu)[number]) => setLines((current) => {
    const existing = current.find((line) => line.id === item.id);
    return existing ? current.map((line) => line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { id: item.id, name: item.name, unitPrice: item.price, quantity: 1 }];
  });
  const save = () => { if (lines.length) { createOrder({ customerName, customerPhone, fulfilment, lines }); router.back(); } };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ BACK</Text></Pressable><View><Text style={styles.title}>Create order</Text><Text style={styles.subtitle}>STAFF ORDER · SAVES AS NEW</Text></View><View style={styles.headerSpacer} /></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.menuPane}>{['PIZZA', 'MOMOS', 'DRINKS'].map((category) => <View key={category} style={styles.section}>
        <Text style={styles.sectionTitle}>{category}</Text><View style={styles.menuGrid}>{menu.filter((item) => item.category === category).map((item) => <Pressable key={item.id} onPress={() => addItem(item)} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemPrice}>{formatMoney(item.price)}</Text><Text style={styles.add}>＋ ADD</Text></Pressable>)}</View>
      </View>)}</View>
      <View style={styles.cartPane}>
        <Text style={styles.cartTitle}>Current order</Text>
        {lines.length === 0 ? <Text style={styles.emptyCart}>Tap a menu item to add it.</Text> : lines.map((line) => <View key={line.id} style={styles.cartLine}><Text style={styles.cartLineName}>{line.quantity} × {line.name}</Text><Text style={styles.cartLinePrice}>{formatMoney(line.quantity * line.unitPrice)}</Text></View>)}
        <View style={styles.divider} /><Text style={styles.fieldLabel}>CUSTOMER</Text>
        <TextInput value={customerName} onChangeText={setCustomerName} placeholder="Name" placeholderTextColor={palette.inkMuted} style={styles.input} />
        <TextInput value={customerPhone} onChangeText={setCustomerPhone} placeholder="Phone number" placeholderTextColor={palette.inkMuted} keyboardType="phone-pad" style={styles.input} />
        <Text style={styles.fieldLabel}>ORDER TYPE</Text><View style={styles.segmented}>{(['dine_in', 'takeaway', 'delivery'] as FulfilmentType[]).map((type) => <Pressable key={type} onPress={() => setFulfilment(type)} style={[styles.segment, fulfilment === type && styles.segmentActive]}><Text style={[styles.segmentText, fulfilment === type && styles.segmentTextActive]}>{type.replace('_', '-').toUpperCase()}</Text></Pressable>)}</View>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.total}>{formatMoney(total)}</Text></View><ActionButton label="SAVE NEW ORDER" onPress={save} disabled={!lines.length} /><Text style={styles.inventoryNote}>No stock action occurs until staff accepts this order.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas }, header: { minHeight: 82, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: palette.border },
  back: { width: 80, color: palette.olive, fontWeight: '900', fontSize: 12, letterSpacing: 1 }, title: { textAlign: 'center', color: palette.ink, fontFamily: typography.serif, fontSize: 26, fontWeight: '800' }, subtitle: { textAlign: 'center', color: palette.inkMuted, fontFamily: typography.sans, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 }, headerSpacer: { width: 80 },
  content: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.xl, gap: spacing.xl }, menuPane: { flex: 2, minWidth: 320 }, cartPane: { flex: 1, minWidth: 300, backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.xl, gap: spacing.md, alignSelf: 'flex-start' },
  section: { marginBottom: spacing.xl }, sectionTitle: { color: palette.olive, fontFamily: typography.sans, fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: spacing.md }, menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  menuItem: { width: 190, minHeight: 128, backgroundColor: palette.surface, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, padding: spacing.lg }, pressed: { opacity: 0.72 }, itemName: { color: palette.ink, fontFamily: typography.serif, fontSize: 18, fontWeight: '700', flex: 1 }, itemPrice: { color: palette.inkMuted, fontFamily: typography.sans, fontWeight: '700', marginTop: spacing.md }, add: { color: palette.olive, fontFamily: typography.sans, fontWeight: '900', fontSize: 10, letterSpacing: 1, marginTop: spacing.sm },
  cartTitle: { color: palette.ink, fontFamily: typography.serif, fontSize: 24, fontWeight: '800' }, emptyCart: { color: palette.inkMuted, paddingVertical: spacing.xl }, cartLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, cartLineName: { flex: 1, color: palette.ink, fontFamily: typography.sans, fontWeight: '700' }, cartLinePrice: { color: palette.inkMuted, fontFamily: typography.sans, fontWeight: '700' },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: spacing.sm }, fieldLabel: { color: palette.inkMuted, fontFamily: typography.sans, fontWeight: '900', fontSize: 10, letterSpacing: 1.2, marginTop: spacing.sm }, input: { minHeight: 46, borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, color: palette.ink, backgroundColor: palette.canvas },
  segmented: { flexDirection: 'row', backgroundColor: palette.surfaceMuted, borderRadius: radii.sm, padding: 3 }, segment: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }, segmentActive: { backgroundColor: palette.olive }, segmentText: { color: palette.inkMuted, fontSize: 9, fontWeight: '900' }, segmentTextActive: { color: palette.white },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md }, totalLabel: { color: palette.inkMuted, fontWeight: '900', letterSpacing: 1 }, total: { color: palette.ink, fontFamily: typography.serif, fontSize: 30, fontWeight: '800' }, inventoryNote: { color: palette.inkMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
