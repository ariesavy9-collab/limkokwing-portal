# Limkokwing University Student Services Portal

A secure React portal for registered students and authorized staff to manage university service requests. The app opens directly to Google sign-in; there is no public visitor experience. The interface uses reusable components with separate models and authentication/controller logic.

## Run locally

```bash
npm install
npm start
```

Install dependencies once at the repository root to keep a single `node_modules` directory. The root-level `npm start`, `npm run build`, and `npm test` commands forward to the React app in `src/frontend/`. Install dependencies once at the repository root to use a single `node_modules` directory. Firebase Cloud Functions and Firestore rules are under `src/backend/`; the root `firebase.json` points Firebase CLI to the correct folders. The browser Firebase client configuration remains in `src/frontend/src/models/firebase.js`, while Firebase Admin and Cloud Functions code stays in `src/backend/functions/`.

The app uses the Limkokwing Firebase project configured in `src/frontend/src/models/firebase.js`. Before using authentication and data features, set up Firebase:

1. In Firebase Console, enable **Google** under Authentication → Sign-in method. The portal accepts Google sign-in only.
2. Add the local and deployed host names to Authentication → Settings → Authorized domains.
3. The default Firestore database is already present in the configured project. Ensure the Authentication providers and authorized domains above are configured before testing sign-in.
4. The repository is linked to the `limkokwing-university` Firebase project. To publish the Firestore rules, run `firebase deploy --only firestore:rules` after reviewing the rules and confirming the target project.
5. After installing dependencies at the repository root, deploy the protected student-removal and request-notification functions using `firebase deploy --only functions`.
6. Bootstrap the first administrator by setting `GOOGLE_CLOUD_PROJECT=limkokwing-university` and running `node src/backend/functions/scripts/set-admin-access.js kabeloselomo313@gmail.com` with Google Cloud Application Default Credentials or a Firebase Admin service-account credential stored outside the repository. This writes the initial `adminUsers/{email}` record; the person can then sign in with Google. Never put a service-account key in the browser or repository, and revoke it after use. Once an administrator is set up, additional admins can be granted from the staff workspace.
7. Build and publish the web app with `npm run build` and `firebase deploy --only hosting`. The `admin.html` shortcut redirects into the existing staff workspace; it does not provide a separate login or bypass the `adminUsers` check.

Cloud Functions deployment may require the Firebase project to use the Blaze billing plan. Review current Firebase pricing and enable billing only if required for your project.

## Features

- Google-only sign-in is the application entry point. Student Google accounts must match a student record added by an administrator; admin roles are determined by the signed-in email's `adminUsers` Firestore document. All non-login routes require an authenticated account.
- Nested client-side routes using React Router (`HashRouter`) for the login screen, student service directory and requests, student portal, staff workspace, notifications, and request confirmation. Hash-based URLs continue to work with Firebase Hosting without a server rewrite for each route.
- Student requests navigate to a confirmation page showing the submission reference, service, student details, date, and description.
- Students can browse and request student-only services; visitor services and public enquiry forms are not exposed in the portal.
- Administrators register and edit students' name, student number, date/place of birth, phone, address, faculty, and course. Faculty and course are entered against current Lesotho campus records rather than an unverified preset list. A student's sign-in email remains fixed to their Google account. The directory can be searched by name, email, student number, faculty, or course; students can view their full record but cannot edit it.
- Administrators can remove a student and their portal account, profile, requests, notifications, and draft letters through a protected Cloud Function.
- In-app notifications are sent to administrators when a student submits a request and to students when their request is accepted, rejected, or otherwise updated. Unread counts update in the signed-in portal.
- Recommendation requests can be turned into editable letter drafts with an automatically placed university logo, recipient address, reference, and date. PDFs are clearly marked as drafts and reserve space for an authorized signature and stamp; they do not reproduce official seals or signatures. Sending a draft accepts the request in the same Firestore batch; students can open the dedicated Letters navigation page, read or download received letters, and delete their own copies.
- Validated student request submission with live request history and edit/delete controls for pending requests. Student profile details are read-only, shown from the Google account menu, and managed by the university; the profile displays a verification badge only when all university record fields are present. Unregistered Google accounts receive a Registry contact message. Student numbers must contain nine digits and start with `90` (for example, `901019217`).
- Student dashboard fee ledger that records service-fee snapshots against requests and shows outstanding charges. Administrators can update payment status.
- Staff-only request and enquiry management, student enrollment, admin-role grants for existing Google accounts, and service-directory updates.
- Request PDFs can be downloaded from student and staff dashboards.
- Responsive phone/desktop layouts, accessible labels and status messages, Arial typography, and reduced-motion support.

## Firestore collections

Firestore does not support creating an empty collection on its own; a collection appears when its first document is written. The portal creates documents as people use it:

- `studentDirectory` — student identity, contact, faculty, and course details; created by an administrator before student sign-in and readable by the student whose email matches the document.
- `studentLetters` — generated draft letters, readable by the addressed student and administrators only; a student may delete only letters addressed to their own account.
- `adminUsers` — administrator email records. Existing administrators can grant access to another email directly from the staff workspace; the added person can sign in with Google afterward.
- `users` — profile documents are created after an approved Google sign-in; client updates are disabled.
- `serviceRequests` — created when a signed-in student submits a service request.
- `publicInquiries` — legacy public enquiries retained for administrator review; the public enquiry form is no longer available.
- `services` — created when authorized staff add a custom service.
- `notifications` — created by Cloud Functions for request submissions and status changes; each signed-in user can read and mark only their own notifications as read.

No demo student accounts or sample personal requests are written to the database. Firestore rules bind requests and profile student numbers to the pre-approved student directory, and authorize staff operations using the signed-in email's `adminUsers` record.

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
npm test -- --watchAll=false --runInBand
npm run build
```

Before the assessment, test sign-in and Firestore operations against the configured Firebase project, deploy the latest Firestore rules and Cloud Functions if required, and ensure an authorized staff account is available for the CRUD demonstration. The browser demo needs a reachable Firebase project and configured Authentication providers; local unit tests do not prove a cloud deployment is available.
