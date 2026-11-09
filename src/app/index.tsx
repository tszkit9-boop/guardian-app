import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// ⚠️ 呢度貼你個 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAZNQcRCFis8e3aYy7b3nxd8pafzNgYw",
  authDomain: "guardian-app-f23c6.firebaseapp.com",
  projectId: "guardian-app-f23c6",
  storageBucket: "guardian-app-f23c6.firebasestorage.app",
  messagingSenderId: "1075988300124",
  appId: "1:1075988300124:web:59be47526be9800e6e60199",
  measurementId: "G-G09P2K8SXH"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function HomeScreen() {
  const [destination, setDestination] = useState('');
  const [isGuarding, setIsGuarding] = useState(false);
  const [locationText, setLocationText] = useState('僅在你同意後分享定位');

  const startGuardian = async () => {
    if (!destination) {
      Alert.alert('提示', '請輸入目的地！');
      return;
    }

    setLocationText('獲取定位並上傳中...');

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('錯誤', '需要定位權限才能守護你！');
        setLocationText('定位失敗：沒有權限');
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      
      // 🔥 呢句就係將數據射上 Firebase 嘅關鍵！🔥
      await setDoc(doc(db, "locations", "user1"), {
        lat: latitude,
        lng: longitude,
        destination: destination,
        updatedAt: new Date().toISOString()
      });

      setLocationText(`已定位並上傳：${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      setIsGuarding(true);
      
      Alert.alert('守護開始', `正在守護你前往：${destination}\n數據已上傳到後台！`);
      
    } catch (error) {
      console.error(error);
      setLocationText('定位或上傳出錯');
      Alert.alert('錯誤', '無法獲取定位或上傳，請檢查網絡。');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>守護同行 Guardian</Text>
      <Text style={styles.subtitle}>晚上 10:30 · 準備回家了嗎？</Text>

      <View style={styles.card}>
        <Text style={styles.label}>📍 現在位置</Text>
        <Text style={styles.locationText}>{locationText}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>🏠 目的地</Text>
        <TextInput
          style={styles.input}
          placeholder="輸入安全抵達地點"
          value={destination}
          onChangeText={setDestination}
        />
      </View>

      {!isGuarding ? (
        <TouchableOpacity style={styles.button} onPress={startGuardian}>
          <Text style={styles.buttonText}>開始安全陪伴</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.guardingBox}>
          <Text style={styles.guardingText}>🛡️ 守護中...</Text>
          <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={() => setIsGuarding(false)}>
            <Text style={styles.buttonText}>我已安全抵達</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  locationText: { fontSize: 14, color: '#999' },
  input: { fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 5 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  guardingBox: { backgroundColor: '#E8F5E9', padding: 20, borderRadius: 10, marginTop: 20 },
  guardingText: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginBottom: 10 },
  stopButton: { backgroundColor: '#FF9800' }
});
