  // PagoScreen.tsx
  import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

  // Generador de IDs únicos
  const genId = () => `1${Date.now()}`;

  export default function PagoScreen() {
    // Credenciales desde app.json
    const merchantCode  = Constants.expoConfig?.extra?.IZIPAY_MERCHANT_CODE!;
    const publicKey     = Constants.expoConfig?.extra?.IZIPAY_PUBLIC_KEY!;
    const apiKey        = Constants.expoConfig?.extra?.IZIPAY_API_KEY!;
    const webviewRef = useRef<WebView | null>(null);
    const [useIzipay, setUseIzipay]           = useState(false);
    const [transactionId, setTransactionId]   = useState('');
    const [orderNumber, setOrderNumber]       = useState('');
    const [sessionToken, setSessionToken]     = useState('');
    const [installments, setInstallments]     = useState<string[]>([]);
    const [selectedInstallment, setSelectedInstallment] = useState('00');
    const [paymentResult, setPaymentResult]   = useState<any>(null);
    const [lastSecurityCall, setLastSecurityCall] = useState<string>('');
    const [cards, setCards] = useState<any[]>([]);
    const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
    const [useSavedCards, setUseSavedCards] = useState(false); // Estado para saber si usar tarjetas guardadas
    const [isCardSelected, setIsCardSelected] = useState(false); // Para saber si una tarjeta ha sido seleccionada
    const [respuestaAutorizacion, setRespuestaAutorizacion] = useState('');
    const [isUserTypeSelected, setIsUserTypeSelected] = useState(false); // Estado para saber si seleccionaron invitado o registrado
    const [isUserTypeGuest, setIsUserTypeGuest] = useState(false);  // true = Invitado
    const [isPayTypeSelected, setIsPayTypeSelected] = useState(false); // Estado para saber si seleccionaron invitado o registrado
    const [isPayTypeGuest, setIsPayTypeGuest] = useState('');  // true = Invitado

  
    const resetStates = () => {
      setTransactionId('');
      setOrderNumber('');
      setInstallments([]);
      setSelectedInstallment('00');
      setPaymentResult(null);
      setLastSecurityCall('');
      setSelectedTokenId(null);
      setUseSavedCards(false);
      setIsCardSelected(false);
      setRespuestaAutorizacion('');
      setIsUserTypeSelected(false);
      setIsUserTypeGuest(false);
      setIsPayTypeSelected(false);
      setIsPayTypeGuest('');
      newSesionToken();
    };

    async function crearTokenDeSesionIzipay(
      merchantCode: string,
      publicKey: string,
      orderNumber: string,
      amount: string,
      transactionId: string
    ): Promise<string> {
      const headers = new Headers({
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'transactionId': transactionId,
        'Origin': 'https://developers.izipay.pe',
        'Referer': 'https://developers.izipay.pe/web-core/use-cases/pay/',
      });

      const body = JSON.stringify({
        requestSource: 'ECOMMERCE',
        merchantCode,
        orderNumber,
        publicKey,
        amount
      });

      const res = await fetch(
        'https://sandbox-api-pw.izipay.pe/security/v1/Token/Generate',
        { method: 'POST', headers, body }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Token session error ${res.status}: ${text}`);
      }
      const json = await res.json();
      console.log("token");
      return json.response.token;
    }

    const triggerIzipay = () => {
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript('window.initIzipay();');
      }
    };

    const sumbitPayment = () => {
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript('window.sumbitForm();');
      }
    };

    const fetchSessionKey = async () => {
      const tid = genId();
      const ord = `${Date.now()}`;
      setTransactionId(tid);
      setOrderNumber(ord);
      setRespuestaAutorizacion('');
      if(!isCardSelected){
        setSelectedTokenId(null);
      }
      const token = await crearTokenDeSesionIzipay(
        merchantCode,
        publicKey,
        ord,
        '1.99',
        tid
      );
      setSessionToken(token);
      // await AsyncStorage.clear();
    };

    const borrarTarjetas = async () => {
     await AsyncStorage.clear();

    };

    const newSesionToken = async () => {
      await fetchSessionKey();
      setTimeout(function() {
        triggerIzipay();
      }, 1000);
    };
    const onSelectCard = async (tokenId: string, cardNumber: string) => {
      setSelectedTokenId(tokenId);
      setIsCardSelected(true); // Marcamos que se seleccionó una tarjeta
    };

    useEffect(() => {
      if(isCardSelected){
        setTimeout(function() {
          newSesionToken();
        }, 1000);
      }
    }, [selectedTokenId]);

    const saveCard = async (tokenId: string, cardNumber: string) => {
      try {
        let updatedCards = [...cards];
        const exists = updatedCards.some((card) => card.tokenId === tokenId);
        if (!exists) {
          updatedCards.push({ tokenId, cardNumber });
          await AsyncStorage.setItem('savedCardsIziPay', JSON.stringify(updatedCards));
          setCards(updatedCards);
        }
      } catch (error) {
        console.error('Error guardando tarjeta:', error);
      }
    };

    useEffect(() => {
      if(isPayTypeGuest != ''){
        console.log("Efet",isPayTypeGuest)
        setTimeout(function() {
          triggerIzipay();
        }, 1000);
      }
    }, [isPayTypeGuest]);

    useEffect(() => {
      fetchSessionKey();
      (async () => {
        const savedCards = await AsyncStorage.getItem('savedCardsIziPay');
        if (savedCards) {
          const parsed = JSON.parse(savedCards);
          setCards(parsed);
        }

      })();
    }, []);

    const handleUserTypeSelection = (isGuest: boolean) => {
      setIsUserTypeSelected(true);
      setIsUserTypeGuest(isGuest);
    };

    const handlePayTypeSelection = (isGuest: string) => {
      setIsPayTypeSelected(true);
      setIsPayTypeGuest(isGuest);
    };

    // Recibir mensaje de la WebView
    const onIzipayMessage = (event: any) => {
      console.log(event);
      if (event.nativeEvent.data === "payment_completed") {
        console.log("Pago completado, estado actualizado.");
      }else{
        const resp = JSON.parse(event.nativeEvent.data);
        if(resp.code == "P54"){
          console.log('Payment P54:', resp);
          // fetchSessionKey();
        }
        if(resp.code == "00"){
          console.log('Payment response:', resp);
          setPaymentResult(resp);
          setRespuestaAutorizacion(resp);
          console.log(resp.response.token.cardToken);
          console.log(resp.response.card.pan);
          if(resp.response.token.cardToken != ""){
          saveCard(resp.response.token.cardToken, resp.response.card.pan);
        
          }
          // setUseSavedCards(false);
          // setIsCardSelected(false);
          // fetchSessionKey();
        }
      }
     
    

      // if(resp.token.cardToken){
      //   saveCard(resp.token.cardToken, resp.card.pan);
      // }
      // const bin = resp.bin?.slice?.(0,6);
      // if (bin?.length===6) {
      //   consultarCuotasIzipay(bin, apiKey, merchantCode)
      //     .then(setInstallments)
      //     .catch(console.error);
      // }
    };

    // Inyectamos el HTML serializado
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Pago Izipay</title>
      <style>
          /* — CSS corregido — */
          html, body {
            margin: 0;
            padding: 0;
            height: 100vh;
            width: 100%;                   /* ocupa el 80% del ancho del padre */
            background-color: #f0f0f0;
            font-family: Arial, sans-serif;
          }
          #izipay-container {
            position: relative;
            width: 100%;                   /* ocupa el 80% del ancho del padre */
            margin: 0 auto;               /* lo centra horizontalmente */
            height: auto;                 /* se ajusta según el contenido */
            overflow-x: scroll;             /* scroll horizontal si el formulario es más ancho */
            background-color: white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            border-radius: 6px;
          }
          #izipay-container iframe {
            display: flex;
            width: 100%;
            padding-top:10px;
            min-width: 300px;             
            border: none;
          }
        </style>
    </head>
    <body>
      <div id="izipay-container"></div>
    
      <script src="https://sandbox-checkout.izipay.pe/payments/v1/js/index.js?mode=embedded&container=izipay-container"></script>
      <script>
        // Configuración Izipay (usa tus variables interpoladas desde React)
        var izipayConfig = {
          config: 
          {
                transactionId:  "${transactionId}",
                action: "pay_register",
                merchantCode: "4004353",
                facilitatorCode: "",
                order: {
                  orderNumber: "${orderNumber}",
                  showAmount: true,
                  currency: "PEN",
                  amount: "1.99",
                  installments: "",
                  deferred: "",
                  payMethod: "all",
                  channel: "web",
                  processType: "AT",
                  merchantBuyerId: "TY990792123846CSR0VR1JMZM",
                  dateTimeTransaction: ${Date.now()}
                },
                card: {
                  brand: "",
                  pan: "",
                  expirationMonth: "",
                  expirationYear: "",
                  cvc: ""
                },
                token: {
                  cardToken: ""
                },
                billing: {
                  firstName: "Juan",
                  lastName: "Wick Quispe",
                  email: "jwickq@izi.com",
                  phoneNumber: "958745896",
                  street: "Av. Jorge Chávez 275",
                  city: "Lima",
                  state: "Lima",
                  country: "PE",
                  postalCode: "00001",
                  document: "",
                  documentType: "DNI",
                  companyName: ""
                },
                shipping: {
                  firstName: "",
                  lastName: "",
                  email: "",
                  phoneNumber: "",
                  street: "",
                  city: "",
                  state: "",
                  country: "",
                  postalCode: "",
                  document: "",
                  documentType: ""
                },
                language: {
                  init: "ESP",
                  showControlMultiLang: false
                },
                render: {
                  typeForm: "embedded",
                  container: "#izipay-container",
                  showButtonProcessForm: false,
                  redirectUrls: {
                    onSuccess: "https://server.punto-web.com/comercio/creceivedemo.asp?p=h1",
                    onError:   "https://server.punto-web.com/comercio/creceivedemo.asp?p=h1",
                    onCancel:  "https://developers.izipay.pe/web-core/modalidades/embebido/"
                  }
                },
                urlRedirect: "https://server.punto-web.com/comercio/creceivedemo.asp?p=h1",
                urlIPN: "",
                appearance: {
                  styleInput: "normal",
                  logo: "https://logowik.com/content/uploads/images/shopping-cart5929.jpg",
                  theme: "green",
                  customTheme: {},
                  customize: {
                    visibility: {
                      hideOrderNumber: false,
                      hideResultScreen: false,
                      hideLogo: false,
                      hideMessageActivateOnlinePurchases: false,
                      hideTestCards: false,
                      hideShakeValidation: false,
                      hideGlobalErrors: false
                    },
                    elements: [
                        {
                            paymentMethod: 'CARD',
                            fields: [
                                {
                                    name: 'typeDocument',
                                    visible: true,
                                },
                                {
                                    name: 'documentNumber',
                                    visible: true,
                                },
                            ]
                        }
                      ]
                  }
                },
                customFields: [],
                originEntry: {
                  originCode: "",
                  originDetail: {},
                  entryCode: "SDK_JAVASCRIPT",
                    }}
          ,
          parameters: {
            authorization: "${sessionToken}",
            keyRSA: "VErethUtraQuxas57wuMuquprADrAHAb",
            callbackResponse: function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify(response)); 
            }
          }
        };

        izipayConfig.config.order.payMethod = "${isPayTypeGuest}"; 
        
        if ("${selectedTokenId}" !== "null") {
          izipayConfig.config.action = 'pay_token'; 
          izipayConfig.config.token = { 
            cardToken: "${selectedTokenId}" 
          };
        }

        const isUserTypeGuest = "${isUserTypeGuest}"; 
        
        if (isUserTypeGuest == "true") {
          izipayConfig.config.action = "pay" ;
        }

        if (isUserTypeGuest == "false") {
          izipayConfig.config.appearance.customize.elements = [];
          izipayConfig.config.billing.document = '76433893'; 
        }

        if ("${isPayTypeGuest}" == "YAPE_CODE") {
          izipayConfig.config.appearance.customize.elements = [];
          izipayConfig.config.billing.document = '88888888'; 
        }
        
        const checkout = new Izipay({ config: izipayConfig.config });

        function initIzipay() {
          checkout.LoadForm(izipayConfig.parameters);
        }

        function notifyPaymentCompleted() {
          window.ReactNativeWebView.postMessage("payment_completed");
        }

        function sumbitForm() {
          checkout.form.events.submit();
        }
    
      </script>
    </body>
    </html>
    `;

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Pago con Izipay</Text>
        
      
          <Button
            title="Volver al Inicio"
            onPress={resetStates} // Resetear todos los estados
            color="red" // O cualquier color que desees
          />
          <Text style={{marginTop : 0}} ></Text>

        {!isUserTypeSelected && (
        <View>
          <Button title="Pagar como Invitado" onPress={() => handleUserTypeSelection(true)} />
          <Text style={{marginBottom:1}}></Text>
          <Button title="Pagar como Usuario Registrado" onPress={() => handleUserTypeSelection(false)} />
        </View>
      )}
     
     {isUserTypeSelected && (
        <View>

          {!isPayTypeSelected && (
                  <View>
                    <Button title="Pagar con Tarjeta" onPress={() => handlePayTypeSelection('CARD')} />
                    <Text style={{marginBottom:1}}></Text>
                    <Button title="Pagar con Yape" onPress={() => handlePayTypeSelection('YAPE_CODE')} />
                  </View>
          )}

         {isPayTypeSelected && (
           <View>

        {/* Paso 1 */}
        <Text style={{marginBottom:15}}> 1️⃣ Paso 1: Crear token de Sesion </Text>
          <Text style={{marginBottom:15}}>TransactionId : {transactionId}</Text>
          <Text style={{marginBottom:15}}>OrderNumber : {orderNumber}</Text>

          {sessionToken && (
            <ScrollView style={styles.resultBox}>
              <Text style={styles.monospace}>{JSON.stringify(sessionToken, null, 2)}</Text>
            </ScrollView>
          )}
        <Button title="Generar Nuevo Token de Sesion" onPress={newSesionToken} />
        <Text style={{marginBottom:15 , marginTop:20}}> 2️⃣  Paso 2: Realizar el Pago </Text>

        {!isUserTypeGuest && isPayTypeGuest != "YAPE_CODE" && cards.length > 0 && !useSavedCards && (
          <>
              <Button title="Borrar Tarjetas" onPress={borrarTarjetas} />
              <Text style={{marginTop : 10}} ></Text>
          </>
        )}

        {/* Botones para elegir si usar tarjetas guardadas o no */}
        {!isUserTypeGuest && isPayTypeGuest != "YAPE_CODE" && cards.length > 0 && !useSavedCards && (
        <View style={styles.switchRow}>
          <Button
            title="Usar Tarjetas Guardadas"
            onPress={() => setUseSavedCards(true)} // Cambiar el estado para mostrar tarjetas guardadas
          />
        </View>
        )}

        {useSavedCards  && (
        <View>

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
        </View>
        )}
          {!useSavedCards && !selectedTokenId && (
            <View style={styles.webviewContainer}>
              <Text>
                viev sin token
              </Text>
              <WebView
                ref={webviewRef}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                mixedContentMode="always"
                source={{
                  html: html,
                  baseUrl: 'http://localhost',
                }}
                style={{ flex: 1 }}
                onMessage={onIzipayMessage}
              />
            </View>
          )}

        {isCardSelected && selectedTokenId && sessionToken && (
        <View style={styles.webviewContainerToken}>
        <Text style={{marginBottom:15 , marginTop:20}}> 2️⃣  Paso 2: Realizar el Pago </Text>

              <WebView
                ref={webviewRef}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                mixedContentMode="always"
                source={{
                  html: html,
                  baseUrl: 'http://localhost',
                }}
                style={{ flex: 1 }}
                onMessage={onIzipayMessage}
                onError={(error) => console.log("Error WebView:", error)}
              />
        </View>
        )}

          {isPayTypeGuest != "YAPE_CODE" && (
             <View>
             <Text style={{marginTop : 10}} ></Text>

             {
            !isUserTypeGuest ? (
              <>
               <Button
                    disabled={useSavedCards == false ? false : !isCardSelected }  // Desactivar si no se seleccionó tarjeta o si ya está terminado
                    color="green"
                    title={"Pagar"}
                    onPress={sumbitPayment}
                  />
                {/* {finished ? (
                  <ActivityIndicator size="small" color="blue" style={{ marginTop: 10 }} />
                ) : (
                  <Button
                    disabled={!isCardSelected || finished}  // Desactivar si no se seleccionó tarjeta o si ya está terminado
                    color="green"
                    title={"Pagar"
                    onPress={sumbitPayment}
                  />
                )} */}
              </>
            ) : (
              <Button
                color="green"
                title="Pagar"
                onPress={sumbitPayment}
              />
            )
          }
           </View>
          )}
          
              <Text style={{ marginTop: 10 , marginBottom:20 }}>Respuesta de Autorizacion:</Text>
              {respuestaAutorizacion && (
                <ScrollView style={styles.resultBox}>
                  <Text style={styles.monospace}>{JSON.stringify(respuestaAutorizacion, null, 2)}</Text>
                </ScrollView>
              )}
              <Text style={{marginTop : 10}} ></Text>
           </View>
          )}


        </View>  
          
      )}
      </ScrollView>
    );
  }

  const styles = StyleSheet.create({
    container:      { padding: 20 },
    header:         { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    switchRow:      { flexDirection: 'column', justifyContent: 'space-between', marginBottom: 20 },
    webviewContainer:{ height: 500 ,width : 320 ,overflow: 'scroll' , position : 'relative' , marginTop : 20},
    webviewContainerToken:{ height: 0 ,width :0 ,overflow: 'scroll' , position : 'relative' , marginTop : 20},
    pickerRow:      { marginBottom: 20 },
    resultBox:      { borderWidth:1, borderColor:'#ccc', padding:10 },
    resultHeader:   { fontWeight:'600', marginBottom:5 },
    monospace: { fontFamily: 'monospace' },
  });
