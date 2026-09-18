import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/action-button';
import { BottomDrawer } from '@/components/bottom-drawer';
import { ErrorNotice, Field, ModeBanner, Page, Panel, ui } from '@/components/ui';
import { palette, typography } from '@/constants/theme';
import type { MenuItem } from '@/domain/menu';
import { formatMoney, isClosed, type NewOrderInput, type Order } from '@/domain/orders';
import { errorMessage } from '@/services/order-repository';
import { previewId } from '@/services/preview-repository';
import { useOrders } from '@/state/order-queries';
import { CartProvider, useCart, useCartApi } from '@/state/cart-context';
import { cartCount, cartDirty, cartTotal, checkoutError } from '@/state/cart-store';

export default function NewOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { orders, mode, loading } = useOrders();
  const order = orders.find(o => o.id === orderId);
  if (mode !== 'preview') return <Page title="Order entry unavailable"><Panel><Text style={ui.body}>Connect an authorized staff service before creating or editing live orders.</Text></Panel></Page>;
  if (orderId && !order) return <Page title={loading ? 'Loading…' : 'Order unavailable'}><Text style={ui.body}>Return to the board and open a current ticket.</Text></Page>;
  if (order && isClosed(order)) return <Page title="Order closed"><Text style={ui.body}>This order cannot be edited.</Text></Page>;
  return <CartProvider key={orderId ?? 'new'} order={order}><Composer /></CartProvider>;
}

function Composer() {
  const router = useRouter();
  const navigation = useNavigation();
  const cart = useCartApi();
  const baseline = useCart(s => s.baseline);
  const drawer = useCart(s => s.drawer);
  const count = useCart(cartCount);
  const total = useCart(cartTotal);
  const draftDirty = useCart(cartDirty);
  const setDrawer = useCart(s => s.setDrawer);
  const { orders, createOrder, mutate, busy } = useOrders();
  const [configuring, setConfiguring] = useState<MenuItem>();
  const [error, setError] = useState<string>();
  const [savedOrder, setSavedOrder] = useState<Order>();
  const [saving, setSaving] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<NavigationAction>();
  const request = useRef<{ signature: string; id: string } | null>(null);
  const submitting = useRef(false);
  const committed = useRef(false);
  const changed = !!baseline && orders.find(o => o.id === baseline.id)?.version !== baseline.version;
  const working = saving || busy.includes(baseline?.id ?? 'create');
  const locked = working || changed || !!savedOrder;
  const dirty = !savedOrder && (draftDirty || !!configuring);
  usePreventRemove(dirty || saving, ({ data }) => {
    if (committed.current) navigation.dispatch(data.action);
    else if (!submitting.current) { setDrawer('closed'); setConfiguring(undefined); setPendingNavigation(data.action); }
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const save = async (accept: boolean) => {
    if (submitting.current || locked) return;
    const s = cart.getState();
    const invalid = checkoutError(s);
    if (invalid) { setError(invalid); return; }
    submitting.current = true; setSaving(true); setError(undefined);
    try {
      let result: Order;
      if (baseline) {
        result = await mutate(baseline, { action: 'edit', payload: { lines: s.lines, note: s.notes, removalDispositions: s.dispositions } });
      } else {
        const input: NewOrderInput = { customerName: s.customerName.trim(), customerPhone: s.customerPhone || undefined,
          fulfilment: s.fulfilment, tableNumber: s.fulfilment === 'dine_in' ? Number(s.table) : undefined, notes: s.notes, lines: s.lines };
        const signature = JSON.stringify(input);
        if (!request.current || request.current.signature !== signature) request.current = { signature, id: previewId('preview-checkout') };
        result = await createOrder(input, request.current.id);
        committed.current = true; setSavedOrder(result);
        if (accept) {
          try { result = await mutate(result, { action: 'accept' }); }
          catch (e) { setError('Order saved as new. Acceptance did not finish: ' + errorMessage(e)); return; }
        }
      }
      committed.current = true; setDrawer('closed');
      router.replace({ pathname: '/order/[id]', params: { id: result.id } });
    } catch (e) { setError(errorMessage(e)); }
    finally { submitting.current = false; setSaving(false); }
  };
  const issue = changed && !savedOrder ? 'This ticket changed. Reopen it before saving your edits.' : error;
  const closeDrawer = () => { setDrawer('closed'); setError(undefined); };
  const openCart = () => { setError(undefined); setDrawer('cart'); };

  return <SafeAreaView style={ui.safe}>
    <View style={ui.header}>
      <ActionButton label="‹ BACK" variant="secondary" disabled={working} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={ui.title}>{baseline ? 'Edit ' + baseline.displayNumber : 'New order'}</Text><Text style={ui.muted}>{baseline ? 'Update items, then review changes' : 'Choose something good'}</Text></View>
    </View>
    <ModeBanner />
    {!!issue && drawer === 'closed' && <View style={{ padding: 16 }}><ErrorNotice message={issue} /></View>}
    <MenuBrowser disabled={locked} onConfigure={setConfiguring} onError={setError} />
    <View style={styles.dock}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Open cart, ' + count + ' items, ' + formatMoney(total)} onPress={openCart} disabled={working} style={styles.dockButton}>
        <View style={styles.bagCount}><Text style={styles.bagCountText}>{count}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.dockTitle}>{count ? 'View cart' : 'Your cart is empty'}</Text><Text style={styles.dockHint}>{count ? 'Review items & continue' : 'Add items from the menu'}</Text></View>
        <Text style={styles.dockTotal}>{formatMoney(total)}  ↑</Text>
      </Pressable>
    </View>

    <BottomDrawer visible={drawer !== 'closed'} onClose={closeDrawer} busy={working}
      title={drawer === 'customer' ? 'Customer & order type' : 'Your cart (' + count + ')'}
      subtitle={baseline ? 'Review revision changes' : drawer === 'customer' ? 'STEP 2 OF 2 · CUSTOMER DETAILS' : 'STEP 1 OF 2 · REVIEW ITEMS'}
      footer={<>
        <View style={ui.between}><Text style={ui.label}>Order total</Text><Text style={ui.section}>{formatMoney(total)}</Text></View>
        {savedOrder ? <ActionButton label="OPEN SAVED ORDER" onPress={() => { committed.current = true; setDrawer('closed'); router.replace({ pathname: '/order/[id]', params: { id: savedOrder.id } }); }} /> :
          drawer === 'cart' && !baseline ? <ActionButton label="CONTINUE TO CUSTOMER DETAILS →" disabled={locked || !count} onPress={() => { setError(undefined); setDrawer('customer'); }} /> :
          <><ActionButton label={baseline ? 'SAVE REVISION' : 'SAVE ORDER'} disabled={locked || !count} busy={working} onPress={() => void save(false)} />
            {!baseline && <ActionButton label="SAVE & ACCEPT" variant="secondary" disabled={locked || !count} onPress={() => void save(true)} />}</>}
      </>}>
      <ErrorNotice message={issue} />
      {drawer === 'customer' ? <CustomerStep disabled={locked} onBack={openCart} /> : <CartContents disabled={locked} />}
      {drawer === 'cart' && <ActionButton label="＋ ADD MORE ITEMS" variant="secondary" disabled={working} onPress={closeDrawer} />}
    </BottomDrawer>

    {configuring && <ItemCustomizer key={configuring.id} item={configuring} onClose={() => setConfiguring(undefined)} />}
    <BottomDrawer visible={!!pendingNavigation} title="Discard unsaved changes?" onClose={() => setPendingNavigation(undefined)}>
      <Text style={ui.body}>Your cart has not been saved.</Text>
      <ActionButton label="KEEP EDITING" onPress={() => setPendingNavigation(undefined)} />
      <ActionButton label="DISCARD CHANGES" variant="danger" onPress={() => { if (pendingNavigation) navigation.dispatch(pendingNavigation); setPendingNavigation(undefined); }} />
    </BottomDrawer>
  </SafeAreaView>;
}

function MenuBrowser({ disabled, onConfigure, onError }: { disabled: boolean; onConfigure: (item: MenuItem) => void; onError: (message: string | undefined) => void }) {
  const { menu, loading, error, refresh } = useOrders();
  const query = useCart(s => s.query); const setQuery = useCart(s => s.setQuery);
  const category = useCart(s => s.category); const setCategory = useCart(s => s.setCategory);
  const addItem = useCart(s => s.addItem);
  const { width } = useWindowDimensions();
  const availableWidth = Math.min(width, 1160);
  const columns = width >= 1000 ? 4 : width >= 650 ? 3 : 2;
  const filtered = menu.filter(m => (category === 'All' || m.category === category) && (m.name + ' ' + m.category).toLowerCase().includes(query.toLowerCase()));
  return <View style={{ flex: 1, width: '100%', maxWidth: 1160, alignSelf: 'center' }}>
    <View style={{ padding: 16, paddingBottom: 8 }}><Field label="Search menu" placeholder="Pizza, momos, drinks…" value={query} onChangeText={setQuery} editable={!disabled} /></View>
    <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{['All', ...new Set(menu.map(m => m.category))].map(c =>
      <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: c === category }} onPress={() => setCategory(c)} style={[styles.category, category === c && styles.categoryActive]}><Text style={[styles.categoryText, category === c && { color: palette.white }]}>{c === 'All' ? 'All items' : c.charAt(0) + c.slice(1).toLowerCase()}</Text></Pressable>)}</ScrollView></View>
    {error && <View style={{ padding: 16 }}><ErrorNotice message={error} /><ActionButton label="RETRY MENU" onPress={() => void refresh()} /></View>}
    {loading && !menu.length ? <ActivityIndicator accessibilityLabel="Loading menu" style={{ padding: 30 }} color={palette.olive} /> :
      <FlatList key={columns} data={filtered} numColumns={columns} keyExtractor={m => m.id} keyboardShouldPersistTaps="handled"
        columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<Text style={ui.muted}>No items match your search.</Text>}
        renderItem={({ item }) => <View style={[styles.menuCard, { width: (availableWidth - 32 - (columns - 1) * 12) / columns }]}>
          <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={'Customize ' + item.name} onPress={() => onConfigure(item)} style={{ flex: 1, minHeight: 96, gap: 10 }}>
            <Text style={styles.menuCategory}>{item.category}</Text><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemHint}>{item.groups.length ? 'Choose your options' : 'Add a preparation note'}</Text>
          </Pressable>
          <View style={ui.between}><Text style={styles.price}>{formatMoney(item.price)}</Text><ActionButton label="＋" accessibilityLabel={'Add ' + item.name} disabled={disabled} onPress={() => { if (item.groups.length) onConfigure(item); else onError(addItem(item) ?? undefined); }} /></View>
        </View>} />}
  </View>;
}

function CartContents({ disabled }: { disabled: boolean }) {
  const s = useCart(s => s);
  const [clearConfirm, setClearConfirm] = useState(false);
  const reduced = s.baseline?.stockConsumedAt ? s.baseline.lines.filter(l => (s.lines.find(n => n.id === l.id)?.quantity ?? 0) < l.quantity) : [];
  return <>
    {!s.lines.length ? <Text style={ui.body}>Your cart is empty. Add something from the menu.</Text> : <>
      <View style={ui.between}><Text style={ui.muted}>{cartCount(s)} items · {s.lines.length} lines</Text><ActionButton label="CLEAR CART" variant="secondary" disabled={disabled} onPress={() => setClearConfirm(true)} /></View>
      {clearConfirm && <Panel><Text style={ui.body}>Remove all items from this cart?</Text><View style={ui.row}><ActionButton label="KEEP ITEMS" variant="secondary" onPress={() => setClearConfirm(false)} /><ActionButton label="CLEAR" variant="danger" disabled={disabled} onPress={() => { s.clearCart(); setClearConfirm(false); }} /></View></Panel>}
      {s.lines.map(l => <View key={l.id} style={{ gap: 10 }}>
        <View style={ui.between}><Text style={[ui.label, { flex: 1 }]}>{l.name}</Text><Text style={ui.body}>{formatMoney(l.quantity * l.unitPrice)}</Text></View>
        {!!l.modifiers.length && <Text style={ui.muted}>{l.modifiers.join(' · ')}</Text>}
        <View style={ui.row}><ActionButton label="−" accessibilityLabel={'Decrease ' + l.name} variant="secondary" disabled={disabled || l.quantity <= 1} onPress={() => s.changeQuantity(l.id, -1)} /><Text style={ui.body}>{l.quantity}</Text><ActionButton label="＋" accessibilityLabel={'Increase ' + l.name} variant="secondary" disabled={disabled || l.quantity >= 100} onPress={() => s.changeQuantity(l.id, 1)} /><ActionButton label="REMOVE" accessibilityLabel={'Remove ' + l.name} variant="secondary" disabled={disabled} onPress={() => s.removeLine(l.id)} /></View>
        <Field label={'Note for ' + l.name} value={l.note} maxLength={500} onChangeText={note => s.setLineNote(l.id, note)} editable={!disabled} />
        <View style={ui.divider} />
      </View>)}
    </>}
    {reduced.map(l => <View key={l.id} style={{ gap: 8 }}><Text style={ui.label}>Removed from {l.name}: unused or waste?</Text><View style={ui.row}>{(['unused', 'waste'] as const).map(d => <ActionButton key={d} label={d.toUpperCase()} variant={s.dispositions[l.id] === d ? 'primary' : 'secondary'} disabled={disabled} onPress={() => s.setDisposition(l.id, d)} />)}</View></View>)}
    {!!s.baseline && <><Field label="Order note" value={s.notes} onChangeText={v => s.setCustomer('notes', v)} maxLength={1000} multiline editable={!disabled} /><Text style={ui.muted}>Existing choices and prices are preserved. Added items need preparation before marking ready.</Text></>}
  </>;
}

function CustomerStep({ disabled, onBack }: { disabled: boolean; onBack: () => void }) {
  const s = useCart(s => s);
  return <>
    <ActionButton label="‹ BACK TO CART" variant="secondary" disabled={disabled} onPress={onBack} />
    <Text style={ui.label}>How is the order being served?</Text>
    <View style={ui.row}>{([{ value: 'dine_in', title: 'Dine-in', detail: 'Serve at a table' }, { value: 'takeaway', title: 'Takeaway', detail: 'Pack to go' }] as const).map(t =>
      <Pressable key={t.value} accessibilityRole="radio" accessibilityState={{ checked: s.fulfilment === t.value, disabled }} disabled={disabled} onPress={() => s.setFulfilment(t.value)} style={[styles.fulfilment, s.fulfilment === t.value && styles.fulfilmentSelected]}><Text style={ui.label}>{s.fulfilment === t.value ? '● ' : '○ '}{t.title}</Text><Text style={ui.muted}>{t.detail}</Text></Pressable>)}</View>
    {s.fulfilment === 'dine_in' && <Field label="Table number *" placeholder="e.g. 3" keyboardType="number-pad" maxLength={4} value={s.table} onChangeText={v => s.setCustomer('table', v)} editable={!disabled} />}
    <Field label="Customer name *" placeholder="Who is the order for?" value={s.customerName} maxLength={120} onChangeText={v => s.setCustomer('customerName', v)} autoCapitalize="words" editable={!disabled} />
    <Field label="Phone number (optional)" placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={10} value={s.customerPhone} onChangeText={v => s.setCustomer('customerPhone', v.replace(/[^0-9]/g, ''))} editable={!disabled} />
    <Field label="Order note (optional)" placeholder="Anything the team should know?" value={s.notes} onChangeText={v => s.setCustomer('notes', v)} maxLength={1000} multiline editable={!disabled} />
    <Text style={ui.muted}>{cartCount(s)} items · {s.fulfilment === 'dine_in' ? 'Dine-in' : 'Takeaway'}. Save keeps the order new; Save & Accept also requests acceptance.</Text>
  </>;
}

function ItemCustomizer({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const addItem = useCart(s => s.addItem);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const price = item.price + item.groups.flatMap(g => g.options).filter(o => selected.includes(o.id)).reduce((s, o) => s + o.priceAdjustment, 0);
  return <BottomDrawer visible title={item.name} subtitle="Make it their way" onClose={onClose}
    footer={<ActionButton label={'ADD TO CART · ' + formatMoney(price)} onPress={() => { const invalid = addItem(item, selected, note); if (invalid) setError(invalid); else onClose(); }} />}>
    <ErrorNotice message={error} />
    {!!item.fixedItems.length && <Text style={ui.body}>Includes {item.fixedItems.join(', ')}</Text>}
    {item.groups.map(group => <View key={group.id} style={{ gap: 8 }}><Text style={ui.label}>{group.name} · choose {group.minimum}–{group.maximum}</Text>{group.options.map(option => <ActionButton key={option.id} label={option.name + (option.priceAdjustment ? ' +' + formatMoney(option.priceAdjustment) : '')} variant={selected.includes(option.id) ? 'primary' : 'secondary'} onPress={() => setSelected(current => current.includes(option.id) ? current.filter(id => id !== option.id) : group.maximum === 1 ? [...current.filter(id => !group.options.some(o => o.id === id)), option.id] : [...current, option.id])} />)}</View>)}
    <Field label="Preparation note (optional)" placeholder="For example: no onion" value={note} onChangeText={setNote} maxLength={500} multiline />
    <Text style={ui.muted}>Notes are preparation instructions. Select menu options for priced extras.</Text>
  </BottomDrawer>;
}

const styles = StyleSheet.create({
  categories: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  category: { minHeight: 44, paddingHorizontal: 18, borderWidth: 1, borderColor: palette.border, borderRadius: 24, justifyContent: 'center', backgroundColor: palette.surface },
  categoryActive: { backgroundColor: palette.olive, borderColor: palette.olive },
  categoryText: { color: palette.ink, fontWeight: '700', fontSize: 13 },
  menuCard: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 18, padding: 14, gap: 14, minHeight: 190 },
  menuCategory: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: palette.olive },
  itemName: { color: palette.ink, fontFamily: typography.serif, fontWeight: '700', fontSize: 21 },
  itemHint: { color: palette.inkMuted, fontSize: 11, lineHeight: 17 },
  price: { color: palette.ink, fontSize: 15, fontWeight: '800' },
  dock: { padding: 12, paddingHorizontal: 16, borderTopWidth: 1, borderColor: palette.border, backgroundColor: palette.canvas },
  dockButton: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.ink, padding: 14, borderRadius: 18, width: '100%', maxWidth: 1128, alignSelf: 'center' },
  bagCount: { minWidth: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF22', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  bagCountText: { color: palette.white, fontWeight: '800' },
  dockTitle: { color: palette.white, fontSize: 16, fontWeight: '800' },
  dockHint: { color: palette.canvas, fontSize: 11, marginTop: 3 },
  dockTotal: { color: palette.white, fontSize: 15, fontWeight: '800' },
  fulfilment: { flex: 1, minHeight: 86, minWidth: 120, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 14, gap: 6, justifyContent: 'center' },
  fulfilmentSelected: { borderColor: palette.olive, backgroundColor: palette.oliveSoft },
});
