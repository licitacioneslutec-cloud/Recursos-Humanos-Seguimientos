/* Configuración del proyecto.
   1. Firebase: consola › engranaje › Configuración del proyecto › Tus aplicaciones › Config.
   2. Google Drive: Google Cloud Console › APIs y servicios › Credenciales › ID de cliente OAuth (aplicación web).
   Mientras apiKey diga PEGAR_AQUI la app arranca en MODO DEMO: guarda todo en este navegador y no pide clave real. */

export const firebaseConfig = {
  apiKey: "PEGAR_AQUI",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const GOOGLE_CLIENT_ID = "PEGAR_AQUI";

export const DEMO = firebaseConfig.apiKey.startsWith('PEGAR');
