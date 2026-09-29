import { Stack } from 'expo-router';
import { MerchantProvider } from '@/features/merchant/MerchantProvider';
import { RoleProvider } from '@/features/role/RoleProvider';
import { colors } from '@/theme/theme';

/**
 * Everything in here is signed-in. Role and shop profile only mean something once we know who
 * the person is, so both providers are mounted here rather than at the root.
 *
 * There used to be a third provider here (ActiveBillProvider) holding the in-progress bill in
 * memory. Bills now live on the server and are addressed by `ref` through route params (see
 * merchant/bill.tsx and merchant/useBills.ts), so there's no in-progress bill left to hold here.
 */
export default function AppGroupLayout() {
  return (
    <RoleProvider>
      <MerchantProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </MerchantProvider>
    </RoleProvider>
  );
}
