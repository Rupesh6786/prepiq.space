# CET Success Hub

build an website for an MAH MCA CET preparation , and on that add an login page and awesome genz and minimal white royal premium color palette and core function should be as we have an when user open website it need to login as user or admin separate page for login and registration also include other login method such as google based using the firebase // Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "@secret:GOOGLE_API_KEY ",
  authDomain: "studio-7151265920-7892d.firebaseapp.com",
  projectId: "studio-7151265920-7892d",
  storageBucket: "studio-7151265920-7892d.firebasestorage.app",
  messagingSenderId: "212136912204",
  appId: "1:212136912204:web:7e81189d35eba9925a9be9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig); used this key for authentication for login used UID to differentiate user or admin cause we only need one login or registration for admin registration we define the UID on firebase rules section , check it the UId match then o0pen admin dashboard , on user side include pages and cool hero section top header or nav bar I want entire website responsive for mobo or other screen width , this platform well admin upload an pdf of question well that pdf will analyst by the gemini api key @secret:GOOGLE_API_KEY  to anaylyst store entire question on the firestore db and question wise user can option to start the mock test using the filter to select qustion based on the topic or an main mock test that include all topics i have shared an excel that cintain all topics subtopuc using drop downlist based filter before startting the question also after submit the qustion or before we have time based test or no of question based test , for demo purpose used the above all topics and subtopics and create an question nased mcc based on json file containing the 20 question for each subtopics mention on the above excel i want to fuhnctional webiste the an animated login and registration page shojud have an admin dashboard with left sidebar for navigation and pages such as edit or upload new question or upload new pdf other usefull state and graph and charts for most solved question and each user create new row on firestore to keep track or question thery have solved after submit the test show avg , midden and max time consume on each question and incluyde all graph chart to show all stats of that exam

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ace-my-mca.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc9f2501-eae9-4f31-aa9c-e82f11623e20).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
