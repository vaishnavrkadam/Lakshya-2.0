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
 * 5. Update the CONFIG block below with your FIREBASE_PROJECT_ID and FIREBASE_API_KEY.
 * 6. Click the Disk icon (Save), then run `testSubmission()` once to grant permissions.
 * 7. In the left sidebar of Apps Script, click "Triggers" (alarm clock icon) -> "Add Trigger":
 *    - Choose which function to run: `onFormSubmit`
 *    - Which runs at deployment: `Head`
 *    - Select event source: `From spreadsheet`
 *    - Select event type: `On form submit`
 *    - Failure notification settings: `Notify me immediately`
 *    - Click Save!
 * 
 * Now, every new registration is automatically pushed to Firestore within 2 seconds!
 */

const CONFIG = {
  // Your Firebase project ID (e.g., "shaurya-lakshya-event")
  PROJECT_ID: "shaurya-lakshya-event",
  
  // App ID namespace used in Firestore path: artifacts/{APP_ID}/public/data/registrations/{EMAIL}
  APP_ID: "shaurya-lakshya-event",
  
  // Web API Key from Firebase Console -> Project Settings
  API_KEY: "AIzaSyD8eRxPpVUOiU6pV0u3_I6pCFfOaw5UeaA",
  
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

    // 1. Upload primary registration record
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

    // 2. If student provided a distinct RVCE email, upload alias record so they can sign in with either!
    if (rvceEmail && rvceEmail !== primaryEmail && rvceEmail.indexOf("@") !== -1) {
      uploadToFirestore(rvceEmail, {
        name: nameRaw.toString().trim(),
        email: rvceEmail,
        rvceEmail: rvceEmail,
        usn: usnRaw,
        branch: branchRaw,
        yearOfStudy: yearRaw,
        phone: phoneRaw.toString(),
        dob: dobRaw.toString(),
        college: "RVCE",
        source: "google_form_alias",
        eligible: true
      });
    }

    Logger.log("Successfully synced participant: " + primaryEmail);
  } catch (error) {
    Logger.log("Error during onFormSubmit: " + error.toString());
  }
}

/**
 * Uploads or merges a single registration document into Firestore via REST API
 */
function uploadToFirestore(docId, data) {
  const cleanId = docId.toLowerCase().trim();
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/artifacts/${CONFIG.APP_ID}/public/data/registrations/${encodeURIComponent(cleanId)}?key=${CONFIG.API_KEY}`;

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

  const options = {
    method: "patch",
    contentType: "application/json",
    payload: payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code !== 200) {
    Logger.log(`Firestore API Error (${code}) for ${cleanId}: ${response.getContentText()}`);
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
