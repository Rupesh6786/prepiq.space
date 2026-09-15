import { createServerFn } from "@tanstack/react-start";

/**
 * The Firebase web config is publishable, but the API key is stored as a
 * project secret, so it is served to the browser through this endpoint.
 */
export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    apiKey: "AIzaSyAdt6IHNavAw7KSNP3tbV9JgpElHcTA_8M",
    authDomain: "studio-7151265920-7892d.firebaseapp.com",
    projectId: "studio-7151265920-7892d",
    storageBucket: "studio-7151265920-7892d.firebasestorage.app",
    messagingSenderId: "212136912204",
    appId: "1:212136912204:web:7e81189d35eba9925a9be9",
  };
});
