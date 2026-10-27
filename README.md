# Limkokwing University Student Services Portal

A React portal for browsing university services, sending public enquiries, and giving registered students a secure place to manage service requests. The interface is based on the supplied student-service portal design and uses reusable components with separate models and authentication/controller logic.

## Run locally

```bash
npm install
npm start
```

Install dependencies once at the repository root to keep a single `node_modules` directory. The root-level `npm start`, `npm run build`, and `npm test` commands forward to the React app in `src/frontend/`. Install dependencies once at the repository root to use a single `node_modules` directory. Firebase Cloud Functions and Firestore rules are under `src/backend/`; the root `firebase.json` points Firebase CLI to the correct folders. The browser Firebase client configuration remains in `src/frontend/src/models/firebase.js`, while Firebase Admin and Cloud Functions code stays in `src/backend/functions/`.

The app uses the Limkokwing Firebase project configured in `src/frontend/src/models/firebase.js`. Before using authentication and data features, set up Firebase:

1. In Firebase Console, enable **Email/Password**, **Google**, and **Phone** under Authentication → Sign-in method.
2. Add the local and deployed host names to Authentication → Settings → Authorized domains. Phone sign-in also requires Firebase's reCAPTCHA verification.
3. The default Firestore database is already present in the configured project. Ensure the Authentication providers and authorized domains above are configured before testing sign-in.
4. The repository is linked to the `limkokwing-university` Firebase project. To publish the Firestore rules, run `firebase deploy --only firestore:rules` after reviewing the rules and confirming the target project.
5. After installing dependencies at the repository root, deploy the protected staff-provisioning function using `firebase deploy --only functions`.
6. To bootstrap the first staff administrator, first create their account in Firebase Authentication, then run `gcloud auth application-default login` on a trusted administrator machine and run `node src/backend/functions/scripts/set-admin-claim.js <existing-user-email>`. Ask the administrator to sign out and sign in again so the new claim is included in their token. Never put Firebase Admin credentials in the browser or repository.
7. Build and publish the web app with `npm run build` and `firebase deploy --only hosting`. The `admin.html` shortcut redirects into the existing staff workspace; it does not provide a separate login or bypass the custom-claim check.

Cloud Functions deployment may require the Firebase project to use the Blaze billing plan. Review current Firebase pricing and enable billing only if required for your project.

## Features

- Public service directory, service details, contact information, and visitor enquiries. Visitors only see public services; authenticated users can see student services.
- Nested client-side routes using React Router (`HashRouter`) for the home page, service directory, parameterized service details and request forms, student portal, staff workspace, contact page, submission confirmation, and 404 page. Hash-based URLs continue to work with Firebase Hosting without a server rewrite for each route.
- Successful requests and enquiries navigate to a confirmation page showing the submission reference, service, submitter details, date, and description, with direct navigation back to services or home.
- Public course catalogue and fee information for prospective students. The Fees page shows published service fees and directs visitors to the university for tuition amounts until an official course fee schedule is available.
- Student accounts using email/password, Google sign-in, or phone verification; email password-reset flow.
- Validated student request submission with a Firestore reference, live request history, profile completion, and cancellation of pending requests. Student numbers use the nine-digit format (for example, `901019217`); names are limited to 20 characters and invalid fields show red inline validation feedback.
- Staff-only live management of student requests and public enquiries, including acceptance, status updates, and deletion; staff can also add services and provision staff accounts.
- Responsive layouts, accessible labels and status messages, field validation, and reduced-motion support.

## Firestore collections

Firestore does not support creating an empty collection on its own; a collection appears when its first document is written. The portal creates documents as people use it:

- `users` — profile documents are written during registration and first sign-in, or when a student saves their profile.
- `serviceRequests` — created when a signed-in student submits a service request.
- `publicInquiries` — created when a visitor submits a public enquiry.
- `services` — created when authorized staff add a custom service.

The contact page also submits general enquiries to `publicInquiries`; successful submissions display their Firestore document reference.

No demo student accounts or sample personal requests are written to the database. Firestore collections appear when their first document is written. Firebase security rules restrict student records to their owners, services to staff-managed writes, and staff operations to accounts with a trusted Firebase `admin` custom claim.

Student numbers entered during account creation are stored as profile information; the app does not check them against the university registrar. Connect registration to an approved student roster or a staff verification process before using it as proof of enrolment in production.

## Assignment requirements and demonstration

| Requirement | Where to demonstrate it |
| --- | --- |
| Home, at least six services, dynamic service details | `/`, `/services`, and `/services/tech-support` (the service detail route uses the `:serviceId` parameter) |
| Request form, validation, save, and confirmation | Open a service, submit its form with valid details, and verify the Firestore reference and submitted details on `/submitted` |
| At least four client-side routes, links, nested and dynamic routing, no refresh navigation | Use the sidebar links and service cards; routes are nested under the shared portal layout and use React Router |
| Programmatic navigation | Successful submission navigates to its confirmation page; student-only routes request sign-in and return to the intended page after authentication |
| Not-found route and home navigation | Open an unknown hash route, such as `/#/not-a-page`, then use **Return to home** |
| Firestore create/read/update/delete | Submit a student request, view it in the student dashboard, change its status in the authorized staff workspace, and delete it there |
| Validation and errors | Try blank fields, a name with digits, invalid email/phone/student number, and too-short or too-long values; invalid characters are filtered and invalid submissions are blocked |
| Reusable components and React hooks | Service cards, page headings, status badges, and field validation feedback are reused with props; stateful pages use `useState`, `useEffect`, and event handlers |

Run the targeted portal checks and a production build from the project root:

```bash
npm --prefix frontend test -- --watchAll=false --runInBand src/App.test.js
npm run build
```

Before the assessment, test sign-in and Firestore operations against the configured Firebase project, deploy the latest Firestore rules and Cloud Functions if required, and ensure an authorized staff account is available for the CRUD demonstration. The browser demo needs a reachable Firebase project and configured Authentication providers; local unit tests do not prove a cloud deployment is available.
