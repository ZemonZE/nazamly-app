import { auth, API_URL } from "@/firebase";

/**
 * Update user's photo URL in the database
 * 
 * @param photoURL - The URL of the uploaded photo
 * @returns Updated user object from database
 * @throws Error if update fails
 * 
 * @example
 * ```typescript
 * const photoURL = "https://example.com/photo.jpg";
 * const updatedUser = await updateUserPhoto(photoURL);
 * console.log("Photo updated:", updatedUser.photoURL);
 * ```
 */
export const updateUserPhoto = async (photoURL: string) => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log("[updatePhoto] Updating photo for user:", user.uid);
    console.log("[updatePhoto] New photo URL:", photoURL);

    // Get Firebase token
    const token = await user.getIdToken();

    // Call update-photo endpoint
    const response = await fetch(`${API_URL}/api/auth/update-photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        photoURL: photoURL,
      }),
    });

    console.log("[updatePhoto] Response status:", response.status);

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("[updatePhoto] Non-JSON response");
      throw new Error("Invalid response from server");
    }

    const data = await response.json();
    console.log("[updatePhoto] Response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Failed to update photo");
    }

    console.log("[updatePhoto] Photo updated successfully");
    return data.data; // Returns updated user object
  } catch (error: any) {
    console.error("[updatePhoto] Error:", error);
    throw error;
  }
};
