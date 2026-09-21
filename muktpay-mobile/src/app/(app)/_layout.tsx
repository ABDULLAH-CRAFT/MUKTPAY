import { Stack } from 'expo-router';
import { ActiveBillProvider } from '@/features/merchant/ActiveBillProvider';
import { MerchantProvider } from '@/features/merchant/MerchantProvider';
import { RoleProvider } from '@/features/role/RoleProvider';
import { colors } from '@/theme/theme';

/**
 * Everything in here is signed-in. Role, shop profile and the bill in progress only mean
 * something once we know who the person is, so all three providers are mounted here rather
 * than at the root. They are cheap for a customer: two keychain reads that come back empty
 * and one null.
 */
export default function AppGroupLayout() {
  return (
    <RoleProvider>
      <MerchantProvider>
        <ActiveBillProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        </ActiveBillProvider>
      </MerchantProvider>
    </RoleProvider>
  );
}
