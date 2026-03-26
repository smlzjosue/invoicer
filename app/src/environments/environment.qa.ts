export const environment = {
  production: false,
  envName: 'qa',
  appVersion: '1.0.0',
  apiUrl: 'https://us-central1-invoicer-qa.cloudfunctions.net/api/invoices',
  clientsUrl: 'https://us-central1-invoicer-qa.cloudfunctions.net/api/clients',
  profileUrl: 'https://us-central1-invoicer-qa.cloudfunctions.net/api/profile',
  firebase: {
    apiKey: 'REPLACE_WITH_QA_API_KEY',
    authDomain: 'invoicer-qa.firebaseapp.com',
    projectId: 'invoicer-qa',
    storageBucket: 'invoicer-qa.firebasestorage.app',
    messagingSenderId: 'REPLACE_WITH_QA_SENDER_ID',
    appId: 'REPLACE_WITH_QA_APP_ID'
  }
};
