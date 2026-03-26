// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  envName: 'dev',
  appVersion: '1.0.0',
  apiUrl: 'http://localhost:5001/invoicer-dev/us-central1/api/invoices',
  clientsUrl: 'http://localhost:5001/invoicer-dev/us-central1/api/clients',
  profileUrl: 'http://localhost:5001/invoicer-dev/us-central1/api/profile',
  firebase: {
    apiKey: 'AIzaSyAPUmEvZSFmA75S44GbYmUFRNa1J56z-l4',
    authDomain: 'invoicer-6a7c2.firebaseapp.com',
    projectId: 'invoicer-6a7c2',
    storageBucket: 'invoicer-6a7c2.firebasestorage.app',
    messagingSenderId: '1095547966279',
    appId: '1:1095547966279:web:9aa6a0cf2a7e3265287262',
    measurementId: 'G-XW5PXRJ4DR'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
