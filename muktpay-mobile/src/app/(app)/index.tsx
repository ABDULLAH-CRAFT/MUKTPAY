import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CustomerHome } from '@/features/home/CustomerHome';
import { MerchantHome } from '@/features/merchant/MerchantHome';
import { ChooseRoleScreen } from '@/features/role/ChooseRoleScreen';
import { useRole } from '@/features/role/RoleProvider';
import { colors } from '@/theme/theme';

/**
 * The home screen is a switch, not a screen: picker → customer home → merchant home.
 * Keeping it one route means switching sides is instant and leaves no back-stack to escape into.
 */
export default function HomeScreen() {
  const { status, role } = useRole();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (role === null) return <ChooseRoleScreen />;
  return role === 'merchant' ? <MerchantHome /> : <CustomerHome />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
