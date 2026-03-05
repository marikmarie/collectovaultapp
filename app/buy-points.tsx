import React, { useState } from 'react';
import { View, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import BuyPointsModal from '@/components/BuyPointsModal';

export default function BuyPointsScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(true);

  const handleClose = () => {
    setModalVisible(false);
    // Navigate back after closing
    setTimeout(() => {
      router.back();
    }, 300);
  };

  const handleSuccess = (points: number) => {
    setTimeout(() => {
      setModalVisible(false);
      router.back();
    }, 2000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <BuyPointsModal
        visible={modalVisible}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </SafeAreaView>
  );
}
