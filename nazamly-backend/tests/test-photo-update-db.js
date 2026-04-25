/**
 * Test Script: Verify Photo URL Update in Database
 * 
 * This script tests that the update-photo endpoint actually updates the database
 * and that the photo persists when fetching the profile again.
 * 
 * Usage:
 * 1. Make sure backend server is running
 * 2. Update the FIREBASE_TOKEN with a valid token
 * 3. Run: node test-photo-update-db.js
 */

const API_URL = "http://localhost:5000";

// Replace with a valid Firebase token
const FIREBASE_TOKEN = "YOUR_FIREBASE_TOKEN_HERE";

async function testPhotoUpdate() {
  console.log("=".repeat(60));
  console.log("Testing Photo URL Update in Database");
  console.log("=".repeat(60));

  try {
    // Step 1: Get current profile
    console.log("\n[Step 1] Fetching current profile...");
    const profileRes = await fetch(`${API_URL}/api/auth/get-profile`, {
      headers: {
        Authorization: `Bearer ${FIREBASE_TOKEN}`,
      },
    });

    if (!profileRes.ok) {
      throw new Error(`Failed to fetch profile: ${profileRes.status}`);
    }

    const profileData = await profileRes.json();
    console.log("✅ Current profile fetched");
    console.log("   Current photoURL:", profileData.data?.photoURL || "None");

    // Step 2: Update photo URL
    const testPhotoURL = `https://example.com/test-photo-${Date.now()}.jpg`;
    console.log("\n[Step 2] Updating photo URL...");
    console.log("   New photoURL:", testPhotoURL);

    const updateRes = await fetch(`${API_URL}/api/auth/update-photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIREBASE_TOKEN}`,
      },
      body: JSON.stringify({
        photoURL: testPhotoURL,
      }),
    });

    if (!updateRes.ok) {
      const errorData = await updateRes.json();
      throw new Error(`Failed to update photo: ${JSON.stringify(errorData)}`);
    }

    const updateData = await updateRes.json();
    console.log("✅ Photo update response received");
    console.log("   Response photoURL:", updateData.data?.photoURL);

    // Step 3: Verify update by fetching profile again
    console.log("\n[Step 3] Fetching profile again to verify...");
    const verifyRes = await fetch(`${API_URL}/api/auth/get-profile`, {
      headers: {
        Authorization: `Bearer ${FIREBASE_TOKEN}`,
      },
    });

    if (!verifyRes.ok) {
      throw new Error(`Failed to verify profile: ${verifyRes.status}`);
    }

    const verifyData = await verifyRes.json();
    console.log("✅ Profile fetched for verification");
    console.log("   PhotoURL in DB:", verifyData.data?.photoURL);

    // Step 4: Compare
    console.log("\n[Step 4] Verification Results:");
    console.log("=".repeat(60));

    if (verifyData.data?.photoURL === testPhotoURL) {
      console.log("✅ SUCCESS! Photo URL was updated in database");
      console.log("   Expected:", testPhotoURL);
      console.log("   Got:     ", verifyData.data.photoURL);
    } else {
      console.log("❌ FAILED! Photo URL was NOT updated in database");
      console.log("   Expected:", testPhotoURL);
      console.log("   Got:     ", verifyData.data?.photoURL || "None");
    }

    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error.message);
    console.log("\nMake sure:");
    console.log("1. Backend server is running (npm start)");
    console.log("2. FIREBASE_TOKEN is valid and not expired");
    console.log("3. User exists in database");
  }
}

// Run the test
testPhotoUpdate();
