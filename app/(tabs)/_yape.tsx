import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput
} from 'react-native';

export default function YapeIntegration() {
  const [accessToken, setAccessToken] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('969929157');
  const [otp, setOtp] = useState('557454');
  const [yapeResponse, setYapeResponse] = useState<any>(null);
  const [authorizationResponse, setAuthorizationResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSecurityCall, setLastSecurityCall] = useState<string>('');

  const merchantId = Constants.expoConfig?.extra?.NIUBIZ_MERCHANT_ID || '522591320';

  // Obtener Access Token al montar
  useEffect(() => {
    (async () => {
      try {
       await getAccessToken();
      } catch (error) {
        console.error('Error obteniendo Access Token:', error);
      }
    })();
  }, []);

  const getAccessToken = async () => {
    const user = Constants.expoConfig?.extra?.NIUBIZ_USER;
    const pass = Constants.expoConfig?.extra?.NIUBIZ_PASS;
    const credentials = btoa(`${user}:${pass}`);

    const response = await fetch('https://apitestenv.vnforapps.com/api.security/v1/security', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.text();
    setAccessToken(data);
    setLastSecurityCall(data);
    return data;
  };

  // Paso 2: Realizar transacción con Yape
  const yapeTransaction = async () => {
    if (!accessToken) {
      alert('Access Token no logrado');
      return;
    }
    setIsLoading(true);
    const purchaseNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    setPurchaseNumber(purchaseNum);

    const body = {
      channel: 'pasarela',
      captureType: 'manual',
      countable: 'true',
      order: {
        purchaseNumber: purchaseNum,
        amount: 1.0,
        currency: 'PEN',
      },
      yape: {
        phoneNumber,
        otp,
      },
    };

    try {
      const response = await fetch(
        `https://apisandbox.vnforappstest.com/api.yape/v2/yape/transaction/${merchantId}`,
        {
          method: 'POST',
          headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      const data = await response.json();
      setYapeResponse(data);
    } catch (error) {
      console.error('Error en Yape Transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 3: Autorizar la transacción
  const authorizeTransaction = async () => {
    if (!accessToken) {
      alert('Access Token no disponible');
      return;
    }
    const tokenId = yapeResponse?.data?.YAPE_TRX_TOKEN;
    if (!tokenId) {
      alert('Realiza antes la transacción Yape');
      return;
    }

    setIsLoading(true);
    const body = {
      channel: 'pasarela',
      captureType: 'manual',
      countable: true,
      order: {
        tokenId,
        purchaseNumber,
        amount: 1.0,
        currency: 'PEN',
      },
      dataMap: {
        urlAddress: 'https://tusitio.com',
        serviceLocationCityName: 'Lima',
        serviceLocationCountrySubdivisionCode: 'PE-LIM',
        serviceLocationCountryCode: 'PER',
        serviceLocationPostalCode: '15001',
      },
    };

    try {
      const response = await fetch(
        `https://apisandbox.vnforappstest.com/api.authorization/v3/authorization/ecommerce/${merchantId}`,
        {
          method: 'POST',
          headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      const data = await response.json();
      setAuthorizationResponse(data);
    } catch (error) {
      console.error('Error en autorización:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    getAccessToken();
    setPurchaseNumber('');
    setYapeResponse(null);
    setAuthorizationResponse(null);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Integración Pago con Yape</Text>
      <Button title="Nuevo pago con Yape" onPress={clearAll} />

        {/* Paso 1 */}
        <Text style={{marginBottom: 15, marginTop:20}}> 1️⃣ Paso 1: Crear token de acceso (Seguridad)</Text>
        {lastSecurityCall && (
          <ScrollView style={styles.resultBox}>
          <Text>{lastSecurityCall ? JSON.stringify(lastSecurityCall, null, 2) : 'Sin ejecutar'}</Text>
        </ScrollView>
        )}

      <Text style={{marginBottom: 0, marginTop:10}}> 2️⃣ Paso 2: Crear Validación de Transacción con Yape</Text>
      <Text style={styles.label}>Número de Yape (ej: 969929157):</Text>
      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="number-pad"
        placeholder="969929157"
      />

      <Text style={styles.label}>OTP (ej: 557454):</Text>
      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        placeholder="557454"
      />


      <Button
        title="Realizar transacción Yape"
        onPress={yapeTransaction}
        disabled={isLoading || !accessToken}
      />



      <Text style={styles.label}>Respuesta Transacción Yape:</Text>
      <ScrollView style={styles.resultBox}>
        <Text>{yapeResponse ? JSON.stringify(yapeResponse, null, 2) : 'Sin ejecutar'}</Text>
      </ScrollView>

      <Text style={{marginBottom: 15, marginTop:20}}> 3️⃣ Paso 3: Crear Autorización de Transacción con Yape</Text>

      <Button
        title="Autorizar transacción"
        onPress={authorizeTransaction}
        disabled={
          isLoading || !accessToken || !yapeResponse || !!authorizationResponse
        }
      />

      <Text style={styles.label}>Respuesta Autorización:</Text>
      <ScrollView style={styles.resultBox}>
        <Text>{authorizationResponse ? JSON.stringify(authorizationResponse, null, 2) : 'Sin ejecutar'}</Text>
      </ScrollView>
      <Text style={{marginTop : 10}} ></Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { marginTop: 15, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    marginBottom:10
  },
  resultBox: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 10 },
});
