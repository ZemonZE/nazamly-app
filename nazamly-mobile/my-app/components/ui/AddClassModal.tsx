import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface AddClassModalProps {
  visible: boolean;
  onClose: () => void;
  onAddClass?: (newClass: { title: string; code: string; day: string; time: string; location: string }) => void;
}

const AddClassModal = ({ visible, onClose, onAddClass }: AddClassModalProps) => {
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [selectedDay, setSelectedDay] = useState("Sat");
  const [showDays, setShowDays] = useState(false);

  const daysOptions = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];

  const handleSubmit = () => {
    if (onAddClass && courseName && startTime && endTime) {
      onAddClass({
        title: courseName,
        code: courseCode,
        day: selectedDay,
        time: `${startTime}–${endTime}`,
        location: location || "TBD"
      });
    }
    setCourseName("");
    setCourseCode("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setSelectedDay("Sat");
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add New Class</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Course Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Data Structures"
              placeholderTextColor="#94a3b8"
              value={courseName}
              onChangeText={setCourseName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Course Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CS201"
              placeholderTextColor="#94a3b8"
              value={courseCode}
              onChangeText={setCourseCode}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Day *</Text>
            <TouchableOpacity 
              style={styles.dropdown}
              onPress={() => setShowDays(!showDays)}
            >
              <Text style={styles.dropdownText}>{selectedDay}</Text>
              <Feather name={showDays ? "chevron-up" : "chevron-down"} size={20} color="#20E68A" />
            </TouchableOpacity>
            {showDays && (
              <View style={styles.dropdownList}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                  {daysOptions.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedDay(day);
                        setShowDays(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Start Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="08 : 00 AM"
                placeholderTextColor="#94a3b8"
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>End Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="09 : 30 AM"
                placeholderTextColor="#94a3b8"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Room / Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. B204"
              placeholderTextColor="#94a3b8"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Feather name="plus" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Add to Timetable</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  closeButton: { position: "absolute", right: 0 },

  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: "600", color: "#1e293b", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: { fontSize: 15, color: "#0f172a" },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    marginTop: 5,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#0f172a",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },

  submitButton: {
    backgroundColor: "#93c5fd", // Light purple/blue as in the design
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});

export default AddClassModal;
