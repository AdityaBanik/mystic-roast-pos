import { Text } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { Page, Panel, ui } from '@/components/ui';
import { useOrders } from '@/state/order-queries';

export default function SettingsScreen() {
  const { mode, lastUpdated, refresh, loading } = useOrders();
  return <Page title="Settings & connection">
    <Panel title="Connection"><Text style={ui.body}>{mode === 'preview' ? 'Preview mode · Batanagar sample branch' : 'Live service is not connected'}</Text><Text style={ui.muted}>This installation is not signed in to a staff account. No live orders, payments or inventory are being changed.</Text>{lastUpdated && <Text style={ui.muted}>Preview refreshed: {new Date(lastUpdated).toLocaleTimeString()}</Text>}<ActionButton label="REFRESH" busy={loading} variant="secondary" onPress={() => void refresh()} /></Panel>
    <Panel title="Preview limits"><Text style={ui.body}>Sample orders and payments stay in memory and reset on reload. Staff creation and fulfilment can be explored here but are not supported by the current live order API.</Text><Text style={ui.body}>Partial payments, completed-order refunds, operational recall and printer integration are unavailable.</Text></Panel>
    <Panel title="Live setup pending"><Text style={ui.body}>A secure staff service, staff sign-in and authorized branch access are required before this app can operate the café. The current backend is unchanged.</Text><Text style={ui.muted}>No staff or manager permissions are implied by preview mode.</Text></Panel>
  </Page>;
}
