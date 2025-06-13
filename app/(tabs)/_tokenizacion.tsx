import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

export default function NiubizTokenizacion() {
  const [cards, setCards] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [selectedCardNumber, setSelectedCardNumber] = useState<string | null>(null);
  const [isWebViewVisible, setWebViewVisible] = useState(true);
  const [sessionKey, setSessionKey] = useState('');
  const [respuestaTokenTarjeta, setRespuestaTokenTarjeta] = useState('');
  const [respuestaTokenConsulta, setRespuestaTokenConsulta] = useState('');
  const [respuestaAutorizacion, setRespuestaAutorizacion] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [merchantId, setMerchantId] = useState(Constants.expoConfig?.extra?.NIUBIZ_MERCHANT_ID);
  const [isChecked, setIsChecked] = useState(false);
  const [binData, setBinData] = useState<{ hasInstallments: boolean; installments: number[] } | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<number | null>(null);
  const [binResponseRaw, setBinResponseRaw] = useState<any>(null);
  const [securityCallCount, setSecurityCallCount] = useState(0);
  const [lastSecurityCall, setLastSecurityCall] = useState<string>('');
  

  useEffect(() => {
    (async () => {
      const savedCards = await AsyncStorage.getItem('savedCards');
      if (savedCards) {
        const parsed = JSON.parse(savedCards);
        setCards(parsed);
      }

    })();
    fetchSessionKey();
  }, []);

  const saveCard = async (tokenId: string, cardNumber: string) => {
    try {
      let updatedCards = [...cards];
      const exists = updatedCards.some((card) => card.tokenId === tokenId);
      if (!exists) {
        updatedCards.push({ tokenId, cardNumber });
        await AsyncStorage.setItem('savedCards', JSON.stringify(updatedCards));
        setCards(updatedCards);
      }
    } catch (error) {
      console.error('Error guardando tarjeta:', error);
    }
  };

  const consultarBIN = async (bin: string, accessToken: string) => {
    try {
      const response = await fetch(`https://apitestenv.vnforapps.com/api.ecommerce/v2/queryBin/${bin}`, {
        method: 'GET',
        headers: {
          Authorization: accessToken,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Error consultando BIN');
      }
      const data = await response.json();
      setBinData({ hasInstallments: data.hasInstallments, installments: data.installments });
      setBinResponseRaw(data);
      if (!data.hasInstallments) setSelectedInstallment(null);
      else setSelectedInstallment(data.installments[0] || null);
    } catch (error) {
      console.error('Error en consulta BIN:', error);
      setBinData(null);
      setSelectedInstallment(null);
    }
  };

  const fetchSessionKey = async () => {
    setRespuestaTokenTarjeta('');
    const accessToken = await getAccessToken();
    setAccessToken(accessToken);
    const key = await crearTokenDeSesion(accessToken);
    setSessionKey(key);
    setSelectedToken(null);
    setRespuestaTokenConsulta('');
    setRespuestaAutorizacion('');
    setSelectedTokenId(null);
    setWebViewVisible(true);
    setIsChecked(false);
    setBinResponseRaw(null);
    setSelectedInstallment(null);
    setBinData(null)
    // await AsyncStorage.clear();
  };

  const clearTarjetSaves = async () => {
    await AsyncStorage.clear();
    setCards([]);
    // fetchSessionKey();
  };

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
    setLastSecurityCall(data);
    return data;
  };

  const crearTokenDeSesion = async (accessToken: string) => {
    const response = await fetch(
      `https://apitestenv.vnforapps.com/api.ecommerce/v2/ecommerce/token/session/${merchantId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: 'paycard',
          amount: 14.0,
          antifraud: {
            clientIp: '24.252.107.29',
            merchantDefineData: {
              MDD15: 'Valor MDD 15',
              MDD20: 'Valor MDD 20',
              MDD33: 'Valor MDD 33',
            },
          },
          dataMap: {
            cardholderCity: 'Lima',
            cardholderCountry: 'PE',
            cardholderAddress: 'Av Jose Pardo 831',
            cardholderPostalCode: '12345',
            cardholderState: 'LIM',
            cardholderPhoneNumber: '987654321',
          },
        }),
      }
    );
    const data = await response.json();
    return data.sessionKey;
  };

  const consultarToken = async () => {
    const accessToken = await getAccessToken();
    const response = await fetch(
      `https://apitestenv.vnforapps.com/api.ecommerce/v2/ecommerce/token/card/${merchantId}/${selectedToken}`,
      {
        method: 'GET',
        headers: {
          Authorization: `${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    setPurchaseId(result.order.purchaseNumber);
    setSelectedTokenId(result.token.tokenId);
    setSelectedCardNumber(result.card.cardNumber);
    setRespuestaTokenConsulta(result);

    if (isChecked) {
      await saveCard(result.token.tokenId, result.card.cardNumber);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    const data = event.nativeEvent.data;
    const response = JSON.parse(data);
    setRespuestaTokenTarjeta(response);
    setSelectedToken(response.transactionToken);
    setWebViewVisible(false);
    const cardNumber = response.bin; // Ajustar según tu respuesta real
    if (cardNumber && cardNumber.length >= 6) {
      const token = await getAccessToken();
      await consultarBIN(cardNumber, token);
    } else {
      setBinData(null);
      setSelectedInstallment(null);
    }

  };

  const onToggleSwitch = async (value: boolean) => {
    setIsChecked(value);
   
    if (value && selectedTokenId && selectedCardNumber) {
      await saveCard(selectedTokenId, selectedCardNumber);
    }
  };

  const pagarConTarjeta = async () => {
    if (!selectedTokenId) {
      alert('Por favor, selecciona una tarjeta o crea un token primero.');
      return;
    }

    const numero = Math.floor(1000000000 + Math.random() * 9000000000);
    const accessToken = await getAccessToken();
    const body: {
      channel: string;
      captureType: string;
      countable: boolean;
      order: {
        amount: number;
        currency: string;
        purchaseNumber: string | undefined;
        installment?: number; 
        [key: string]: any;   
      };
      card: {
        tokenId: string | null;
      };
    } = {
      channel: 'paycard',
      captureType: 'manual',
      countable: true,
      order: {
        amount: 14.0,
        currency: 'PEN',
        purchaseNumber: isWebViewVisible ? purchaseId?.toString() : numero.toString(),
      },
      card: {
        tokenId: selectedTokenId,
      },
    };
    

     // Si la tarjeta tiene cuotas y el usuario seleccionó cuotas > 1
    if (binData?.hasInstallments && selectedInstallment && selectedInstallment > 1) {
      body.order.installment = selectedInstallment;
    }

    try {
      const response = await fetch(
        `https://apitestenv.vnforapps.com/api.authorization/v3/authorization/ecommerce/${merchantId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
    
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta del servidor:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    
      const result = await response.json();
      setRespuestaAutorizacion(result);
    
      if (result.dataMap?.STATUS === 'Authorized') {
        alert('Pago realizado exitosamente');
      } else {
        alert('Error al realizar el pago');
      }
    } catch (error: any) {
      console.error('Ocurrió un error al realizar la solicitud:', error);
    }
    
    
    
  };
  // HTML para WebView (tokenización)
  const webviewHtmlContent = `
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Detalle de pago</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
      <link rel="stylesheet" href="https://pocpaymentserve.s3.amazonaws.com/payform.min.css" />
      <style>
        .form-control {
          background-color: #f4f4f4;
          border: 1px solid #dcdcdc;
          padding: 12px;
          border-radius: 8px;
          font-size: 8px;
          color: #666;
          font-family: 'Montserrat', sans-serif;
        }
        .form-control:focus {
          border-color: #3b8bff;
          outline: none;
        }
        .form-control::placeholder {
          color: #999;
        }
        .field {
          margin-bottom: 20px;
        }
        .field label {
          font-weight: 600;
          color: #333;
          font-size: 17px;
          margin-bottom: 10px;
          display: block;
        }
        .field .form-control {
          width: 100%;
          height: 45px;
        }
        .field .error-message {
          color: red;
          font-size: 8px;
          margin-top: 5px;
          display: none;
        }
        .error-message {
          color: red;
          font-size: 12px;
          margin-top: 5px;
          display: none;
        }
        .field input {
          width: 100%;
        }
      </style>
    </head>
    <body>
      <br />
      <div class="m-2 row">
        <div class="p-0 field col-12">
          <label for="txtNumeroTarjeta">Número de tarjeta</label>
          <div class="input-wrapper">
            <div id="txtNumeroTarjeta" class="form-control"></div>
          </div>
          <div id="card-number-error" class="error-message"></div>
        </div>
        <div class="row p-0 mt-3 col-12">
          <div class="field col-8">
            <label for="txtFechaVencimiento">Fecha de expiración</label>
            <div class="input-wrapper">
              <div id="txtFechaVencimiento" class="form-control"></div>
            </div>
            <div id="expiry-error" class="error-message"></div>
          </div>
          <div class="p-0 field col-4">
            <label for="txtCvv">CVV</label>
            <div class="input-wrapper">
              <div id="txtCvv" class="form-control"></div>
            </div>
            <div id="cvv-error" class="error-message"></div>
          </div>
        </div>
      </div>
      <div class="text-center mt-2">
        <button class="btn btn-primary" id="createTokenBtn" onclick="createToken()">Validar Tarjeta</button>
      </div>
      <script src="https://pocpaymentserve.s3.amazonaws.com/payform.min.js"></script>
      <script type="text/javascript">
        const numero = Math.floor(1000000000 + Math.random() * 9000000000);
        var configuration = {
          sessionkey: '${sessionKey}',
          channel: "paycard",
          merchantid: '${merchantId}',
          purchasenumber: numero.toString(),
          amount: "14.00",
          language: "es",
          font: "https://fonts.googleapis.com/css?family=Montserrat:400&display=swap",
          recurrentmaxamount: "60.00"
        };
        payform.setConfiguration(configuration);
        var elementStyles = {
          base: {
            color: '#666666',
            fontWeight: 700,
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '16px',
            fontSmoothing: 'antialiased',
            placeholder: { color: '#999999' },
            autofill: { color: '#e39f48' }
          },
          invalid: {
            color: '#E25950',
            '::placeholder': { color: '#FFCCA5' }
          }
        };
        var cardNumber = payform.createElement(
          'card-number',
          { style: elementStyles, placeholder: 'Número de Tarjeta' },
          'txtNumeroTarjeta'
        );
        cardNumber.then(element => {
          element.on('change', function (data) {
            if (data.length > 0) {
              document.getElementById('card-number-error').innerText = data[0].message;
              document.getElementById('card-number-error').style.display = 'block';
            } else {
              document.getElementById('card-number-error').style.display = 'none';
            }
          });
        });
        var cardExpiry = payform.createElement(
          'card-expiry',
          { style: elementStyles, placeholder: 'MM/AA' },
          'txtFechaVencimiento'
        );
        cardExpiry.then(element => {
          element.on('change', function (data) {
            if (data.length > 0) {
              document.getElementById('expiry-error').innerText = data[0].message;
              document.getElementById('expiry-error').style.display = 'block';
            } else {
              document.getElementById('expiry-error').style.display = 'none';
            }
          });
        });
        var cardCvv = payform.createElement(
          'card-cvc',
          { style: elementStyles, placeholder: 'CVV' },
          'txtCvv'
        );
        cardCvv.then(element => {
          element.on('change', function (event) {
            if (event.length > 0) {
              document.getElementById('cvv-error').innerText = event[0].message;
              document.getElementById('cvv-error').style.display = 'block';
            } else {
              document.getElementById('cvv-error').style.display = 'none';
            }
          });
        });
        function createToken() {
          var data = {
            name: 'Juan',
            lastName: 'Perez',
            email: 'jperez@test.com',
            alias: 'PrimeraTarjeta',
            userBlockId: 'jperez99'
          };
          payform
            .createToken([cardNumber, cardExpiry, cardCvv], data)
            .then(function (response) {
              alert('Token Creado :' + JSON.stringify(response));
              window.ReactNativeWebView.postMessage(JSON.stringify(response));
            })
            .catch(function (error) {
              console.error('Error al crear el token:', JSON.stringify(error));
            });
        }
      </script>
    </body>
    </html>
  `;

  const onSelectCard = async (tokenId: string, cardNumber: string) => {
   
    if (selectedTokenId === tokenId) {
      fetchSessionKey();
      setWebViewVisible(true);
    } else {
      setSelectedTokenId(tokenId);
      setSelectedCardNumber(cardNumber);
      setWebViewVisible(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pago con Niubiz</Text>
      {/* Paso 1 */}
      <Text> 1️⃣ Paso 1: Crear token de acceso (Seguridad)</Text>
      {lastSecurityCall && (
        <ScrollView style={styles.resultBox}>
          <Text style={styles.monospace}>{JSON.stringify(lastSecurityCall, null, 2)}</Text>
        </ScrollView>
      )}
       {/* Paso 2 */}
      <Text style={{marginBottom: 15, marginTop:10}}>2️⃣ Paso 2: Crear token de sesión</Text>
      <Text style={{ marginBottom: 10 }}>
        Token de Sesion: <Text style={{ color: 'blue' }}>{sessionKey}</Text>
      </Text>
      <Button title="Generar Nuevo Token de Sesion" onPress={fetchSessionKey} />

      <Text style={{ marginVertical: 10  }}>Tarjetas guardadas:</Text>
      {cards.length === 0 && <Text style={{ marginBottom: 10  }} >No hay tarjetas guardadas.</Text>}
      {cards.map((card) => {
        const isSelected = selectedTokenId === card.tokenId;
        return (
          <TouchableOpacity
            key={card.tokenId}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 5,
              padding: 10,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: isSelected ? 'blue' : '#ccc',
              borderRadius: 5,
            }}
            onPress={() => onSelectCard(card.tokenId, card.cardNumber)}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderWidth: 1,
                borderColor: '#999',
                marginRight: 10,
                backgroundColor: isSelected ? 'blue' : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isSelected && (
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
              )}
            </View>
            <Text>
              Tarjeta: {card.cardNumber}{'\n'}
              Token ID: {card.tokenId}
            </Text>
          </TouchableOpacity>
        );
      })}

      <Button title="Borrar Tarjetas Guardadas" disabled={cards.length === 0} onPress={clearTarjetSaves} />

      <Text style={{marginBottom: 15, marginTop:20}}>3️⃣ Paso 3: Configurar el desacoplado y Validar Tarjeta</Text>

      {isWebViewVisible && (
        <WebView
          originWhitelist={['*']}
          source={{ html: webviewHtmlContent }}
          javaScriptEnabled={true}
          onMessage={handleWebViewMessage}
          style={{ width: '100%', height: 350, marginTop: 10 }}
        />
      )}
      {isWebViewVisible && (
           <View style={styles.switchContainer}>
           <Text>Recordar tarjeta</Text>
           <Switch value={isChecked} onValueChange={onToggleSwitch} />
         </View>
      )}
      <Text style={{ marginVertical: 10 ,fontWeight: '600'}}>Respuesta de Validación de Tarjeta:</Text>
      {respuestaTokenTarjeta && (
        <ScrollView style={styles.resultBox}>
          <Text style={styles.monospace}>{JSON.stringify(respuestaTokenTarjeta, null, 2)}</Text>
        </ScrollView>
      )}
      <Text style={{marginBottom: 15, marginTop:20 ,fontWeight: '600'}}>Consulta de BIN</Text>

      <Text style={{ marginTop: 10 }}>Respuesta consulta BIN:</Text>
      <ScrollView style={styles.resultBox}>
        <Text style={styles.monospace}>
          {binResponseRaw ? JSON.stringify(binResponseRaw, null, 2) : 'No consultado aún'}
        </Text>
      </ScrollView>

        {binData?.hasInstallments && binData.installments.length > 0 && (
        <View style={{ marginVertical: 10 }}>
          <Text>Selecciona número de cuotas:</Text>
          <Picker
            selectedValue={selectedInstallment}
            onValueChange={(itemValue) => setSelectedInstallment(itemValue)}
            style={{ height: 50, width: 150 }}
          >
            {binData.installments.map((inst) => (
              <Picker.Item key={inst} label={`${inst} cuota${inst > 1 ? 's' : ''}`} value={inst} />
            ))}
          </Picker>
        </View>
      )}

        <Text style={{marginBottom: 15, marginTop:10 }} >4️⃣ Paso 4: Solicitar token de la tarjeta</Text>
  
          <Button
            disabled={
              !selectedToken ||
              (binData?.hasInstallments === true && !selectedInstallment)
            }
            title="Crear Token de Tarjeta"
            onPress={consultarToken}
          />
      <Text style={{ marginTop: 10 }}>Respuesta de Creación de Token de Tarjeta:</Text>

        {respuestaTokenConsulta && (
          <ScrollView style={styles.resultBox}>
            <Text style={styles.monospace}>{JSON.stringify(respuestaTokenConsulta, null, 2)}</Text>
          </ScrollView>
        )}
     
     <Text style={{marginBottom: 15, marginTop:20 }} >5️⃣ Paso 5: Solicitar autorización de la transacción</Text>

     <Button disabled={!selectedTokenId} title="Pagar" onPress={pagarConTarjeta} />
      
      <Text style={{ marginTop: 10 , marginBottom:20 }}>Respuesta de Autorizacion:</Text>
      {respuestaAutorizacion && (
        <ScrollView style={styles.resultBox}>
          <Text style={styles.monospace}>{JSON.stringify(respuestaAutorizacion, null, 2)}</Text>
        </ScrollView>
      )}
      <Text style={{marginTop : 10}} ></Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 5, textAlign: 'center' },
  switchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  resultBox: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 10 },
  monospace: { fontFamily: 'monospace' },
});
