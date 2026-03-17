# Student Card Photo Feature - Complete Implementation

## Overview
Added a new feature to allow users to upload and display their student card photo on the HomePage.

## Backend Changes

### 1. Updated User Schema

**File**: `nazamly-backend/src/models/user/user.model.js`

**Added Field**:
```javascript
studentCardPhotoURL: String
```

**Complete Schema**:
```javascript
{
  firebaseUid: String,
  email: String,
  displayName: String,
  photoURL: String,              // Profile photo
  studentCardPhotoURL: String,   // ✅ NEW: Student card photo
  accessStatus: String,
  role: String,
  currentCGPA: Number,
  earnedCreditHours: Number,
  pastSemesters: Array
}
```

### 2. Updated User_Repo

**File**: `nazamly-backend/src/Repos/User_Repo.js`

**Added to Allowed Fields**:
```javascript
const ALLOWED_UPDATE_FIELDS = [
  "displayName",
  "photoURL",
  "studentCardPhotoURL",  // ✅ NEW
  "accessStatus",
  "role",
  "currentCGPA",
  "earnedCreditHours",
  "pastSemesters",
];
```

### 3. Created New Controller

**File**: `nazamly-backend/src/controllers/user.controller.js`

**New Function**: `updateStudentCard`

```javascript
const updateStudentCard = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const { studentCardPhotoURL } = req.body;

    // Validation
    if (!studentCardPhotoURL) {
      return res.status(400).json({
        success: false,
        message: "studentCardPhotoURL is required",
      });
    }

    // Find user
    const user = await userRepo.findByFirebaseUid(firebaseUid);

    // Update studentCardPhotoURL
    const updatedUser = await userRepo.update(user._id, {
      studentCardPhotoURL: studentCardPhotoURL,
    });

    return res.status(200).json({
      success: true,
      message: "Student card photo updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating student card photo",
      error: error.message,
    });
  }
};
```

### 4. Created New Route

**File**: `nazamly-backend/src/routes/auth.routes.js`

**New Route**:
```javascript
router.post("/update-student-card", requireAuth, updateStudentCard);
```

**Complete Routes**:
```javascript
router.post("/sync", requireAuth, syncUser);
router.post("/setup-profile", requireAuth, setupProfile);
router.get("/get-profile", requireAuth, getProfile);
router.post("/update-photo", requireAuth, updatePhoto);
router.post("/update-student-card", requireAuth, updateStudentCard); // ✅ NEW
```

## Mobile App Changes

### 1. Created Helper Function

**File**: `nazamly-mobile/my-app/utils/updateStudentCard.ts`

```typescript
export const updateStudentCardPhoto = async (studentCardPhotoURL: string) => {
  const user = auth.currentUser;
  const token = await user.getIdToken();

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

  const data = await response.json();
  return data.data;
};
```

### 2. Updated HomePage

**File**: `nazamly-mobile/my-app/app/(tabs)/HomePage.tsx`

**Added Imports**:
```typescript
import * as ImagePicker from 'expo-image-picker';
import { storage } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateStudentCardPhoto } from '@/utils/updateStudentCard';
```

**Added State**:
```typescript
const [isUploadingCard, setIsUploadingCard] = useState(false);
const [localCardUri, setLocalCardUri] = useState<string | null>(null);
```

**Added Handler**:
```typescript
const handleStudentCardUpload = async () => {
  // 1. Request permission
  // 2. Launch image picker (16:10 aspect ratio)
  // 3. Show image immediately (optimistic UI)
  // 4. Upload to Firebase Storage
  // 5. Update database
  // 6. Update local state
  // 7. Show success message
};
```

**Updated UI**:
```typescript
{/* Student Card Section */}
<View style={styles.studentCardContainer}>
  {(localCardUri || backendUser?.studentCardPhotoURL) ? (
    // Show card photo with update button
    <View style={styles.studentCardWithPhoto}>
      <Image source={{ uri: localCardUri || backendUser.studentCardPhotoURL }} />
      <TouchableOpacity onPress={handleStudentCardUpload}>
        <Feather name="upload" />
        <Text>Update</Text>
      </TouchableOpacity>
    </View>
  ) : (
    // Show upload prompt
    <TouchableOpacity onPress={handleStudentCardUpload}>
      <Ionicons name="card-outline" />
      <Text>Tap to upload your card</Text>
    </TouchableOpacity>
  )}
</View>
```

## Features

### 1. Upload Student Card
- Tap on "Student Card" section
- Select image from library
- Image shows immediately (optimistic UI)
- Uploads to Firebase Storage
- Updates database
- Shows success message

### 2. Display Student Card
- Shows uploaded card photo
- Full-width display (16:10 aspect ratio)
- Rounded corners
- Professional look

### 3. Update Button
- Appears next to card photo
- Allows re-uploading card
- Shows loading spinner during upload
- Disabled during upload

## User Flow

### First Time (No Card)
```
┌─────────────────────────────────┐
│  📊 Stats Cards                 │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  💳 Student Card          │  │
│  │  Tap to upload your card  │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  📅 Today's Schedule            │
└─────────────────────────────────┘
```

### After Upload
```
┌─────────────────────────────────┐
│  📊 Stats Cards                 │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  [Student Card Image]     │  │
│  │                           │  │
│  │  [🔄 Update Button]       │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  📅 Today's Schedule            │
└─────────────────────────────────┘
```

## Upload Flow

```
User taps Student Card section
        ↓
Request photo library permission
        ↓
Open image picker (16:10 aspect)
        ↓
User selects card photo
        ↓
Image shows IMMEDIATELY ✨
        ↓ (background)
Upload to Firebase Storage
  → student_cards/{uid}_{timestamp}.jpg
        ↓
Get download URL
        ↓
POST /api/auth/update-student-card
  Body: { studentCardPhotoURL: "https://..." }
        ↓
Backend updates MongoDB
  User.studentCardPhotoURL = downloadURL
        ↓
Update local state
        ↓
Success message shown
        ↓
Card persists in database
```

## API Endpoint

### POST /api/auth/update-student-card

**Headers**:
```
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Body**:
```json
{
  "studentCardPhotoURL": "https://firebase.storage.googleapis.com/..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Student card photo updated successfully",
  "data": {
    "_id": "...",
    "firebaseUid": "...",
    "email": "...",
    "displayName": "...",
    "photoURL": "...",
    "studentCardPhotoURL": "https://firebase.storage.googleapis.com/...",
    "currentCGPA": 3.5,
    "earnedCreditHours": 60
  }
}
```

## Testing

### 1. Start Backend
```bash
cd nazamly-backend
npm start
```

### 2. Test Endpoint
```bash
curl -X POST http://localhost:5000/api/auth/update-student-card \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentCardPhotoURL": "https://example.com/card.jpg"
  }'
```

### 3. Test Mobile App
1. Open app and navigate to HomePage
2. Tap "Student Card" section
3. Select a photo of your student card
4. Card shows immediately
5. Wait for upload to complete
6. See success message
7. Close and reopen app
8. Card should still be visible

### 4. Test Update Button
1. After card is uploaded
2. Tap "Update" button
3. Select new photo
4. Card updates immediately
5. Success message shown

## Files Modified

### Backend
- ✅ `src/models/user/user.model.js` - Added studentCardPhotoURL field
- ✅ `src/Repos/User_Repo.js` - Added to allowed update fields
- ✅ `src/controllers/user.controller.js` - Added updateStudentCard function
- ✅ `src/routes/auth.routes.js` - Added update-student-card route

### Mobile App
- ✅ `utils/updateStudentCard.ts` - Created helper function
- ✅ `app/(tabs)/HomePage.tsx` - Added student card UI and upload logic

## Features Summary

✅ **Separate Field**: studentCardPhotoURL separate from profile photoURL
✅ **Dedicated Endpoint**: POST /api/auth/update-student-card
✅ **Upload UI**: Tap to upload on HomePage
✅ **Display UI**: Shows card photo when uploaded
✅ **Update Button**: Re-upload card anytime
✅ **Optimistic UI**: Card shows immediately
✅ **Persistence**: Saved in MongoDB
✅ **Loading States**: Spinner during upload
✅ **Error Handling**: Alerts on failure
✅ **Success Feedback**: Toast/Alert on success

## Aspect Ratio

Student card uses **16:10 aspect ratio** (wider than profile photo):
- Profile photo: 1:1 (square)
- Student card: 16:10 (landscape, like actual ID cards)

## Storage Organization

Firebase Storage structure:
```
/profile_photos/
  ├── {uid}_1234567890.jpg  (Profile photos)
  └── {uid}_1234567891.jpg

/student_cards/
  ├── {uid}_1234567892.jpg  (Student card photos)
  └── {uid}_1234567893.jpg
```

## Summary

✅ **Schema Updated**: Added studentCardPhotoURL field
✅ **Controller Created**: updateStudentCard function
✅ **Route Created**: POST /api/auth/update-student-card
✅ **Helper Created**: updateStudentCardPhoto() utility
✅ **UI Updated**: HomePage shows card with upload/update button
✅ **Optimistic UI**: Card appears instantly
✅ **Persistence**: Saved to MongoDB
✅ **Separation**: Profile photo and student card are separate

Users can now upload their student card on the HomePage, and it will persist in the database!
