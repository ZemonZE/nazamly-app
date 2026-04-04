import { auth, API_URL } from "@/firebase";

/**
 * Update user's student card photo URL in the database
 * 
 * @param studentCardPhotoURL - The URL of the uploaded student card photo
 * @returns Updated user object from database
 * @throws Error if update fails
 * 
 * @example
 * ```typescript
 * const studentCardPhotoURL = "https://example.com/student-card.jpg";
 * const updatedUser = await updateStudentCardPhoto(studentCardPhotoURL);
 * console.log("Student card updated:", updatedUser.studentCardPhotoURL);
 * ```
 */
export const updateStudentCardPhoto = async (studentCardPhotoURL: string) => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log("[updateStudentCard] Updating student card for user:", user.uid);
    console.log("[updateStudentCard] New student card URL:", studentCardPhotoURL);

    // Get Firebase token
    const token = await user.getIdToken();

    // Call update-student-card endpoint
    const response = await fetch(`${API_URL}/api/auth/update-student-card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentCardPhotoURL: studentCardPhotoURL,
      }),
    });

    console.log("[updateStudentCard] Response status:", response.status);

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("[updateStudentCard] Non-JSON response");
      throw new Error("Invalid response from server");
    }

    const data = await response.json();
    console.log("[updateStudentCard] Response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Failed to update student card");
    }

    console.log("[updateStudentCard] Student card updated successfully");
    return data.data; // Returns updated user object
  } catch (error: any) {
    console.error("[updateStudentCard] Error:", error);
    throw error;
  }
};
