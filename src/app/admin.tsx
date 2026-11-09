// @ts-nocheck
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';

export default function AdminScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>👑 這是管理員後台</Text>
      <Text style={styles.subtitle}>如果你見到呢句，代表路由設定成功！</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E1E1E' },
  title: { fontSize: 28, color: '#FFF', fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 16, color: '#AAA' }
});
