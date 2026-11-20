# Limkokwing University Student Services Portal

A React portal for browsing university services, sending public enquiries, and giving registered students a secure place to manage service requests. The interface is based on the supplied student-service portal design and uses reusable components with separate models and authentication/controller logic.

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
5. After installing dependencies at the repository root, deploy the protected admin-access and request-notification functions using `firebase deploy --only functions`.
6. To bootstrap the first administrator without Google Cloud CLI, have them attempt Google sign-in once. On a trusted administrator machine, set `GOOGLE_APPLICATION_CREDENTIALS` to a Firebase Admin service-account JSON key stored outside the repository, set `GOOGLE_CLOUD_PROJECT=limkokwing-university`, then run `node src/backend/functions/scripts/set-admin-claim.js kabeloselomo313@gmail.com`. The script requires the Google account to exist in Firebase Authentication. Ask the administrator to sign out and sign in again so the new role is included in their token. Never put the key in the browser or repository; revoke it after use.
7. Build and publish the web app with `npm run build` and `firebase deploy --only hosting`. The `admin.html` shortcut redirects into the existing staff workspace; it does not provide a separate login or bypass the custom-claim check.

Cloud Functions deployment may require the Firebase project to use the Blaze billing plan. Review current Firebase pricing and enable billing only if required for your project.

## Features

- Public service directory, service details, contact information, and visitor enquiries. Visitors only see public services; authenticated users can see student services.
- Nested client-side routes using React Router (`HashRouter`) for the home page, service directory, parameterized service details and request forms, student portal, staff workspace, contact page, submission confirmation, and 404 page. Hash-based URLs continue to work with Firebase Hosting without a server rewrite for each route.
- Successful requests and enquiries navigate to a confirmation page showing the submission reference, service, submitter details, date, and description, with direct navigation back to services or home.
- Public course catalogue and fee information for prospective students. The Fees page shows published service fees and directs visitors to the university for tuition amounts until an official course fee schedule is available.
- Google-only sign-in. Student Google accounts must match a student record added by an administrator; admin roles require both a Firestore role document and a Firebase custom claim.
- Administrators register and edit students' name, student number, date/place of birth, phone, address, faculty, and course. Faculty and course are entered against current Lesotho campus records rather than an unverified preset list. A student's sign-in email remains fixed to their Google account. The directory can be searched by name, email, student number, faculty, or course; students can view their full record but cannot edit it.
- Administrators can remove a student and their portal account, profile, requests, notifications, and draft letters through a protected Cloud Function.
- In-app notifications are sent to administrators when a student submits a request and to students when their request is accepted, rejected, or otherwise updated. Unread counts update in the signed-in portal.
- Recommendation requests can be turned into auto-filled, editable draft letters. Sending the letter accepts the request in the same Firestore batch; students can download the letter PDF, visibly marked as a non-official sample.
- Validated student request submission with live request history and edit/delete controls for pending requests. Student profile details are read-only and managed by the university. Student numbers must contain nine digits and start with `90` (for example, `901019217`).
- Student dashboard fee ledger that records service-fee snapshots against requests and shows outstanding charges. Administrators can update payment status.
- Staff-only request and enquiry management, student enrollment, admin-role grants for existing Google accounts, and service-directory updates.
- Request PDFs can be downloaded from student and staff dashboards.
- Responsive phone/desktop layouts, accessible labels and status messages, Arial typography, and reduced-motion support.

## Firestore collections

Firestore does not support creating an empty collection on its own; a collection appears when its first document is written. The portal creates documents as people use it:

- `studentDirectory` — student identity, contact, faculty, and course details; created by an administrator before student sign-in and readable by the student whose email matches the document.
- `studentLetters` — generated draft letters, readable by the addressed student and administrators only.
- `adminUsers` — admin-role email records, paired with Firebase custom claims.
- `users` — profile documents are created after an approved Google sign-in; client updates are disabled.
- `serviceRequests` — created when a signed-in student submits a service request.
- `publicInquiries` — created when a visitor submits a public enquiry.
- `services` — created when authorized staff add a custom service.
- `notifications` — created by Cloud Functions for request submissions and status changes; each signed-in user can read and mark only their own notifications as read.

The contact page also submits general enquiries to `publicInquiries`; successful submissions display their Firestore document reference.

No demo student accounts or sample personal requests are written to the database. Firestore rules bind requests and profile student numbers to the pre-approved student directory, and require both a Firestore admin record and trusted Firebase `admin` claim for staff operations.

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
