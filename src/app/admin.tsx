import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

// ⚠️ 貼返你嘅 Firebase Config (同 index.tsx 一樣)
const firebaseConfig = {
  apiKey: "AIzaSyAZNQcRCFis8e3aYy7b3nxd8pafzNgYw",
  authDomain: "guardian-app-f23c6.firebaseapp.com",
  projectId: "guardian-app-f23c6",
  storageBucket: "guardian-app-f23c6.firebasestorage.app",
  messagingSenderId: "1075988300124",
  appId: "1:1075988300124:web:59be47526be9800e6e60199",
  measurementId: "G-G09P2K8SXH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function AdminScreen() {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // 實時監聽 locations/user1 嘅數據變化
    const unsubscribe = onSnapshot(doc(db, "locations", "user1"), (document) => {
      if (document.exists()) {
        setUserData(document.data());
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🛡️ 管理員後台 (Admin)</Text>
      
      <ScrollView style={styles.card}>
        {userData ? (
          <View>
            <Text style={styles.statusText}>狀態：守護中 🟢</Text>
            
            <View style={styles.dataRow}>
              <Text style={styles.label}>目的地：</Text>
              <Text style={styles.value}>{userData.destination || '未設定'}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>目前緯度 (Lat)：</Text>
              <Text style={styles.value}>{userData.lat.toFixed(6)}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>目前經度 (Lng)：</Text>
              <Text style={styles.value}>{userData.lng.toFixed(6)}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>最後更新時間：</Text>
              <Text style={styles.value}>
                {new Date(userData.updatedAt).toLocaleString()}
              </Text>
            </View>

            {/* 可以直接撳呢個連結睇地圖 */}
            <Text style={styles.mapLink}>
              📍 Google 地圖：{'\n'}
              https://maps.google.com/?q={userData.lat},{userData.lng}
            </Text>
          </View>
        ) : (
          <Text style={styles.noData}>目前沒有守護中的用戶...</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E1E', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#2D2D2D', padding: 20, borderRadius: 10, maxHeight: 400 },
  statusText: { fontSize: 18, color: '#4CAF50', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  dataRow: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 10 },
  label: { fontSize: 14, color: '#AAA', marginBottom: 5 },
  value: { fontSize: 18, color: '#FFF', fontWeight: '500' },
  mapLink: { fontSize: 14, color: '#64B5F6', marginTop: 10, lineHeight: 20 },
  noData: { color: '#AAA', fontSize: 16, textAlign: 'center', marginTop: 50 },
});
