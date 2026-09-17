/**
 * ==============================================================================
 * SHAURYA-LAKSHYA 2.0 - GOOGLE FORMS TO FIRESTORE ROSTER AUTOMATION
 * ==============================================================================
 * 
 * INSTRUCTIONS TO INSTALL IN GOOGLE SHEETS:
 * 1. Open your Lakshya 2.0 Registration Google Form.
 * 2. Click "Responses" tab -> "View in Sheets" (or open the linked Google Sheet).
 * 3. In the Google Sheet top menu, click: Extensions -> Apps Script.
 * 4. Erase any code inside Code.gs and PASTE THIS ENTIRE SCRIPT.
 * 5. Update the CONFIG block below:
 *    - PROJECT_ID & API_KEY (already filled)
 *    - ADMIN_EMAIL: Use one of your designated admin emails (e.g., nccrvce2025@gmail.com)
 *    - ADMIN_PASSWORD: Set a password for this admin email in Firebase Console -> Authentication -> Users.
 * 6. Click the Disk icon (Save), then run `testSubmission()` once to test and grant permissions.
 * 7. In the left sidebar of Apps Script, click "Triggers" (alarm clock icon) -> "Add Trigger":
 *    - Choose which function to run: `onFormSubmit`
 *    - Which runs at deployment: `Head`
 *    - Select event source: `From spreadsheet`
 *    - Select event type: `On form submit`
 *    - Failure notification settings: `Notify me immediately`
 *    - Click Save!
 * 
 * Now, every new Google Form registration is automatically authenticated and pushed 
 * to Firestore within 2 seconds!
 */

const CONFIG = {
  // Your Firebase project ID (Active Firebase project: lakshya-02)
  PROJECT_ID: "lakshya-02",
  
  // App ID namespace used in Firestore path: artifacts/{APP_ID}/public/data/registrations/{EMAIL}
  APP_ID: "lakshya-02",
  
  // Web API Key for lakshya-02
  API_KEY: "AIzaSyALWZz6wR6WI34lp6APtMnk05g9jEdIylY",

  // ============================================================================
  // ADMIN AUTHENTICATION (Fixes 403 PERMISSION_DENIED)
  // Firestore rules require requests to be authenticated by an authorized admin.
  // Setup (1 minute in Firebase Console -> lakshya-02):
  // 1. Go to Firebase Console (lakshya-02) -> Build -> Authentication -> "Sign-in method".
  // 2. Enable "Email/Password" provider.
  // 3. Go to "Users" tab -> Click "Add user".
  // 4. Enter your admin email (e.g. vaishnavkadam57@gmail.com or nccrvce2025@gmail.com) and create an ADMIN_PASSWORD.
  // 5. Enter the matching email & password below:
  // ============================================================================
  ADMIN_EMAIL: "vaishnavkadam57@gmail.com",
  ADMIN_PASSWORD: "YOUR_ADMIN_PASSWORD_HERE",
  
  // Google Form Column Mapping (1-based index matching your Sheet columns):
  // [1] Timestamp, [2] Email Address, [3] Name, [4] RVCE Email ID, [5] Date of Birth, [6] Phone Number, [7] USN, [8] Branch, [9] Year of Study
  COL_TIMESTAMP: 1,
  COL_EMAIL: 2,
  COL_NAME: 3,
  COL_RVCE_EMAIL: 4,
  COL_DOB: 5,
  COL_PHONE: 6,
  COL_USN: 7,
  COL_BRANCH: 8,
  COL_YEAR: 9
};

/**
 * Retrieves a valid Firebase Auth ID Token for the Admin account via Firebase Identity Toolkit REST API.
 * Caches the token for 50 minutes (3000s) to avoid repetitive login calls.
 */
function getFirebaseAuthToken() {
  const cache = CacheService.getScriptCache();
  const cachedToken = cache.get("firebase_admin_id_token");
  if (cachedToken) {
    return cachedToken;
  }

  if (!CONFIG.ADMIN_PASSWORD || CONFIG.ADMIN_PASSWORD === "YOUR_ADMIN_PASSWORD_HERE") {
    throw new Error(
      "ADMIN_PASSWORD is not set in CONFIG. Please set an admin password in Firebase Console -> Authentication -> Users, " +
      "then update ADMIN_PASSWORD in this script."
    );
  }

  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CONFIG.API_KEY}`;
  const payload = JSON.stringify({
    email: CONFIG.ADMIN_EMAIL,
    password: CONFIG.ADMIN_PASSWORD,
    returnSecureToken: true
  });

  const response = UrlFetchApp.fetch(authUrl, {
    method: "post",
    contentType: "application/json",
    payload: payload,
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();
  const resJson = JSON.parse(response.getContentText());

  if (responseCode !== 200) {
    const errorMsg = resJson.error ? resJson.error.message : response.getContentText();
    throw new Error(
      `Firebase Auth failed (${responseCode}): ${errorMsg}. ` +
      `Ensure Email/Password provider is enabled in Firebase Console -> Authentication -> Sign-in method, ` +
      `and user '${CONFIG.ADMIN_EMAIL}' exists under Users tab.`
    );
  }

  const idToken = resJson.idToken;
  // Cache for 50 minutes (tokens expire in 60 minutes)
  cache.put("firebase_admin_id_token", idToken, 3000);
  return idToken;
}

/**
 * Triggered automatically whenever a new Google Form response is submitted
 */
function onFormSubmit(e) {
  try {
    let rowValues = [];
    if (e && e.values) {
      rowValues = e.values;
    } else {
      // Fallback: Read the last row of the active sheet
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const lastRow = sheet.getLastRow();
      rowValues = sheet.getRange(lastRow, 1, 1, 10).getValues()[0];
    }

    const timestamp = rowValues[CONFIG.COL_TIMESTAMP - 1] || new Date().toISOString();
    const emailRaw = rowValues[CONFIG.COL_EMAIL - 1] || "";
    const nameRaw = rowValues[CONFIG.COL_NAME - 1] || "Competitor";
    const rvceEmailRaw = rowValues[CONFIG.COL_RVCE_EMAIL - 1] || "";
    const dobRaw = rowValues[CONFIG.COL_DOB - 1] || "";
    const phoneRaw = rowValues[CONFIG.COL_PHONE - 1] || "";
    const usnRaw = (rowValues[CONFIG.COL_USN - 1] || "").toString().toUpperCase().trim();
    const branchRaw = (rowValues[CONFIG.COL_BRANCH - 1] || "").toString().toUpperCase().trim();
    const yearRaw = (rowValues[CONFIG.COL_YEAR - 1] || "").toString().trim();

    const primaryEmail = emailRaw.toString().trim().toLowerCase();
    const rvceEmail = rvceEmailRaw.toString().trim().toLowerCase();

    if (!primaryEmail || primaryEmail.indexOf("@") === -1) {
      Logger.log("Skipping row with invalid primary email: " + primaryEmail);
      return;
    }

    // 1. Upload single registration record with both personal and RVCE email fields
    uploadToFirestore(primaryEmail, {
      name: nameRaw.toString().trim(),
      email: primaryEmail,
      rvceEmail: rvceEmail || primaryEmail,
      usn: usnRaw,
      branch: branchRaw,
      yearOfStudy: yearRaw,
      phone: phoneRaw.toString(),
      dob: dobRaw.toString(),
      college: "RVCE",
      source: "google_form_automated",
      eligible: true
    });

    Logger.log("Successfully synced participant: " + primaryEmail);
  } catch (error) {
    Logger.log("Error during onFormSubmit: " + error.toString());
  }
}

/**
 * Uploads or merges a single registration document into Firestore via REST API with Admin Bearer authentication
 */
function uploadToFirestore(docId, data) {
  const cleanId = docId.toLowerCase().trim();
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/artifacts/${CONFIG.APP_ID}/public/data/registrations/${encodeURIComponent(cleanId)}`;

  const nowIso = new Date().toISOString();

  // Construct Firestore typed fields payload
  const fields = {
    id: { stringValue: cleanId },
    name: { stringValue: data.name },
    email: { stringValue: data.email },
    rvceEmail: { stringValue: data.rvceEmail || data.email },
    usn: { stringValue: data.usn || "" },
    branch: { stringValue: data.branch || "" },
    yearOfStudy: { stringValue: data.yearOfStudy || "" },
    phone: { stringValue: data.phone || "" },
    dob: { stringValue: data.dob || "" },
    college: { stringValue: data.college || "RVCE" },
    source: { stringValue: data.source },
    eligible: { booleanValue: data.eligible },
    registeredAt: { timestampValue: nowIso },
    updatedAt: { timestampValue: nowIso }
  };

  const payload = JSON.stringify({ fields: fields });

  // Get Admin Bearer token to authorize write against firestore.rules
  const idToken = getFirebaseAuthToken();

  const options = {
    method: "patch",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + idToken
    },
    payload: payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code !== 200) {
    Logger.log(`Firestore API Error (${code}) for ${cleanId}: ${response.getContentText()}`);
    throw new Error(`Firestore API Error (${code}): ${response.getContentText()}`);
  } else {
    Logger.log(`[Firestore Success] Saved registration for: ${cleanId}`);
  }
}

/**
 * Test function you can run manually in Apps Script editor to verify setup
 */
function testSubmission() {
  onFormSubmit({
    values: [
      new Date().toLocaleString(),
      "test.cadet@gmail.com",
      "Test Cadet",
      "test.cs24@rvce.edu.in",
      "01/01/2004",
      "9999999999",
      "1RV22CS999",
      "CSE",
      "2nd Year"
    ]
  });
}
